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

    // In BookingServiceImpl.java, update the createBooking method to handle maintenance requests

    @Override
    @Transactional
    public BookingResponse createBooking(BookingCreateRequest request, String userEmail) {
        // Validate user
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Validate resource
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // ========== NEW: Validate capacity ==========
        if (request.getExpectedAttendees() != null && resource.getCapacity() != null) {
            if (request.getExpectedAttendees() > resource.getCapacity()) {
                throw new InvalidBookingException(
                        String.format("Expected attendees (%d) exceeds resource capacity (%d). Please reduce the number of attendees or choose a larger resource.",
                                request.getExpectedAttendees(), resource.getCapacity()));
            }
        }

        // Check if resource is active
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new InvalidBookingException("Resource is currently unavailable for booking");
        }

        // Check if resource is in maintenance mode
        if (resource.getMaintenanceMode() != null && resource.getMaintenanceMode()) {
            LocalDate bookingDate = request.getBookingDate();
            LocalDate maintenanceStart = resource.getMaintenanceStartDate();
            LocalDate maintenanceEnd = resource.getMaintenanceEndDate();

            if (maintenanceStart != null && maintenanceEnd != null &&
                    !bookingDate.isBefore(maintenanceStart) && !bookingDate.isAfter(maintenanceEnd)) {
                throw new InvalidBookingException(
                        String.format("This resource is under maintenance from %s to %s. Bookings are not allowed during this period.",
                                maintenanceStart, maintenanceEnd));
            }
        }

        // Validate booking time
        validateBookingTime(request.getStartTime(), request.getEndTime());

        // Validate booking date and time (can't book past dates or past times on current date)
        validateBookingDateTime(request.getBookingDate(), request.getStartTime());

        // Check for conflicts - ONLY with APPROVED bookings
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

        // Create booking with maintenance fields
        Booking booking = Booking.builder()
                .resourceId(request.getResourceId())
                .userId(user.getId())
                .bookingDate(request.getBookingDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .purpose(request.getPurpose())
                .expectedAttendees(request.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .bookingType(request.getBookingType() != null ? request.getBookingType() : "REGULAR")
                .issueDescription(request.getIssueDescription())
                .priority(request.getPriority())
                .build();

        Booking saved = bookingRepository.save(booking);
        log.info("Booking created: {} for resource {} by user {}",
                saved.getId(), resource.getName(), user.getEmail());

        // Get count of pending bookings for this slot
        long pendingCount = bookingRepository.countPendingBookingsForSlot(
                request.getResourceId(),
                request.getBookingDate(),
                request.getStartTime(),
                request.getEndTime());

        log.info("Now there are {} pending requests for slot {} on {}",
                pendingCount, request.getStartTime(), request.getBookingDate());

        // Send notification to user
        String notificationType = "MAINTENANCE_REQUEST".equals(request.getBookingType()) ?
                "MAINTENANCE_REQUEST_SUBMITTED" : "BOOKING_CREATED";

        notificationService.sendNotification(
                user.getId(),
                "MAINTENANCE_REQUEST".equals(request.getBookingType()) ?
                        "Maintenance Request Submitted" : "Booking Request Submitted",
                String.format("Your %s for %s on %s at %s-%s has been submitted and is pending approval.",
                        "MAINTENANCE_REQUEST".equals(request.getBookingType()) ? "maintenance request" : "booking request",
                        resource.getName(), request.getBookingDate(),
                        request.getStartTime(), request.getEndTime()),
                notificationType
        );

        // If maintenance request, also notify admins
        if ("MAINTENANCE".equals(request.getBookingType())) {
            List<User> admins = userRepository.findByRole(Role.ADMIN);
            for (User admin : admins) {
                notificationService.sendNotification(
                        admin.getId(),
                        "🔧 New Maintenance Request",
                        String.format("Technician %s has submitted a maintenance request for %s on %s at %s-%s. Priority: %s\nIssue: %s",
                                user.getFullName(), resource.getName(), request.getBookingDate(),
                                request.getStartTime(), request.getEndTime(),
                                request.getPriority(), request.getIssueDescription()),
                        "MAINTENANCE_REQUEST"
                );
            }
        }

        return mapToResponse(saved, resource, user);
    }

    @Override
    @Transactional
    public BookingResponse updateBookingStatus(UUID bookingId, BookingStatusUpdateRequest request, String adminEmail) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        // Validate status transition based on assignment guidelines
        if (booking.getStatus() == BookingStatus.APPROVED && request.getStatus() == BookingStatus.REJECTED) {
            throw new InvalidBookingException("Cannot reject an already approved booking. Approved bookings can only be cancelled by the user.");
        }

        if (booking.getStatus() == BookingStatus.APPROVED && request.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidBookingException("Only users can cancel their own approved bookings. Admins cannot cancel approved bookings.");
        }

        if (booking.getStatus() == BookingStatus.REJECTED || booking.getStatus() == BookingStatus.CANCELLED) {
            throw new InvalidBookingException("Cannot modify a finalised booking");
        }

        if (booking.getStatus() == BookingStatus.APPROVED && request.getStatus() == BookingStatus.APPROVED) {
            throw new InvalidBookingException("Booking is already approved");
        }

        // If approving, check capacity and conflicts
        if (request.getStatus() == BookingStatus.APPROVED) {

            // ========== NEW: Validate capacity before approval ==========
            Resource resource = resourceRepository.findById(booking.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

            if (booking.getExpectedAttendees() != null && resource.getCapacity() != null) {
                if (booking.getExpectedAttendees() > resource.getCapacity()) {
                    throw new InvalidBookingException(
                            String.format("Cannot approve: Expected attendees (%d) exceeds resource capacity (%d). Please ask the user to reduce the number of attendees or reject this booking.",
                                    booking.getExpectedAttendees(), resource.getCapacity()));
                }
            }

            // Check for conflicts
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

        // ── Guard: cannot cancel a booking whose time slot has already passed ──
        LocalDate today = LocalDate.now();
        LocalTime now   = LocalTime.now();

        boolean slotHasPassed =
                booking.getBookingDate().isBefore(today) ||
                        (booking.getBookingDate().isEqual(today) && booking.getEndTime().isBefore(now));

        if (slotHasPassed) {
            throw new InvalidBookingException(
                    String.format("Cannot cancel a booking whose time slot has already passed (%s %s–%s).",
                            booking.getBookingDate(), booking.getStartTime(), booking.getEndTime()));
        }

        // ── Cancel PENDING bookings ──
        if (booking.getStatus() == BookingStatus.PENDING) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setAdminReason("Cancelled by user");
            Booking updated = bookingRepository.save(booking);

            Resource resource = resourceRepository.findById(booking.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

            log.info("Pending booking {} cancelled by user {}", bookingId, userEmail);

            notificationService.sendNotification(
                    user.getId(),
                    "Booking Cancelled",
                    String.format("Your pending booking request for %s on %s at %s–%s has been cancelled.",
                            resource.getName(), booking.getBookingDate(),
                            booking.getStartTime(), booking.getEndTime()),
                    "BOOKING_CANCELLED"
            );

            return mapToResponse(updated, resource, user);
        }

        // ── Cancel APPROVED bookings (only if slot hasn't passed — already guarded above) ──
        if (booking.getStatus() == BookingStatus.APPROVED) {
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setAdminReason("Cancelled by user");
            Booking updated = bookingRepository.save(booking);

            Resource resource = resourceRepository.findById(booking.getResourceId())
                    .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

            log.info("Approved booking {} cancelled by user {}", bookingId, userEmail);

            notificationService.sendNotification(
                    user.getId(),
                    "Booking Cancelled",
                    String.format("Your approved booking for %s on %s at %s–%s has been cancelled.",
                            resource.getName(), booking.getBookingDate(),
                            booking.getStartTime(), booking.getEndTime()),
                    "BOOKING_CANCELLED"
            );

            return mapToResponse(updated, resource, user);
        }

        throw new InvalidBookingException("Only pending or approved bookings can be cancelled");
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getUserBookings(String userEmail, String status, String bookingType, Pageable pageable) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        log.info("Fetching user bookings for email: {}, status: {}, bookingType: {}, pageable: {}", userEmail, status, bookingType, pageable);

        // Convert status to enum
        BookingStatus bookingStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            try {
                bookingStatus = BookingStatus.valueOf(status.toUpperCase());
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status value: {}", status);
            }
        }

        Page<Booking> bookingPage;

        if (bookingStatus != null && bookingType != null && !bookingType.trim().isEmpty()) {
            // Filter by both status and booking type
            bookingPage = bookingRepository.findByUserIdAndStatusAndBookingTypeOrderByBookingDateDescStartTimeDesc(
                    user.getId(), bookingStatus, bookingType, pageable);
            log.info("Filtering by status: {} and bookingType: {}", bookingStatus, bookingType);
        } else if (bookingStatus != null) {
            // Filter by status only
            bookingPage = bookingRepository.findByUserIdAndStatusOrderByBookingDateDescStartTimeDesc(
                    user.getId(), bookingStatus, pageable);
            log.info("Filtering by status: {}", bookingStatus);
        } else if (bookingType != null && !bookingType.trim().isEmpty()) {
            // Filter by booking type only
            bookingPage = bookingRepository.findByUserIdAndBookingTypeOrderByBookingDateDescStartTimeDesc(
                    user.getId(), bookingType, pageable);
            log.info("Filtering by bookingType: {}", bookingType);
        } else {
            // No status filter - get all bookings
            bookingPage = bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(user.getId(), pageable);
            log.info("No status filter - getting all bookings");
        }

        log.info("Found {} bookings", bookingPage.getTotalElements());

        return bookingPage.map(booking -> {
            Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
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
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // Check if resource is in maintenance mode for this date
        boolean isUnderMaintenance = false;
        String maintenanceReason = null;
        LocalDate maintenanceEndDate = null;

        if (resource.getMaintenanceMode() != null && resource.getMaintenanceMode() &&
                resource.getMaintenanceStartDate() != null && resource.getMaintenanceEndDate() != null) {
            isUnderMaintenance = !date.isBefore(resource.getMaintenanceStartDate()) &&
                    !date.isAfter(resource.getMaintenanceEndDate());
            maintenanceReason = resource.getMaintenanceReason();
            maintenanceEndDate = resource.getMaintenanceEndDate();
        }

        if (isUnderMaintenance) {
            // Return empty slots with maintenance info
            return AvailableTimeSlotsResponse.builder()
                    .availableSlots(new ArrayList<>())
                    .bookedSlots(new ArrayList<>())
                    .isUnderMaintenance(true)
                    .maintenanceReason(maintenanceReason)
                    .maintenanceEndDate(maintenanceEndDate)
                    .build();
        }

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
                .isUnderMaintenance(false)
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

    @Override
    @Transactional
    public BookingResponse updateBooking(UUID bookingId, BookingUpdateRequest request, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Booking booking = bookingRepository.findByIdAndUserId(bookingId, user.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found or not owned by user"));

        // Only allow editing of PENDING bookings
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingException("Only pending bookings can be edited");
        }

        // Update the booking details
        booking.setPurpose(request.getPurpose());
        booking.setExpectedAttendees(request.getExpectedAttendees());

        Booking updated = bookingRepository.save(booking);

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        log.info("Booking {} updated by user {}", bookingId, userEmail);

        // Send notification about update
        notificationService.sendNotification(
                user.getId(),
                "Booking Updated",
                String.format("Your booking for %s on %s at %s-%s has been updated and is pending approval.",
                        resource.getName(), booking.getBookingDate(),
                        booking.getStartTime(), booking.getEndTime()),
                "BOOKING_UPDATED"
        );

        return mapToResponse(updated, resource, user);
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

    // Update the mapToResponse method to include maintenance fields and user role

    private BookingResponse mapToResponse(Booking booking, Resource resource, User user) {
        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .resourceName(resource != null ? resource.getName() : null)
                .userId(booking.getUserId())
                .userFullName(user != null ? user.getFullName() : null)
                .userEmail(user != null ? user.getEmail() : null)
                .userRole(user != null ? user.getRole().name() : null)
                .bookingDate(booking.getBookingDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .purpose(booking.getPurpose())
                .expectedAttendees(booking.getExpectedAttendees())
                .status(booking.getStatus())
                .adminReason(booking.getAdminReason())
                .createdAt(booking.getCreatedAt())
                .updatedAt(booking.getUpdatedAt())
                .bookingType(booking.getBookingType())
                .issueDescription(booking.getIssueDescription())
                .priority(booking.getPriority())
                .build();
    }

    @Override
    public long getTotalBookingsCount() {
        return bookingRepository.count();
    }

    @Override
    public long getPendingBookingsCount() {
        return bookingRepository.countByStatus(BookingStatus.PENDING);
    }

    @Override
    public long getApprovedBookingsCount() {
        return bookingRepository.countByStatus(BookingStatus.APPROVED);
    }

    @Override
    public long getRejectedBookingsCount() {
        return bookingRepository.countByStatus(BookingStatus.REJECTED);
    }

    @Override
    public long getCancelledBookingsCount() {
        return bookingRepository.countByStatus(BookingStatus.CANCELLED);
    }

    @Override
    public long getMaintenanceBookingsCount() {
        return bookingRepository.findByStatusAndBookingType(BookingStatus.APPROVED, "MAINTENANCE").size();
    }

    @Override
    public long getUserBookingsCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return bookingRepository.countByUserId(user.getId());
    }

    @Override
    public long getUserPendingBookingsCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return bookingRepository.countByUserIdAndStatus(user.getId(), BookingStatus.PENDING);
    }

    @Override
    public long getUserApprovedBookingsCount(String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return bookingRepository.countByUserIdAndStatus(user.getId(), BookingStatus.APPROVED);
    }
}