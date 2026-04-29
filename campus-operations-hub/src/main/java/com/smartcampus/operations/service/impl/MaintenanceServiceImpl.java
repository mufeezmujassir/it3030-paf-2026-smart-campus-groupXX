package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.MaintenanceActionDTO;
import com.smartcampus.operations.dto.MaintenanceRequestDTO;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.InvalidBookingException;
import com.smartcampus.operations.exception.ResourceNotFoundException;
import com.smartcampus.operations.repository.*;
import com.smartcampus.operations.service.MaintenanceService;
import com.smartcampus.operations.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MaintenanceServiceImpl implements MaintenanceService {

    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public MaintenanceRequestDTO startMaintenance(UUID bookingId, String technicianEmail) {
        log.info("MaintenanceServiceImpl.startMaintenance called for booking: {}", bookingId);

        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        log.info("Found booking - ID: {}, Status: {}, Type: {}, Date: {}, Start Time: {}",
                booking.getId(), booking.getStatus(), booking.getBookingType(),
                booking.getBookingDate(), booking.getStartTime());

        // Validate booking status
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingException("Only approved bookings can be started for maintenance. Current status: " + booking.getStatus());
        }

        // Validate booking type
        if (!"MAINTENANCE".equals(booking.getBookingType())) {
            throw new InvalidBookingException("This is not a maintenance request. Booking type: " + booking.getBookingType());
        }

        // ========== Validate date and time ==========
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();
        LocalDate bookingDate = booking.getBookingDate();
        LocalTime startTime = booking.getStartTime();
        LocalTime endTime = booking.getEndTime();

        // Check if booking date is in the future
        if (bookingDate.isAfter(today)) {
            throw new InvalidBookingException(
                    String.format("Cannot start maintenance yet. This maintenance is scheduled for %s at %s-%s. You can only start maintenance on the scheduled date between %s and %s.",
                            bookingDate, startTime, endTime,
                            startTime.minusMinutes(15), startTime.plusMinutes(30)));
        }

        // Check if booking date is in the past
        if (bookingDate.isBefore(today)) {
            throw new InvalidBookingException(
                    String.format("Cannot start maintenance. This maintenance was scheduled for %s at %s-%s and has already passed.",
                            bookingDate, startTime, endTime));
        }

        // Check if current time is within the booking time window
        // Allow starting 15 minutes before scheduled time (grace period)
        LocalTime graceStartTime = startTime.minusMinutes(15);
        if (graceStartTime.isBefore(LocalTime.MIN)) {
            graceStartTime = LocalTime.MIN;
        }

        // Allow starting up to 30 minutes after scheduled start time
        LocalTime graceEndTime = startTime.plusMinutes(30);

        boolean isWithinWindow = !now.isBefore(graceStartTime) && !now.isAfter(graceEndTime);

        if (!isWithinWindow) {
            String timeMessage;
            if (now.isBefore(graceStartTime)) {
                long minutesUntil = java.time.Duration.between(now, graceStartTime).toMinutes();
                timeMessage = String.format("too early. The maintenance window starts at %s (you can start from %s, in about %d minutes).",
                        startTime, graceStartTime, minutesUntil);
            } else {
                timeMessage = String.format("too late. The maintenance window started at %s and ended at %s.",
                        startTime, graceEndTime);
            }

            throw new InvalidBookingException(
                    String.format("Cannot start maintenance - %s Scheduled maintenance time: %s-%s on %s.",
                            timeMessage, startTime, endTime, bookingDate));
        }

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // Check if maintenance is already in progress for this booking
        MaintenanceRequest existingRequest = maintenanceRequestRepository.findByBookingId(bookingId).orElse(null);
        if (existingRequest != null && existingRequest.getMaintenanceStatus() == MaintenanceStatus.IN_PROGRESS) {
            throw new InvalidBookingException("Maintenance is already in progress for this booking");
        }

        if (existingRequest != null && existingRequest.getMaintenanceStatus() == MaintenanceStatus.COMPLETED) {
            throw new InvalidBookingException("Maintenance has already been completed for this booking");
        }

        // Create or update maintenance request
        MaintenanceRequest maintenanceRequest;
        if (existingRequest == null) {
            maintenanceRequest = MaintenanceRequest.builder()
                    .bookingId(bookingId)
                    .technicianId(technician.getId())
                    .issueDescription(booking.getIssueDescription() != null ? booking.getIssueDescription() : "No description provided")
                    .priority(booking.getPriority() != null ? booking.getPriority() : "MEDIUM")
                    .maintenanceStatus(MaintenanceStatus.IN_PROGRESS)
                    .startedAt(LocalDateTime.now())
                    .estimatedHours(booking.getExpectedAttendees() != null ? booking.getExpectedAttendees() : null)
                    .build();
        } else {
            maintenanceRequest = existingRequest;
            maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.IN_PROGRESS);
            maintenanceRequest.setStartedAt(LocalDateTime.now());
        }

        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);
        log.info("Maintenance request saved with ID: {}, Status: {}", saved.getId(), saved.getMaintenanceStatus());

        // Put resource into maintenance mode
        resource.setMaintenanceMode(true);
        resource.setMaintenanceStartDate(booking.getBookingDate());
        resource.setMaintenanceEndDate(booking.getBookingDate());
        resource.setMaintenanceReason(booking.getIssueDescription());
        resourceRepository.save(resource);

        log.info("Maintenance started for booking {} by technician {} at {}, resource {} put into maintenance mode",
                bookingId, technicianEmail, LocalDateTime.now(), resource.getName());

        // Find and notify users with approved bookings during maintenance period
        List<Booking> conflictingBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getResourceId().equals(booking.getResourceId()))
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> !b.getId().equals(bookingId))
                .filter(b -> b.getBookingDate().equals(booking.getBookingDate()))
                .collect(Collectors.toList());

        for (Booking conflicting : conflictingBookings) {
            User conflictingUser = userRepository.findById(conflicting.getUserId()).orElse(null);
            if (conflictingUser != null) {
                notificationService.sendNotification(
                        conflictingUser.getId(),
                        "⚠️ Booking Affected by Maintenance",
                        String.format("Your approved booking for %s on %s at %s-%s has been affected by an urgent maintenance request. The resource is now under maintenance. Please contact support or cancel your booking.",
                                resource.getName(), conflicting.getBookingDate(),
                                conflicting.getStartTime(), conflicting.getEndTime()),
                        "MAINTENANCE_AFFECTED"
                );
            }
        }

        // Notify admins
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "🔧 Maintenance Started",
                    String.format("Technician %s has started maintenance for %s. Resource is now in maintenance mode.",
                            technician.getFullName(), resource.getName()),
                    "MAINTENANCE_STARTED"
            );
        }

        return mapToDTO(saved, booking, technician);
    }

    @Override
    @Transactional
    public MaintenanceRequestDTO completeMaintenance(UUID bookingId, String technicianEmail) {
        log.info("MaintenanceServiceImpl.completeMaintenance called for booking: {}", bookingId);

        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));

        if (maintenanceRequest.getMaintenanceStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new InvalidBookingException("Only maintenance in progress can be marked as completed. Current status: " + maintenanceRequest.getMaintenanceStatus());
        }

        // Validate that completion is after start time
        if (maintenanceRequest.getStartedAt() != null &&
                maintenanceRequest.getStartedAt().isAfter(LocalDateTime.now())) {
            throw new InvalidBookingException("Cannot complete maintenance before it has started");
        }

        maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.COMPLETED);
        maintenanceRequest.setCompletedAt(LocalDateTime.now());

        // Calculate actual hours
        if (maintenanceRequest.getStartedAt() != null) {
            long actualHours = java.time.Duration.between(maintenanceRequest.getStartedAt(), LocalDateTime.now()).toHours();
            maintenanceRequest.setActualHours((int) actualHours);
        }

        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        // Take resource out of maintenance mode
        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));
        resource.setMaintenanceMode(false);
        resource.setMaintenanceStartDate(null);
        resource.setMaintenanceEndDate(null);
        resource.setMaintenanceReason(null);
        resourceRepository.save(resource);

        log.info("Maintenance completed for booking {} by technician {} at {}, resource {} taken out of maintenance mode",
                bookingId, technicianEmail, LocalDateTime.now(), resource.getName());

        // Notify users that resource is available again
        List<Booking> affectedBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getResourceId().equals(booking.getResourceId()))
                .filter(b -> b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING)
                .collect(Collectors.toList());

        for (Booking affected : affectedBookings) {
            User affectedUser = userRepository.findById(affected.getUserId()).orElse(null);
            if (affectedUser != null && !affected.getId().equals(bookingId)) {
                notificationService.sendNotification(
                        affectedUser.getId(),
                        "✅ Resource Available Again",
                        String.format("Maintenance has been completed for %s. Your booking status remains unchanged.",
                                resource.getName()),
                        "MAINTENANCE_COMPLETED"
                );
            }
        }

        // Notify admins
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "✅ Maintenance Completed",
                    String.format("Technician %s has completed maintenance for %s. Resource is now available.",
                            technician.getFullName(), resource.getName()),
                    "MAINTENANCE_COMPLETED"
            );
        }

        return mapToDTO(saved, booking, technician);
    }

    // ─── METHOD 1: requestExtension ───────────────────────────────────────────────
