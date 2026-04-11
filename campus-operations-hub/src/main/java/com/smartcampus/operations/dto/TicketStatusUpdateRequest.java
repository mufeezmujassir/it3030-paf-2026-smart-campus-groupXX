package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.TicketStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private TicketStatus status;
}