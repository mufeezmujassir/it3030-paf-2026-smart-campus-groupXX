package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.ResourceStatus;
import com.smartcampus.operations.entity.ResourceType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResourceResponse {
    private UUID id;
    private String name;
    private ResourceType type;
    private String subtype;
    private Integer capacity;
    private String location;
    private ResourceStatus status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String imageUrl;

    // In ResourceResponse.java — ensure these fields exist:
    private Boolean maintenanceMode;
    private LocalDate maintenanceStartDate;
    private LocalDate maintenanceEndDate;
    private String maintenanceReason;
}
