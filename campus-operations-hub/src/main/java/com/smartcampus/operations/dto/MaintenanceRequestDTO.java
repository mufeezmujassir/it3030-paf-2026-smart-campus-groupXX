// src/main/java/com/smartcampus/operations/dto/MaintenanceRequestDTO.java
package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.MaintenanceStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MaintenanceRequestDTO {
    private UUID id;
    private UUID bookingId;
    private UUID resourceId;
    private String resourceName;
    private UUID technicianId;
    private String technicianName;
    private String issueDescription;
    private String priority;
    private MaintenanceStatus maintenanceStatus;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;
    private Integer extensionRequested;
    private String extensionReason;
    private String adminNotes;
    private Integer estimatedHours;
    private Integer actualHours;
    private String technicianNotes;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
}