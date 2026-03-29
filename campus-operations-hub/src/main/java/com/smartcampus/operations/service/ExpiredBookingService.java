// Updated ExpiredBookingService with ResourceRepository
package com.smartcampus.operations.service;

import com.smartcampus.operations.entity.Booking;
import com.smartcampus.operations.entity.BookingStatus;
import com.smartcampus.operations.entity.Resource;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.repository.BookingRepository;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpiredBookingService {

    private final BookingRepository bookingRepository;
    private final UserRepository userRepository;
    private final ResourceRepository resourceRepository;
    private final NotificationService notificationService;

    // Run once when application starts to process existing expired bookings
    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void initializeExpiredBookings() {
        log.info("========== INITIALIZING EXPIRED BOOKINGS CHECK ==========");
        processExpiredBookings(true); // true = initial run, will log more details
        log.info("========== INITIAL EXPIRED BOOKINGS CHECK COMPLETE ==========");
    }

    // Run every hour at minute 0
    @Scheduled(cron = "0 0 * * * *")
    @Transactional
    public void checkExpiredPendingBookings() {
        log.info("Checking for expired pending bookings...");
        processExpiredBookings(false);
    }

    private void processExpiredBookings(boolean isInitialRun) {
        LocalDate today = LocalDate.now();
        LocalTime now = LocalTime.now();

        // Find all pending bookings
        List<Booking> pendingBookings = bookingRepository.findByStatus(BookingStatus.PENDING);

        if (isInitialRun) {
            log.info("Found {} pending bookings to check during initialization", pendingBookings.size());
        }

        int expiredCount = 0;
        int expiringSoonCount = 0;

        for (Booking booking : pendingBookings) {
            LocalDate bookingDate = booking.getBookingDate();
            LocalTime bookingStartTime = booking.getStartTime();

            // Check if booking has expired (past date or today with time passed)
            boolean isExpired = bookingDate.isBefore(today) ||
                    (bookingDate.equals(today) && bookingStartTime.isBefore(now));

            if (isExpired) {
                // Auto-reject expired pending bookings
                booking.setStatus(BookingStatus.REJECTED);
                booking.setAdminReason("Auto-rejected: Booking request expired as it was not approved before the scheduled time");
                bookingRepository.save(booking);
                expiredCount++;

                // Notify the user
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

                if (isInitialRun) {
                    log.info("INIT: Auto-rejected expired booking - ID: {}, Resource: {}, Date: {}, Time: {}-{}",
                            booking.getId(), booking.getResourceId(), bookingDate, bookingStartTime, booking.getEndTime());
                } else {
                    log.info("Auto-rejected expired booking: {} for resource {} on {}",
                            booking.getId(), booking.getResourceId(), bookingDate);
                }
            }
            // Check for bookings expiring in the next hour
            else if (bookingDate.equals(today) &&
                    bookingStartTime.isAfter(now) &&
                    bookingStartTime.minusHours(1).isBefore(now)) {
                expiringSoonCount++;

                // Notify all admins about expiring pending booking
                notifyAdminsAboutExpiringBooking(booking, isInitialRun);
            }
        }

        if (expiredCount > 0 || expiringSoonCount > 0) {
            if (isInitialRun) {
                log.info("INITIALIZATION: Processed {} expired bookings and found {} bookings expiring soon",
                        expiredCount, expiringSoonCount);
            } else {
                log.info("Processed {} expired bookings and notified about {} expiring soon bookings",
                        expiredCount, expiringSoonCount);
            }
        } else if (isInitialRun) {
            log.info("No expired pending bookings found during initialization");
        }
    }

    private void notifyAdminsAboutExpiringBooking(Booking booking, boolean isInitialRun) {
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        String resourceName = getResourceName(booking.getResourceId());

        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "⚠️ Urgent: Booking Pending Approval",
                    String.format("Booking request for %s on %s at %s-%s is pending approval and expires in less than 1 hour!",
                            resourceName, booking.getBookingDate(),
                            booking.getStartTime(), booking.getEndTime()),
                    "BOOKING_EXPIRING_SOON"
            );
        }

        if (isInitialRun) {
            log.info("INIT: Found expiring soon booking - Resource: {}, Date: {}, Time: {}-{}",
                    resourceName, booking.getBookingDate(),
                    booking.getStartTime(), booking.getEndTime());
        } else {
            log.info("Notified {} admins about expiring booking: {}", admins.size(), booking.getId());
        }
    }

    private String getResourceName(UUID resourceId) {
        return resourceRepository.findById(resourceId)
                .map(Resource::getName)
                .orElse(resourceId.toString().substring(0, 8));
    }
}