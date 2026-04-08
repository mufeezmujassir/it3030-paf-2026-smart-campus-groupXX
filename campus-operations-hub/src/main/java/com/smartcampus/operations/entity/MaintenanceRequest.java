// src/main/java/com/smartcampus/operations/entity/MaintenanceRequest.java
package com.smartcampus.operations.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "maintenance_requests")
public class MaintenanceRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "booking_id", nullable = false)
    private UUID bookingId;

    @Column(name = "technician_id", nullable = false)
    private UUID technicianId;

    @Column(name = "issue_description", length = 1000)
    private String issueDescription;

    @Column(length = 50)
    private String priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private MaintenanceStatus maintenanceStatus;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "extension_requested")
    private Integer extensionRequested;

    @Column(name = "extension_reason", length = 500)
    private String extensionReason;

    @Column(name = "admin_notes", length = 500)
    private String adminNotes;

    @Column(name = "estimated_hours")
    private Integer estimatedHours;

    @Column(name = "actual_hours")
    private Integer actualHours;

    @Column(name = "technician_notes", length = 500)
    private String technicianNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (maintenanceStatus == null) {
            maintenanceStatus = MaintenanceStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}