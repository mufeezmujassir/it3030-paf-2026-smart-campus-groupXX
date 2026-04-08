// src/main/java/com/smartcampus/operations/service/impl/MaintenanceServiceImpl.java
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
        System.out.println("MaintenanceServiceImpl.startMaintenance called for booking: " + bookingId);

        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        System.out.println("Found booking - ID: " + booking.getId() +
                ", Status: " + booking.getStatus() +
                ", Type: " + booking.getBookingType());

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingException("Only approved bookings can be started for maintenance. Current status: " + booking.getStatus());
        }
        if (!"MAINTENANCE".equals(booking.getBookingType())) {
            throw new InvalidBookingException("This is not a maintenance request. Booking type: " + booking.getBookingType());
        }

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found"));

        // Create maintenance request if it doesn't exist
        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findByBookingId(bookingId).orElse(null);

        if (maintenanceRequest == null) {
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
            maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.IN_PROGRESS);
            maintenanceRequest.setStartedAt(LocalDateTime.now());
        }

        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);
        System.out.println("Maintenance request saved with ID: " + saved.getId() + ", Status: " + saved.getMaintenanceStatus());

        // Put resource into maintenance mode
        resource.setMaintenanceMode(true);
        resource.setMaintenanceStartDate(booking.getBookingDate());
        resource.setMaintenanceEndDate(booking.getBookingDate());
        resource.setMaintenanceReason(booking.getIssueDescription());
        resourceRepository.save(resource);

        log.info("Maintenance started for booking {} by technician {}, resource {} put into maintenance mode",
                bookingId, technicianEmail, resource.getName());

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
        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        MaintenanceRequest maintenanceRequest = maintenanceRequestRepository.findByBookingId(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Maintenance request not found"));

        if (maintenanceRequest.getMaintenanceStatus() != MaintenanceStatus.IN_PROGRESS) {
            throw new InvalidBookingException("Only maintenance in progress can be marked as completed");
        }

        maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.COMPLETED);
        maintenanceRequest.setCompletedAt(LocalDateTime.now());

        // Calculate actual hours if estimated hours were set
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

        log.info("Maintenance completed for booking {} by technician {}, resource {} taken out of maintenance mode",
                bookingId, technicianEmail, resource.getName());

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