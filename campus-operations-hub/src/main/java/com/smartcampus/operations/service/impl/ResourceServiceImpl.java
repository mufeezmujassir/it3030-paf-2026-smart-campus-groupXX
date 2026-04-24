package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.ResourceCreateRequest;
import com.smartcampus.operations.dto.ResourceResponse;
import com.smartcampus.operations.dto.ResourceUpdateRequest;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.InvalidBookingException;
import com.smartcampus.operations.exception.ResourceNotFoundException;
import com.smartcampus.operations.mapper.ResourceMapper;
import com.smartcampus.operations.repository.BookingRepository;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.ResourceSpecification;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.NotificationService;
import com.smartcampus.operations.service.ResourceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceServiceImpl implements ResourceService {

    private final ResourceRepository resourceRepository;
    private final ResourceMapper resourceMapper;
    private final NotificationService notificationService;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;

    @Override
    @Transactional
    public ResourceResponse createResource(ResourceCreateRequest request, String userEmail) {
        Resource resource = resourceMapper.toEntity(request);
        resource.setImageId(request.getImageId());
        Resource saved = resourceRepository.save(resource);
        log.info("Resource created: {}", saved.getName());

        User admin = userRepository.findByEmail(userEmail).orElse(null);
        if (admin != null) {
            notificationService.sendNotification(
                    admin.getId(),
                    "Resource Created",
                    String.format("Resource '%s' has been created successfully.", saved.getName()),
                    "RESOURCE_CREATED"
            );
        }

        return resourceMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public ResourceResponse updateResource(UUID id, ResourceUpdateRequest request, String userEmail) {
        Resource existing = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        // ── Guard: block INACTIVE if future approved bookings exist ──
        if (request.getStatus() == ResourceStatus.OUT_OF_SERVICE
                && existing.getStatus() != ResourceStatus.OUT_OF_SERVICE) {

            LocalDate today = LocalDate.now();

            List<Booking> conflicts = bookingRepository.findByStatus(BookingStatus.APPROVED)
                    .stream()
                    .filter(b -> b.getResourceId().equals(id))
                    .filter(b -> !b.getBookingDate().isBefore(today))
                    .toList();

            if (!conflicts.isEmpty()) {
                String conflictDates = conflicts.stream()
                        .map(b -> b.getBookingDate() + " at " + b.getStartTime() + "–" + b.getEndTime())
                        .sorted()
                        .limit(5)
                        .collect(Collectors.joining(", "));

                throw new InvalidBookingException(String.format(
                        "Cannot set resource to out of service — there are %d approved booking(s) on or after today: %s%s. " +
                                "Please cancel or reject those bookings first.",
                        conflicts.size(),
                        conflictDates,
                        conflicts.size() > 5 ? ", and more..." : ""
                ));
            }

            // Auto-reject any pending bookings
            rejectPendingBookingsForResource(
                    id,
                    existing.getName(),
                    "the resource has been taken out of service"
            );
        }
        // ── End guard ──

        existing.setName(request.getName());
        existing.setType(request.getType());
        existing.setSubtype(request.getSubtype());
        existing.setCapacity(request.getCapacity());
        existing.setLocation(request.getLocation());
        existing.setStatus(request.getStatus());
        if (request.getImageId() != null) {
            existing.setImageId(request.getImageId());
        }

        Resource updated = resourceRepository.save(existing);
        log.info("Resource updated: {}", updated.getId());

        User admin = userRepository.findByEmail(userEmail).orElse(null);
        if (admin != null) {
            notificationService.sendNotification(
                    admin.getId(),
                    "Resource Updated",
                    String.format("Resource '%s' has been updated successfully.", updated.getName()),
                    "RESOURCE_UPDATED"
            );
        }

        return resourceMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteResource(UUID id, String userEmail) {
        Resource resource = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));

        // ── Guard: block deletion if future approved bookings exist ──
        LocalDate today = LocalDate.now();

        List<Booking> conflicts = bookingRepository.findByStatus(BookingStatus.APPROVED)
                .stream()
                .filter(b -> b.getResourceId().equals(id))
                .filter(b -> !b.getBookingDate().isBefore(today))
                .toList();

        if (!conflicts.isEmpty()) {
            String conflictDates = conflicts.stream()
                    .map(b -> b.getBookingDate() + " at " + b.getStartTime() + "–" + b.getEndTime())
                    .sorted()
                    .limit(5)
                    .collect(Collectors.joining(", "));

            throw new InvalidBookingException(String.format(
                    "Cannot delete resource — there are %d approved booking(s) on or after today: %s%s. " +
                            "Please cancel or reject those bookings first.",
                    conflicts.size(),
                    conflictDates,
                    conflicts.size() > 5 ? ", and more..." : ""
            ));
        }

        // Auto-reject any pending bookings before deletion
        rejectPendingBookingsForResource(
                id,
                resource.getName(),
                "the resource has been deleted"
        );
        // ── End guard ──

        String resourceName = resource.getName();
        resourceRepository.deleteById(id);
        log.info("Resource deleted: {}", id);

        User admin = userRepository.findByEmail(userEmail).orElse(null);
        if (admin != null) {
            notificationService.sendNotification(
                    admin.getId(),
                    "Resource Deleted",
                    String.format("Resource '%s' has been deleted successfully.", resourceName),
                    "RESOURCE_DELETED"
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ResourceResponse getResourceById(UUID id) {
        Resource r = resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
        return resourceMapper.toResponse(r);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<ResourceResponse> getAllResources(String type, String subtype, Integer minCapacity, Integer maxCapacity, String location, String status, String keyword, Pageable pageable) {
        var spec = ResourceSpecification.build(type, subtype, minCapacity, maxCapacity, location, status, keyword);
        return resourceRepository.findAll(spec, pageable).map(resourceMapper::toResponse);
    }

    // ── Private helper: auto-reject pending bookings and notify users ──
    private void rejectPendingBookingsForResource(UUID resourceId, String resourceName, String reason) {
        LocalDate today = LocalDate.now();

        List<Booking> pendingConflicts = bookingRepository.findByStatus(BookingStatus.PENDING)
                .stream()
                .filter(b -> b.getResourceId().equals(resourceId))
                .filter(b -> !b.getBookingDate().isBefore(today))
                .toList();

        for (Booking booking : pendingConflicts) {
            booking.setStatus(BookingStatus.REJECTED);
            booking.setAdminReason(reason);
            bookingRepository.save(booking);

            User affectedUser = userRepository.findById(booking.getUserId()).orElse(null);
            if (affectedUser != null) {
                notificationService.sendNotification(
                        affectedUser.getId(),
                        "Booking Request Cancelled",
                        String.format("Your pending booking request for %s on %s at %s–%s has been cancelled because %s.",
                                resourceName,
                                booking.getBookingDate(),
                                booking.getStartTime(),
                                booking.getEndTime(),
                                reason),
                        "BOOKING_REJECTED"
                );
            }

            log.info("Auto-rejected pending booking {} for resource {} — reason: {}",
                    booking.getId(), resourceName, reason);
        }

        if (!pendingConflicts.isEmpty()) {
            log.info("Auto-rejected {} pending booking(s) for resource {} due to: {}",
                    pendingConflicts.size(), resourceName, reason);
        }
    }

}
