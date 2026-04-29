// Updated ExpiredBookingService.java
package com.smartcampus.operations.service;

import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.repository.*;
import com.smartcampus.operations.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpiredBookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final MaintenanceRequestRepository maintenanceRequestRepository;
    private final NotificationService notificationService;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeExpiredBookings() {
        log.info("========== INITIALIZING EXPIRED BOOKINGS CHECK ==========");
        processExpiredBookings(true);
        processExpiredMaintenanceBookings(true);
        processUnansweredExtensionRequests();
        log.info("========== INITIAL EXPIRED BOOKINGS CHECK COMPLETE ==========");
    }

    // More responsive — runs every 15 minutes
    @Scheduled(cron = "0 */15 * * * *")
    @Transactional
    public void checkExpiredPendingBookings() {
        log.info("Checking for expired bookings...");
        processExpiredBookings(false);
        processExpiredMaintenanceBookings(false);
        processUnansweredExtensionRequests();
    }

    // ── Existing: auto-reject PENDING bookings that have passed ──────────
    private void processExpiredBookings(boolean isInitialRun) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        List<Booking> pendingBookings = bookingRepository.findByStatus(BookingStatus.PENDING);

        if (isInitialRun) {
            log.info("Found {} pending bookings to check", pendingBookings.size());
        }

        int expiredCount = 0;

        for (Booking booking : pendingBookings) {
            LocalDate bookingDate = booking.getBookingDate();
            LocalTime bookingStartTime = booking.getStartTime();

            boolean isExpired = bookingDate.isBefore(today) ||
                    (bookingDate.equals(today) && bookingStartTime.isBefore(now));

            if (isExpired) {
                booking.setStatus(BookingStatus.REJECTED);
                booking.setAdminReason("Auto-rejected: Booking request expired as it was not approved before the scheduled time");
                bookingRepository.save(booking);
                expiredCount++;

                User user = userRepository.findById(booking.getUserId()).orElse(null);
                if (user != null) {
                    String resourceName = getResourceName(booking.getResourceId());
                    notificationService.sendNotification(
                            user.getId(),
                            "Booking Expired",
                            String.format("Your booking request for %s on %s at %s-%s has expired because it was not approved before the scheduled time.",
                                    resourceName, bookingDate, bookingStartTime, booking.getEndTime()),
                            "BOOKING_EXPIRED"
                    );
                }
            }
        }

        if (expiredCount > 0) {
            log.info("Auto-rejected {} expired pending bookings", expiredCount);
        }
    }

    // ── NEW: auto-cancel APPROVED maintenance bookings where technician
    //         never started within the grace window (startTime + 30 min) ──
    private void processExpiredMaintenanceBookings(boolean isInitialRun) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // Find all APPROVED maintenance bookings
        List<Booking> approvedMaintenanceBookings = bookingRepository
                .findByStatusAndBookingType(BookingStatus.APPROVED, "MAINTENANCE");

        if (isInitialRun) {
            log.info("Found {} approved maintenance bookings to check", approvedMaintenanceBookings.size());
        }

        int expiredCount = 0;

        for (Booking booking : approvedMaintenanceBookings) {
            LocalDate bookingDate = booking.getBookingDate();
            LocalTime startTime = booking.getStartTime();

            // Grace window ends 30 minutes after scheduled start
            LocalTime graceWindowEnd = startTime.plusMinutes(30);

            // Check if the grace window has passed
            boolean graceWindowPassed = bookingDate.isBefore(today) ||
                    (bookingDate.equals(today) && graceWindowEnd.isBefore(now));

            if (!graceWindowPassed) continue;

            // Check if a maintenance request was actually started
            Optional<MaintenanceRequest> mrOpt = maintenanceRequestRepository
                    .findByBookingId(booking.getId());

            boolean wasStarted = mrOpt.isPresent() &&
                    (mrOpt.get().getMaintenanceStatus() == MaintenanceStatus.IN_PROGRESS ||
                            mrOpt.get().getMaintenanceStatus() == MaintenanceStatus.COMPLETED ||
                            mrOpt.get().getMaintenanceStatus() == MaintenanceStatus.EXTENSION_REQUESTED);

            if (wasStarted) continue; // Technician did start — leave it alone

            // Technician never started — auto-cancel the booking
            booking.setStatus(BookingStatus.CANCELLED);
            booking.setAdminReason(
                    "Auto-cancelled: Maintenance was not started within the scheduled time window. " +
                            "The start window closed at " + graceWindowEnd + " on " + bookingDate + "."
            );
            bookingRepository.save(booking);
            expiredCount++;

            // If a maintenance record exists but was never started, mark it cancelled too
            if (mrOpt.isPresent()) {
                MaintenanceRequest mr = mrOpt.get();
                mr.setMaintenanceStatus(MaintenanceStatus.REJECTED);
                mr.setAdminNotes("Auto-cancelled: Technician did not start maintenance within the scheduled window.");
                maintenanceRequestRepository.save(mr);
            }

            // Free the resource from maintenance mode if it was set
            Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
            if (resource != null && Boolean.TRUE.equals(resource.getMaintenanceMode()) &&
                    booking.getBookingDate().equals(resource.getMaintenanceStartDate())) {
                resource.setMaintenanceMode(false);
                resource.setMaintenanceStartDate(null);
                resource.setMaintenanceEndDate(null);
                resource.setMaintenanceReason(null);
                resourceRepository.save(resource);
                log.info("Freed resource {} from maintenance mode (technician did not start)", resource.getName());
            }

            // Notify the technician
            User technician = userRepository.findById(booking.getUserId()).orElse(null);
            if (technician != null) {
                String resourceName = getResourceName(booking.getResourceId());
                notificationService.sendNotification(
                        technician.getId(),
                        "Maintenance Booking Expired",
                        String.format(
                                "Your approved maintenance booking for %s on %s at %s-%s has been automatically cancelled " +
                                        "because maintenance was not started within the allowed window (by %s). " +
                                        "Please submit a new maintenance request if the issue still needs attention.",
                                resourceName, bookingDate, startTime, booking.getEndTime(), graceWindowEnd),
                        "MAINTENANCE_EXPIRED"
                );
            }

            // Notify admins
            List<User> admins = userRepository.findByRole(Role.ADMIN);
            for (User admin : admins) {
                String resourceName = getResourceName(booking.getResourceId());
                notificationService.sendNotification(
                        admin.getId(),
                        "⚠️ Maintenance Not Started — Auto-Cancelled",
                        String.format(
                                "The approved maintenance booking for %s on %s at %s-%s was automatically cancelled " +
                                        "because the technician did not start maintenance within the allowed window.",
                                resourceName, bookingDate, startTime, booking.getEndTime()),
                        "MAINTENANCE_EXPIRED"
                );
            }

            log.info("Auto-cancelled expired maintenance booking {} — technician did not start within window",
                    booking.getId());
        }

        if (expiredCount > 0) {
            log.info("Auto-cancelled {} expired approved maintenance bookings", expiredCount);
        }
    }

    private String getResourceName(UUID resourceId) {
        return resourceRepository.findById(resourceId)
                .map(Resource::getName)
                .orElse(resourceId.toString().substring(0, 8));
    }

    /**
     * Auto-cancel maintenance requests where admin never responded to extension request
     */
    private void processUnansweredExtensionRequests() {
        // Find all extension requests pending admin approval
        List<MaintenanceRequest> pendingExtensions = maintenanceRequestRepository
                .findByMaintenanceStatus(MaintenanceStatus.EXTENSION_REQUESTED);

        if (pendingExtensions.isEmpty()) {
            return;
        }

        // Timeout: 3 days without admin response
        LocalDateTime threeDaysAgo = LocalDateTime.now().minusDays(3);
        int autoCancelledCount = 0;

        for (MaintenanceRequest mr : pendingExtensions) {
            // Check if this request has been waiting too long
            if (mr.getUpdatedAt() != null && mr.getUpdatedAt().isBefore(threeDaysAgo)) {

                // Get the associated booking
                Booking booking = bookingRepository.findById(mr.getBookingId()).orElse(null);
                if (booking == null) continue;

                // Get the resource
                Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
                if (resource == null) continue;

                log.warn("Auto-cancelling unanswered extension request for maintenance {} - waiting since {}",
                        mr.getId(), mr.getUpdatedAt());

                // 1. Cancel the booking
                booking.setStatus(BookingStatus.CANCELLED);
                booking.setAdminReason(String.format(
                        "Auto-cancelled: Extension request was not reviewed by admin within 3 days. " +
                                "Request submitted on %s. Please submit a new maintenance request if still needed.",
                        mr.getUpdatedAt().toLocalDate()));
                bookingRepository.save(booking);

                // 2. Mark maintenance request as REJECTED
                mr.setMaintenanceStatus(MaintenanceStatus.REJECTED);
                mr.setAdminNotes(String.format(
                        "Auto-rejected: Extension request unanswered for 3 days. " +
                                "Requested: %d day(s) extension. Reason: %s",
                        mr.getExtensionRequested(),
                        mr.getExtensionReason() != null ? mr.getExtensionReason() : "No reason provided"));
                maintenanceRequestRepository.save(mr);

                // 3. Free the resource from maintenance mode
                if (resource.getMaintenanceMode() != null && resource.getMaintenanceMode()) {
                    resource.setMaintenanceMode(false);
                    resource.setMaintenanceStartDate(null);
                    resource.setMaintenanceEndDate(null);
                    resource.setMaintenanceReason(null);
                    resourceRepository.save(resource);
                    log.info("Freed resource {} from maintenance mode due to unanswered extension request",
                            resource.getName());
                }

                autoCancelledCount++;

                // 4. Notify the technician
                User technician = userRepository.findById(mr.getTechnicianId()).orElse(null);
                if (technician != null) {
                    notificationService.sendNotification(
                            technician.getId(),
                            "⚠️ Maintenance Auto-Cancelled - No Admin Response",
                            String.format(
                                    "Your extension request for %s has been auto-cancelled because no admin responded within 3 days.\n\n" +
                                            "• Requested: %d day extension\n" +
                                            "• Resource has been taken out of maintenance mode\n" +
                                            "• Please submit a new maintenance request if the issue still needs attention",
                                    resource.getName(),
                                    mr.getExtensionRequested()),
                            "MAINTENANCE_AUTO_CANCELLED"
                    );
                }

                // 5. Notify admins about the auto-cancellation
                List<User> admins = userRepository.findByRole(Role.ADMIN);
                for (User admin : admins) {
                    notificationService.sendNotification(
                            admin.getId(),
                            "⚠️ Extension Request Auto-Cancelled (No Response)",
                            String.format(
                                    "An extension request for %s was auto-cancelled because no admin responded within 3 days.\n\n" +
                                            "• Technician: %s\n" +
                                            "• Requested: %d days\n" +
                                            "• Resource has been freed\n\n" +
                                            "Please review unanswered extension requests regularly to avoid this.",
                                    resource.getName(),
                                    technician != null ? technician.getFullName() : "Unknown",
                                    mr.getExtensionRequested()),
                            "ADMIN_EXTENSION_TIMEOUT"
                    );
                }
            }
        }

        if (autoCancelledCount > 0) {
            log.info("Auto-cancelled {} maintenance requests due to unanswered extension requests", autoCancelledCount);
        }
    }
}