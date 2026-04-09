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

    @Override
    @Transactional
    public MaintenanceRequestDTO requestExtension(UUID bookingId, int days, String technicianEmail) {
        log.info("MaintenanceServiceImpl.requestExtension called for booking: {}, days: {}", bookingId, days);

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

        LocalDate newEndDate = resource.getMaintenanceEndDate().plusDays(days);
        resource.setMaintenanceEndDate(newEndDate);
        resourceRepository.save(resource);

        maintenanceRequest.setExtensionRequested(days);
        maintenanceRequest.setExtensionReason("Technician requested " + days + " day extension");
        maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.EXTENSION_REQUESTED);
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Extension requested for booking {}: {} days by technician {}, maintenance extended to {}",
                bookingId, days, technicianEmail, newEndDate);

        // Notify admins
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "🔄 Maintenance Extension Request",
                    String.format("Technician %s requests %d additional days for maintenance of %s. New end date: %s",
                            technician.getFullName(), days, resource.getName(), newEndDate),
                    "MAINTENANCE_EXTENSION_REQUEST"
            );
        }

        // Notify affected users about extended maintenance
        List<Booking> affectedBookings = bookingRepository.findAll().stream()
                .filter(b -> b.getResourceId().equals(booking.getResourceId()))
                .filter(b -> b.getStatus() == BookingStatus.APPROVED)
                .filter(b -> !b.getId().equals(bookingId))
                .filter(b -> b.getBookingDate().isAfter(resource.getMaintenanceStartDate()) &&
                        b.getBookingDate().isBefore(newEndDate))
                .collect(Collectors.toList());

        for (Booking affected : affectedBookings) {
            User affectedUser = userRepository.findById(affected.getUserId()).orElse(null);
            if (affectedUser != null) {
                notificationService.sendNotification(
                        affectedUser.getId(),
                        "⚠️ Maintenance Extended",
                        String.format("Maintenance for %s has been extended to %s. Please check your bookings.",
                                resource.getName(), newEndDate),
                        "MAINTENANCE_EXTENDED"
                );
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

    @Override
    @Transactional
    public MaintenanceRequestDTO updateMaintenanceStatus(UUID maintenanceId, MaintenanceActionDTO action, String adminEmail) {
        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findById(maintenanceId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));

        maintenanceRequest.setMaintenanceStatus(action.getStatus());
        maintenanceRequest.setAdminNotes(action.getNotes());
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Maintenance request {} status updated to {} by admin {}",
                maintenanceId, action.getStatus(), adminEmail);

        if (action.getStatus() == MaintenanceStatus.APPROVED) {
            Booking booking = bookingRepository.findById(maintenanceRequest.getBookingId()).orElse(null);
            if (booking != null) {
                Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
                if (resource != null) {
                    resource.setMaintenanceMode(true);
                    resource.setMaintenanceStartDate(booking.getBookingDate());
                    resource.setMaintenanceEndDate(booking.getBookingDate());
                    resource.setMaintenanceReason(maintenanceRequest.getIssueDescription());
                    resourceRepository.save(resource);
                    handleConflictingBookings(resource, booking);
                }
            }
        }

        User technician = userRepository.findById(maintenanceRequest.getTechnicianId()).orElse(null);
        if (technician != null) {
            notificationService.sendNotification(
                    technician.getId(),
                    "Maintenance Update",
                    String.format("Your maintenance request has been updated to %s. Notes: %s",
                            action.getStatus(), action.getNotes()),
                    "MAINTENANCE_UPDATE"
            );
        }

        Booking booking = bookingRepository.findById(maintenanceRequest.getBookingId()).orElse(null);
        return mapToDTO(saved, booking, technician);
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