// src/main/java/com/smartcampus/operations/controller/MaintenanceController.java
package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.MaintenanceActionDTO;
import com.smartcampus.operations.dto.MaintenanceRequestDTO;
import com.smartcampus.operations.service.MaintenanceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/maintenance")
@RequiredArgsConstructor
public class MaintenanceController {

    private final MaintenanceService maintenanceService;

    // Start maintenance (technician)
    @PostMapping("/{bookingId}/start-maintenance")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<MaintenanceRequestDTO> startMaintenance(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal UserDetails userDetails) {
        MaintenanceRequestDTO response = maintenanceService.startMaintenance(bookingId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // Complete maintenance (technician)
    @PostMapping("/{bookingId}/complete-maintenance")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<MaintenanceRequestDTO> completeMaintenance(
            @PathVariable UUID bookingId,
            @AuthenticationPrincipal UserDetails userDetails) {
        MaintenanceRequestDTO response = maintenanceService.completeMaintenance(bookingId, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // Request extension (technician)
    @PostMapping("/{bookingId}/request-extension")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<MaintenanceRequestDTO> requestExtension(
            @PathVariable UUID bookingId,
            @RequestParam int days,
            @AuthenticationPrincipal UserDetails userDetails) {
        MaintenanceRequestDTO response = maintenanceService.requestExtension(bookingId, days, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // Get technician's maintenance requests
    @GetMapping("/my-requests")
    @PreAuthorize("hasRole('TECHNICIAN')")
    public ResponseEntity<List<MaintenanceRequestDTO>> getMyMaintenanceRequests(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<MaintenanceRequestDTO> response = maintenanceService.getTechnicianRequests(userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    // Update maintenance status (admin)
    @PatchMapping("/admin/{maintenanceId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<MaintenanceRequestDTO> updateMaintenanceStatus(
            @PathVariable UUID maintenanceId,
            @Valid @RequestBody MaintenanceActionDTO action,
            @AuthenticationPrincipal UserDetails userDetails) {
        MaintenanceRequestDTO response = maintenanceService.updateMaintenanceStatus(maintenanceId, action, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }
}