// FIX: Do NOT update the resource's maintenanceEndDate here.
//      Only record the requested days on the MaintenanceRequest entity.
//      The resource end date is only extended if admin APPROVES (see method 2).

    @Override
    @Transactional
    public MaintenanceRequestDTO requestExtension(UUID bookingId, int days, String technicianEmail) {
        log.info("requestExtension called for booking: {}, days: {}", bookingId, days);

        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));

        if (maintenanceRequest.getMaintenanceStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new InvalidBookingException("Extension can only be requested for maintenance in progress");
        }

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // ── KEY FIX: record the request but do NOT change the resource end date ──
        // The resource end date is only extended after admin approval (see updateMaintenanceStatus).
        maintenanceRequest.setExtensionRequested(days);
        maintenanceRequest.setExtensionReason("Technician requested " + days + " day extension");
        maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.EXTENSION_REQUESTED);
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Extension request recorded for booking {} — {} days requested by {}. " +
                        "Resource end date NOT changed yet (pending admin approval).",
                bookingId, days, technicianEmail);

        // Notify admins — include both the current end date and the proposed new end date
        LocalDate currentEndDate = resource.getMaintenanceEndDate();
        LocalDate proposedEndDate = currentEndDate != null ? currentEndDate.plusDays(days) : null;

        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "🔄 Maintenance Extension Request",
                    String.format(
                            "Technician %s requests %d additional day(s) for maintenance of %s. " +
                                    "Current end date: %s. Proposed new end date: %s. " +
                                    "Please approve or reject in the Maintenance Requests tab.",
                            technician.getFullName(), days, resource.getName(),
                            currentEndDate, proposedEndDate),
                    "MAINTENANCE_EXTENSION_REQUEST"
            );
        }

        // Notify affected users (bookings that fall in the PROPOSED extended window)
        // — informational only, resource is not actually blocked until admin approves
        if (proposedEndDate != null && resource.getMaintenanceStartDate() != null) {
            List<Booking> potentiallyAffected = bookingRepository.findAll().stream()
                    .filter(b -> b.getResourceId().equals(booking.getResourceId()))
                    .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                    .filter(b -> !b.getId().equals(bookingId))
                    .filter(b -> b.getBookingDate().isAfter(currentEndDate) &&
                            !b.getBookingDate().isAfter(proposedEndDate))
                    .collect(Collectors.toList());

            for (Booking affected : potentiallyAffected) {
                User affectedUser = userRepository.findById(affected.getUserId()).orElse(null);
                if (affectedUser != null) {
                    notificationService.sendNotification(
                            affectedUser.getId(),
                            "ℹ️ Possible Maintenance Extension",
                            String.format(
                                    "A technician has requested a %d-day extension for maintenance of %s " +
                                            "(proposed end: %s). This request is pending admin approval. " +
                                            "Your booking has not been affected yet — check back for updates.",
                                    days, resource.getName(), proposedEndDate),
                            "MAINTENANCE_EXTENSION_PENDING"
                    );
                }
            }
        }

        return mapToDTO(saved, booking, technician);
    }

    @Override
    public List<MaintenanceRequestDTO> getTechnicianRequests(String technicianEmail) {
        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        return maintenanceRequestRepository.findByTechnicianId(technician.getId()).stream()
                .map(req -> {
                    Booking booking = bookingRepository.findById(req.getBookingId()).orElse(null);
                    return mapToDTO(req, booking, technician);
                })
                .collect(Collectors.toList());
    }

    // ─── METHOD 2: updateMaintenanceStatus ───────────────────────────────────────
