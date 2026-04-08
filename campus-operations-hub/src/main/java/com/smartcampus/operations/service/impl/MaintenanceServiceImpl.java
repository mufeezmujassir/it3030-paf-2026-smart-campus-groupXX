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
        User technician = userRepository.findByEmail(technicianEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Technician not found"));

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));

        // Verify booking is approved and is maintenance type
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingException("Only approved bookings can be started for maintenance");
        }
        if (!"MAINTENANCE".equals(booking.getBookingType())) {
            throw new InvalidBookingException("This is not a maintenance request");
        }

        // Check if maintenance request already exists
        MaintenanceRequest existingRequest = maintenanceRequestRepository.findByBookingId(bookingId).orElse(null);
        MaintenanceRequest maintenanceRequest;

        if (existingRequest == null) {
            // Create new maintenance request
            maintenanceRequest = MaintenanceRequest.builder()
                    .bookingId(bookingId)
                    .technicianId(technician.getId())
                    .issueDescription(booking.getIssueDescription())
                    .priority(booking.getPriority())
                    .maintenanceStatus(MaintenanceStatus.IN_PROGRESS)
                    .startedAt(LocalDateTime.now())
                    .build();
        } else {
            // Update existing request
            maintenanceRequest = existingRequest;
            maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.IN_PROGRESS);
            maintenanceRequest.setStartedAt(LocalDateTime.now());
        }

        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);
        log.info("Maintenance started for booking {} by technician {}", bookingId, technicianEmail);

        // Notify admin
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "🔧 Maintenance Started",
                    String.format("Technician %s has started maintenance for %s",
                            technician.getFullName(), resource != null ? resource.getName() : "Resource"),
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
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Maintenance completed for booking {} by technician {}", bookingId, technicianEmail);

        // Notify admin
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "✅ Maintenance Completed",
                    String.format("Technician %s has completed maintenance for %s",
                            technician.getFullName(), resource != null ? resource.getName() : "Resource"),
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

        maintenanceRequest.setExtensionRequested(days);
        maintenanceRequest.setMaintenanceStatus(MaintenanceStatus.EXTENSION_REQUESTED);
        MaintenanceRequest saved = maintenanceRequestRepository.save(maintenanceRequest);

        log.info("Extension requested for booking {}: {} days by technician {}", bookingId, days, technicianEmail);

        // Notify admins about extension request
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    "🔄 Maintenance Extension Request",
                    String.format("Technician %s requests %d additional days for maintenance of %s",
                            technician.getFullName(), days, resource != null ? resource.getName() : "Resource"),
                    "MAINTENANCE_EXTENSION_REQUEST"
            );
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

        // Notify technician
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
                .adminNotes(request.getAdminNotes())
                .bookingDate(booking != null ? booking.getBookingDate() : null)
                .startTime(booking != null ? booking.getStartTime() : null)
                .endTime(booking != null ? booking.getEndTime() : null)
                .build();
    }
}