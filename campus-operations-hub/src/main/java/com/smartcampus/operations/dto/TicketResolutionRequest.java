package com.smartcampus.operations.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketResolutionRequest {

    @NotBlank(message = "Resolution notes are required")
    private String resolutionNotes;
}