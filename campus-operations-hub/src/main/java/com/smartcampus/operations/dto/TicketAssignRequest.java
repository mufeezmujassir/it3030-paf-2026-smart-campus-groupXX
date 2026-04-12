package com.smartcampus.operations.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class TicketAssignRequest {

    @NotNull(message = "Technician ID is required")
    private UUID technicianId;
}