// src/main/java/com/smartcampus/operations/service/impl/BookingServiceImpl.java
package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.InvalidBookingException;
import com.smartcampus.operations.exception.ResourceNotFoundException;
import com.smartcampus.operations.repository.BookingRepository;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.BookingService;
import com.smartcampus.operations.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BookingServiceImpl implements BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final LocalTime START_TIME = LocalTime.of(8, 0);
    private static final LocalTime END_TIME = LocalTime.of(17, 0);
    private static final int SLOT_DURATION_HOURS = 1;

    @Override
    @Transactional
    public BookingResponse createBooking(BookingCreateRequest request, String userEmail) {
        // Validate user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate resource
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // Check if resource is active
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new InvalidBookingException("Resource is currently unavailable for booking");
        }

        // Validate booking time
        validateBookingTime(request.getStartTime(), request.getEndTime());

        // Validate booking date and time (can't book past dates or past times on current date)
        validateBookingDateTime(request.getBookingDate(), request.getStartTime());

        // Check for conflicts - ONLY with APPROVED bookings
        // Pending bookings do NOT block new bookings from other users
        List<Booking> overlappingApproved = bookingRepository.findOverlappingApprovedBookings(
                request.getResourceId(), request.getBookingDate(),
                request.getStartTime(), request.getEndTime());

        if (!overlappingApproved.isEmpty()) {
            throw new InvalidBookingException("This time slot is already approved for another booking");
        }

        // Check if the SAME user already has a pending OR approved booking for this exact slot
        List<Booking> existingUserBookings = bookingRepository.findByUserIdAndResourceIdAndBookingDateAndStartTimeAndEndTime(
                user.getId(), request.getResourceId(), request.getBookingDate(),
                request.getStartTime(), request.getEndTime());

        boolean hasUserPending = existingUserBookings.stream()
                .anyMatch(b -> b.getStatus() == BookingStatus.PENDING);

        if (hasUserPending) {
            throw new InvalidBookingException("You already have a pending booking for this time slot");
        }

        boolean hasUserApproved = existingUserBookings.stream()
                .anyMatch(b -> b.getStatus() == BookingStatus.APPROVED);

        if (hasUserApproved) {
            throw new InvalidBookingException("You already have an approved booking for this time slot");
        }

        // DIFFERENT USERS CAN BOOK THE SAME PENDING SLOT
        // No check for other users' pending bookings - this allows multiple users to request the same slot

        // Create booking
        Booking booking = Booking.builder()
                .resourceId(request.getResourceId())
                .userId(user.getId())
                .bookingDate(request.getBookingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .purpose(request.getPurpose())
                .expectedAttendees(request.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .build();

        // Try to save - if there's a duplicate key error, catch it and handle gracefully
        Booking saved;
        try {
            saved = bookingRepository.save(booking);
        } catch (Exception e) {
            log.error("Failed to save booking: {}", e.getMessage());
            if (e.getMessage().contains("duplicate key") || e.getMessage().contains("unique")) {
                throw new InvalidBookingException("This time slot is already booked. Please choose a different time.");
            }
            throw new InvalidBookingException("Failed to create booking: " + e.getMessage());
        }

        log.info("Booking created: {} for resource {} by user {}",
                saved.getId(), resource.getName(), user.getEmail());

        // Get count of pending bookings for this slot (including this new one)
        long pendingCount = bookingRepository.countPendingBookingsForSlot(
                request.getResourceId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        log.info("Now there are {} pending requests for slot {} on {}",
                pendingCount, request.getStartTime(), request.getBookingDate());

        // Send notification to user
        notificationService.sendNotification(
                user.getId(),
                "Booking Request Submitted",
                String.format("Your booking request for %s on %s at %s-%s has been submitted and is pending approval. There are currently %d pending request(s) for this slot.",
                        resource.getName(), request.getBookingDate(),
                        request.getStartTime(), request.getEndTime(), pendingCount),
                "BOOKING_CREATED"
        );

        return mapToResponse(saved, resource, user);
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatusUpdateRequest request, String adminEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        // Validate status transition
        if (booking.getStatus() == BookingStatus.APPROVED && request.getStatus() == BookingStatus.REJECTED) {
            throw new InvalidBookingException("Cannot reject an already approved booking");
        }
        if (booking.getStatus() == BookingStatus.REJECTED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidBookingException("Cannot modify a finalised booking");
        }

        // If approving, check for conflicts again and reject other pending bookings
        if (request.getStatus() == BookingStatus.APPROVED) {
            List<Booking> overlappingApproved = bookingRepository.findOverlappingApprovedBookings(
                    booking.getResourceId(),
                    booking.getBookingDate(),
                    booking.getStartTime(),
                    booking.getEndTime());

            if (!overlappingApproved.isEmpty()) {
                throw new InvalidBookingException("This time slot is now booked by another approved booking");
            }

            // When approving a booking, automatically reject all other PENDING bookings for the same slot
            rejectOtherPendingBookings(booking);
        }

        BookingStatus oldStatus = booking.getStatus();
        booking.setStatus(request.getStatus());
        booking.setAdminReason(request.getReason());
        Booking updated = bookingRepository.save(booking);

        // Get resource and user for response
        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        User user = userRepository.findById(booking.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        log.info("Booking {} status updated from {} to {} by admin {}",
                bookingId, oldStatus, request.getStatus(), adminEmail);

        // Send notification to user about status change
        String statusMessage = request.getStatus() == BookingStatus.APPROVED ?
                "approved" : "rejected";
        String reasonMsg = request.getReason() != null ?
                " Reason: " + request.getReason() : "";

        notificationService.sendNotification(
                user.getId(),
                "Booking " + statusMessage.toUpperCase(),
                String.format("Your booking request for %s on %s at %s-%s has been %s.%s",
                        resource.getName(), booking.getBookingDate(),
                        booking.getStartTime(), booking.getEndTime(),
                        statusMessage, reasonMsg),
                "BOOKING_" + request.getStatus().name()
        );

        return mapToResponse(updated, resource, user);
    }

    private void rejectOtherPendingBookings(Booking approvedBooking) {
        List<Booking> allBookings = bookingRepository.findBookingsByResourceAndDate(
                approvedBooking.getResourceId(), approvedBooking.getBookingDate());

        int rejectedCount = 0;

        for (Booking pending : allBookings) {
            if (!pending.getId().equals(approvedBooking.getId()) &&
                    pending.getStartTime().equals(approvedBooking.getStartTime()) &&
                    pending.getEndTime().equals(approvedBooking.getEndTime()) &&
                    pending.getStatus() == BookingStatus.PENDING) {

                pending.setStatus(BookingStatus.REJECTED);
                pending.setAdminReason("This time slot was approved for another user");
                bookingRepository.save(pending);
                rejectedCount++;

                // Notify the rejected user
                User rejectedUser = userRepository.findById(pending.getUserId()).orElse(null);
                Resource resource = resourceRepository.findById(pending.getResourceId()).orElse(null);

                if (rejectedUser != null && resource != null) {
                    notificationService.sendNotification(
                            rejectedUser.getId(),
                            "Booking Rejected",
                            String.format("Your booking request for %s on %s at %s-%s has been rejected because the time slot was approved for another user.",
                                    resource.getName(), pending.getBookingDate(),
                                    pending.getStartTime(), pending.getEndTime()),
                            "BOOKING_REJECTED"
                    );
                }

                log.info("Auto-rejected pending booking {} for slot {} on {}",
                        pending.getId(), pending.getStartTime(), pending.getBookingDate());
            }
        }

        if (rejectedCount > 0) {
            log.info("Auto-rejected {} other pending bookings for slot {} on {}",
                    rejectedCount, approvedBooking.getStartTime(), approvedBooking.getBookingDate());
        }
    }

    @Override
    @Transactional
    public BookingResponse cancelBooking(UUID bookingId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findByIdAndUserId(bookingId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found or not owned by user"));

        if (booking.getStatus() == BookingStatus.APPROVED || booking.getStatus() == BookingStatus.PENDING) {
            booking.setStatus(BookingStatus.CANCELLED);
            Booking updated = bookingRepository.save(booking);

            Resource resource = resourceRepository.findById(booking.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

            log.info("Booking {} cancelled by user {}", bookingId, userEmail);

            notificationService.sendNotification(
                    user.getId(),
                    "Booking Cancelled",
                    String.format("Your booking for %s on %s at %s-%s has been cancelled.",
                            resource.getName(), booking.getBookingDate(),
                            booking.getStartTime(), booking.getEndTime()),
                    "BOOKING_CANCELLED"
            );

            return mapToResponse(updated, resource, user);
        } else {
            throw new InvalidBookingException("Only pending or approved bookings can be cancelled");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getUserBookings(String userEmail, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        return bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(user.getId(), pageable)
                .map(booking -> {
                    Resource resource = resourceRepository.findById(booking.getResourceId())
                            .orElse(null);
                    return mapToResponse(booking, resource, user);
                });
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getAllBookings(UUID resourceId, String status, LocalDate bookingDate, Pageable pageable) {
        log.info("Fetching bookings with filters - resourceId: {}, status: {}, bookingDate: {}, pageable: {}",
                resourceId, status, bookingDate, pageable);

        // Convert status to enum
        BookingStatus bookingStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status value: {}", status);
                return Page.empty(pageable);
            }
        }

        Page<Booking> bookingPage;

        // Use different repository methods based on which filters are present
        if (resourceId != null && bookingStatus != null && bookingDate != null) {
            // All three filters: status + date + resource
            log.info("Using filter: status={}, date={}, resource={}", bookingStatus, bookingDate, resourceId);
            bookingPage = bookingRepository.findByStatusAndBookingDateAndResourceIdOrderByCreatedAtDesc(
                    bookingStatus, bookingDate, resourceId, pageable);

        } else if (resourceId != null && bookingStatus != null) {
            // Two filters: status + resource
            log.info("Using filter: status={}, resource={}", bookingStatus, resourceId);
            bookingPage = bookingRepository.findByStatusAndResourceIdOrderByCreatedAtDesc(
                    bookingStatus, resourceId, pageable);

        } else if (resourceId != null && bookingDate != null) {
            // Two filters: date + resource
            log.info("Using filter: date={}, resource={}", bookingDate, resourceId);
            bookingPage = bookingRepository.findByBookingDateAndResourceIdOrderByCreatedAtDesc(
                    bookingDate, resourceId, pageable);

        } else if (bookingStatus != null && bookingDate != null) {
            // Two filters: status + date
            log.info("Using filter: status={}, date={}", bookingStatus, bookingDate);
            bookingPage = bookingRepository.findByStatusAndBookingDateOrderByCreatedAtDesc(
                    bookingStatus, bookingDate, pageable);

        } else if (resourceId != null) {
            // Single filter: resource only
            log.info("Using filter: resource={}", resourceId);
            bookingPage = bookingRepository.findByResourceIdOrderByCreatedAtDesc(resourceId, pageable);

        } else if (bookingStatus != null) {
            // Single filter: status only
            log.info("Using filter: status={}", bookingStatus);
            bookingPage = bookingRepository.findByStatusOrderByCreatedAtDesc(bookingStatus, pageable);

        } else if (bookingDate != null) {
            // Single filter: date only
            log.info("Using filter: date={}", bookingDate);
            bookingPage = bookingRepository.findByBookingDateOrderByCreatedAtDesc(bookingDate, pageable);

        } else {
            // No filters - get all bookings
            log.info("Using filter: none (all bookings)");
            bookingPage = bookingRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        log.info("Found {} bookings", bookingPage.getTotalElements());

        // Convert to response DTOs
        return bookingPage.map(booking -> {
            Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
            User user = userRepository.findById(booking.getUserId()).orElse(null);
            return mapToResponse(booking, resource, user);
        });
    }

    @Override
    @Transactional(readOnly = true)
    public AvailableTimeSlotsResponse getAvailableTimeSlots(UUID resourceId, LocalDate date) {
        // Get all bookings for this resource on this date
        List<Booking> bookings = bookingRepository.findBookingsByResourceAndDate(resourceId, date);

        // Separate approved bookings from pending
        List<Booking> approvedBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .collect(Collectors.toList());

        List<Booking> pendingBookings = bookings.stream()
                .filter(b -> b.getStatus() == BookingStatus.PENDING)
                .collect(Collectors.toList());

        // Generate all time slots (hourly from 8 AM to 5 PM)
        List<AvailableTimeSlotsResponse.TimeSlot> allSlots = new ArrayList<>();
        List<AvailableTimeSlotsResponse.BookedSlot> bookedSlots = new ArrayList<>();

        LocalTime current = START_TIME;
        LocalTime now = LocalTime.now();
        LocalDate today = LocalDate.now();
        boolean isToday = date.equals(today);

        while (current.isBefore(END_TIME)) {
            LocalTime slotEnd = current.plusHours(SLOT_DURATION_HOURS);

            final LocalTime finalCurrent = current;
            final LocalTime finalSlotEnd = slotEnd;

            // Check if slot is in the past for today
            boolean isPastSlot = isToday && current.isBefore(now);

            // Check if slot is approved (blocked)
            boolean isApprovedBooked = approvedBookings.stream()
                    .anyMatch(b -> b.getStartTime().equals(finalCurrent) && b.getEndTime().equals(finalSlotEnd));

            // Check if slot has pending booking (still available for others to book)
            List<Booking> pendingForSlot = pendingBookings.stream()
                    .filter(b -> b.getStartTime().equals(finalCurrent) && b.getEndTime().equals(finalSlotEnd))
                    .collect(Collectors.toList());

            boolean hasPending = !pendingForSlot.isEmpty();

            // Slot is available if NOT approved AND not a past slot
            // Pending bookings do NOT block availability
            allSlots.add(AvailableTimeSlotsResponse.TimeSlot.builder()
                    .startTime(finalCurrent)
                    .endTime(finalSlotEnd)
                    .available(!isApprovedBooked && !isPastSlot)
                    .build());

            if (isApprovedBooked) {
                bookedSlots.add(AvailableTimeSlotsResponse.BookedSlot.builder()
                        .startTime(finalCurrent)
                        .endTime(finalSlotEnd)
                        .status(BookingStatus.APPROVED)
                        .build());
            } else if (hasPending) {
                // Show pending status with count
                bookedSlots.add(AvailableTimeSlotsResponse.BookedSlot.builder()
                        .startTime(finalCurrent)
                        .endTime(finalSlotEnd)
                        .status(BookingStatus.PENDING)
                        .build());
            }

            current = slotEnd;
        }

        return AvailableTimeSlotsResponse.builder()
                .availableSlots(allSlots)
                .bookedSlots(bookedSlots)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public boolean checkConflict(UUID resourceId, LocalDate date, LocalTime startTime, LocalTime endTime) {
        List<Booking> overlapping = bookingRepository.findOverlappingApprovedBookings(
                resourceId, date, startTime, endTime);
        return !overlapping.isEmpty();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(UUID bookingId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        // Check permission: user can only see their own bookings, admin can see all
        if (user.getRole() != Role.ADMIN && !booking.getUserId().equals(user.getId())) {
            throw new InvalidBookingException("You don't have permission to view this booking");
        }

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElse(null);

        return mapToResponse(booking, resource, user);
    }

    private void validateBookingTime(LocalTime startTime, LocalTime endTime) {
        // Check if time is within allowed hours (8 AM - 5 PM)
        if (startTime.isBefore(START_TIME) || endTime.isAfter(END_TIME)) {
            throw new InvalidBookingException(
                    String.format("Bookings are only allowed between %s and %s", START_TIME, END_TIME));
        }

        // Check if duration is exactly 1 hour
        long durationHours = java.time.Duration.between(startTime, endTime).toHours();
        if (durationHours != SLOT_DURATION_HOURS) {
            throw new InvalidBookingException("Bookings must be exactly 1 hour long");
        }

        // Check if start time is on the hour
        if (startTime.getMinute() != 0) {
            throw new InvalidBookingException("Bookings must start on the hour");
        }
    }

    private void validateBookingDateTime(LocalDate bookingDate, LocalTime startTime) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // Check if date is in the past
        if (bookingDate.isBefore(today)) {
            throw new InvalidBookingException("Cannot book past dates");
        }

        // If booking is for today, check if the time is in the future
        if (bookingDate.equals(today) && startTime.isBefore(now)) {
            throw new InvalidBookingException("Cannot book a time slot that has already passed");
        }
    }

    private BookingResponse mapToResponse(Booking booking, Resource resource, User user) {
        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .resourceName(resource != null ? resource.getName() : null)
                .userId(booking.getUserId())
                .userFullName(user != null ? user.getFullName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .purpose(booking.getPurpose())
                .expectedAttendees(booking.getExpectedAttendees())
                .status(booking.getStatus())
                .adminReason(booking.getAdminReason())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .build();
    }
}