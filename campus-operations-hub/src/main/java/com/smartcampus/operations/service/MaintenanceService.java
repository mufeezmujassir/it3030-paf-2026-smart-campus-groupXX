// src/main/java/com/smartcampus/operations/service/MaintenanceService.java

package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.MaintenanceActionDTO;
import com.smartcampus.operations.dto.MaintenanceRequestDTO;

import java.util.List;
import java.util.UUID;

public interface MaintenanceService {
    MaintenanceRequestDTO startMaintenance(UUID bookingId, String technicianEmail);
    MaintenanceRequestDTO completeMaintenance(UUID bookingId, String technicianEmail);
    MaintenanceRequestDTO requestExtension(UUID bookingId, int days, String technicianEmail);
    List<MaintenanceRequestDTO> getTechnicianRequests(String technicianEmail);
    MaintenanceRequestDTO updateMaintenanceStatus(UUID maintenanceId, MaintenanceActionDTO action, String adminEmail);
    void cancelMaintenanceRequest(UUID bookingId, String technicianEmail);  // Add this
}