// FIX: When admin approves an EXTENSION_REQUESTED record, extend the resource
//      end date by the requested days.
//      When admin rejects, reset maintenanceStatus to IN_PROGRESS and leave
//      the resource end date exactly as it was (NOT extended).

    // src/main/java/com/smartcampus/operations/service/impl/MaintenanceServiceImpl.java

    @Override
    @Transactional
    public MaintenanceRequestDTO updateMaintenanceStatus(UUID maintenanceId, MaintenanceActionDTO action, String adminEmail) {
        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findById(maintenanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));

        MaintenanceStatus previousStatus = maintenanceRequest.getMaintenanceStatus();

        // Get booking and resource
        Booking booking = bookingRepository.findById(maintenanceRequest.getBookingId()).orElse(null);
        Resource resource = booking != null
                ? resourceRepository.findById(booking.getResourceId()).orElse(null)
                : null;

        // ── Handle EXTENSION_REQUESTED resolution using explicit flag ──
        boolean wasExtensionRequested = (previousStatus == MaintenanceStatus.EXTENSION_REQUESTED);
        boolean isExtensionApproved = false;
        boolean isExtensionRejected = false;

        if (wasExtensionRequested && action.getStatus() == MaintenanceStatus.IN_PROGRESS) {
            // Use the explicit flag from the frontend
            if (action.getExtensionApproved() != null) {
                isExtensionApproved = action.getExtensionApproved();
                isExtensionRejected = !isExtensionApproved;
                log.info("Extension decision from explicit flag - Approved: {} for maintenance {}",
                        isExtensionApproved, maintenanceId);
            } else {
                // Fallback for backward compatibility (if old clients don't send the flag)
                String notes = action.getNotes() != null ? action.getNotes().toLowerCase() : "";
                isExtensionApproved = notes.contains("approved") || notes.contains("approve");
                isExtensionRejected = notes.contains("rejected") || notes.contains("reject");
                log.warn("No extensionApproved flag provided, falling back to text parsing for maintenance {}",
                        maintenanceId);
            }
        }

        // Update the maintenance request status
        maintenanceRequest.setMaintenanceStatus(action.getStatus());
        maintenanceRequest.setAdminNotes(action.getNotes());
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Maintenance request {} status updated from {} to {} by admin {}",
                maintenanceId, previousStatus, action.getStatus(), adminEmail);

        // ── Execute extension approval/rejection actions ──
        if (wasExtensionRequested && action.getStatus() == MaintenanceStatus.IN_PROGRESS) {
            if (isExtensionApproved && resource != null && maintenanceRequest.getExtensionRequested() != null) {
                // ✅ APPROVE: extend the resource maintenance end date
                int requestedDays = maintenanceRequest.getExtensionRequested();
                LocalDate currentEnd = resource.getMaintenanceEndDate();
                LocalDate newEndDate = currentEnd != null
                        ? currentEnd.plusDays(requestedDays)
                        : LocalDate.now().plusDays(requestedDays);

                resource.setMaintenanceEndDate(newEndDate);
                resourceRepository.save(resource);

                log.info("✅ Extension APPROVED for maintenance {}. Resource {} end date extended from {} to {}.",
                        maintenanceId, resource.getName(), currentEnd, newEndDate);

                // Notify affected users
                if (currentEnd != null) {
                    List<Booking> nowAffected = bookingRepository.findAll().stream()
                            .filter(b -> b.getResourceId().equals(resource.getId()))
                            .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                            .filter(b -> !b.getId().equals(maintenanceRequest.getBookingId()))
                            .filter(b -> b.getBookingDate().isAfter(currentEnd) &&
                                    !b.getBookingDate().isAfter(newEndDate))
                            .collect(Collectors.toList());

                    for (Booking affected : nowAffected) {
                        User affectedUser = userRepository.findById(affected.getUserId()).orElse(null);
                        if (affectedUser != null) {
                            notificationService.sendNotification(
                                    affectedUser.getId(),
                                    "⚠️ Maintenance Extended",
                                    String.format("Maintenance for %s has been extended to %s. " +
                                                    "Your booking on %s at %s–%s may be affected.",
                                            resource.getName(), newEndDate,
                                            affected.getBookingDate(),
                                            affected.getStartTime(), affected.getEndTime()),
                                    "MAINTENANCE_EXTENDED"
                            );
                        }
                    }
                }

            } else if (isExtensionRejected) {
                // ❌ REJECT: do NOT change the resource end date
                log.info("❌ Extension REJECTED for maintenance {}. Resource {} end date unchanged at {}.",
                        maintenanceId, resource != null ? resource.getName() : "?",
                        resource != null ? resource.getMaintenanceEndDate() : "?");
            }
        }

        // ── Handle initial approval of a maintenance booking ──
        if (action.getStatus() == MaintenanceStatus.APPROVED && resource != null && booking != null) {
            resource.setMaintenanceMode(true);
            resource.setMaintenanceStartDate(booking.getBookingDate());
            resource.setMaintenanceEndDate(booking.getBookingDate());
            resource.setMaintenanceReason(maintenanceRequest.getIssueDescription());
            resourceRepository.save(resource);
            handleConflictingBookings(resource, booking);
        }

        // ── Notify technician with CORRECT decision ──
        User technician = userRepository.findById(maintenanceRequest.getTechnicianId()).orElse(null);
        if (technician != null) {
            String notificationTitle;
            String notificationMessage;

            if (previousStatus == MaintenanceStatus.EXTENSION_REQUESTED) {
                if (isExtensionApproved) {
                    notificationTitle = "✅ Extension Approved";
                    notificationMessage = String.format(
                            "Good news! Your extension request has been APPROVED.\n\n" +
                                    "✓ Maintenance end date extended by %d day(s)\n" +
                                    "✓ You can now mark the maintenance as completed when done\n\n" +
                                    "Admin notes: %s",
                            maintenanceRequest.getExtensionRequested(),
                            action.getNotes() != null ? action.getNotes() : "No additional notes");
                } else {
                    notificationTitle = "❌ Extension Rejected";
                    notificationMessage = String.format(
                            "Your extension request has been REJECTED.\n\n" +
                                    "✓ Please complete the maintenance by the original end date\n" +
                                    "✓ Contact admin if you need to discuss further\n\n" +
                                    "Admin notes: %s",
                            action.getNotes() != null ? action.getNotes() : "No reason provided");
                }
            } else {
                notificationTitle = "Maintenance Update";
                notificationMessage = String.format(
                        "Your maintenance request status has been updated to %s.\n\nAdmin notes: %s",
                        action.getStatus(),
                        action.getNotes() != null ? action.getNotes() : "No additional notes");
            }

            notificationService.sendNotification(
                    technician.getId(),
                    notificationTitle,
                    notificationMessage,
                    "MAINTENANCE_UPDATE"
            );
        }

        return mapToDTO(saved, booking, technician);
    }


    @Override
    public List<MaintenanceRequestDTO> getAllMaintenanceRequests() {
        return maintenanceRequestRepository.findAll().stream()
                .map(req -> {
                    Booking booking = bookingRepository.findById(req.getBookingId()).orElse(null);
                    User technician = booking != null
                            ? userRepository.findById(req.getTechnicianId()).orElse(null)
                            : null;
                    return mapToDTO(req, booking, technician);
                })
                .collect(Collectors.toList());
    }

    private void handleConflictingBookings(Resource resource, Booking maintenanceBooking) {
        List<Booking> conflictingBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getResourceId().equals(resource.getId()))
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> !b.getId().equals(maintenanceBooking.getId()))
                .filter(b -> b.getBookingDate().equals(maintenanceBooking.getBookingDate()))
                .collect(Collectors.toList());

        for (Booking conflicting : conflictingBookings) {
            User conflictingUser = userRepository.findById(conflicting.getUserId()).orElse(null);
            if (conflictingUser != null) {
                notificationService.sendNotification(
                        conflictingUser.getId(),
                        "⚠️ Booking Affected by Maintenance",
                        String.format("Your approved booking for %s on %s at %s-%s has been affected by an urgent maintenance request. The resource is now under maintenance. Please contact support or cancel your booking.",
                                resource.getName(), conflicting.getBookingDate(),
                                conflicting.getStartTime(), conflicting.getEndTime()),
                        "MAINTENANCE_AFFECTED"
                );
            }
        }
    }

    private MaintenanceRequestDTO mapToDTO(MaintenanceRequest request, Booking booking, User technician) {
        Resource resource = booking != null ? resourceRepository.findById(booking.getResourceId()).orElse(null) : null;

        return MaintenanceRequestDTO.builder()
                .id(request.getId())
                .bookingId(request.getBookingId())
                .resourceId(booking != null ? booking.getResourceId() : null)
                .resourceName(resource != null ? resource.getName() : null)
                .technicianId(request.getTechnicianId())
                .technicianName(technician != null ? technician.getFullName() : null)
                .issueDescription(request.getIssueDescription())
                .priority(request.getPriority())
                .maintenanceStatus(request.getMaintenanceStatus())
                .startedAt(request.getStartedAt())
                .completedAt(request.getCompletedAt())
                .extensionRequested(request.getExtensionRequested())
                .extensionReason(request.getExtensionReason())
                .adminNotes(request.getAdminNotes())
                .estimatedHours(request.getEstimatedHours())
                .actualHours(request.getActualHours())
                .technicianNotes(request.getTechnicianNotes())
                .bookingDate(booking != null ? booking.getBookingDate() : null)
                .startTime(booking != null ? booking.getStartTime() : null)
                .endTime(booking != null ? booking.getEndTime() : null)
                .build();
    }
}