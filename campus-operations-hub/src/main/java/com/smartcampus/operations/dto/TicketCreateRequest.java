package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.TicketCategory;
import com.smartcampus.operations.entity.TicketPriority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketCreateRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotNull(message = "Category is required")
    private TicketCategory category;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Priority is required")
    private TicketPriority priority;

    @NotBlank(message = "Resource location is required")
    private String resourceLocation;

    private String preferredContact;
}