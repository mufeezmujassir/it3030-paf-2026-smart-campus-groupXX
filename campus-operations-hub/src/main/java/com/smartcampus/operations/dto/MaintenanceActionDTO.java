// src/main/java/com/smartcampus/operations/dto/MaintenanceActionDTO.java
package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.MaintenanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class MaintenanceActionDTO {
    @NotNull(message = "Status is required")
    private MaintenanceStatus status;

    private String notes;
}