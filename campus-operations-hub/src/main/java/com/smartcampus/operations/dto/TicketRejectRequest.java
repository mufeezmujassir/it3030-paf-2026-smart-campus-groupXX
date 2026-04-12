package com.smartcampus.operations.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketRejectRequest {

    @NotBlank(message = "Rejection reason is required")
    private String reason;
}