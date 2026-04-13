package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.TicketCategory;
import com.smartcampus.operations.entity.TicketPriority;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class TicketCreateRequest {

    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 200, message = "Title must be between 5 and 200 characters")
    private String title;

    @NotNull(message = "Category is required")
    private TicketCategory category;

    @NotBlank(message = "Description is required")
    @Size(min = 20, max = 2000, message = "Description must be between 20 and 2000 characters")
    private String description;

    @NotNull(message = "Priority is required")
    private TicketPriority priority;

    @NotBlank(message = "Resource location is required")
    @Size(min = 3, max = 200, message = "Location must be between 3 and 200 characters")
    private String resourceLocation;

    @Pattern(regexp = "^[0-9]{10}$", message = "Please enter a valid 10-digit phone number")
    private String preferredContact;
}