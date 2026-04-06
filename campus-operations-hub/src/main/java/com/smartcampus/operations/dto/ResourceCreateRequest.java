package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.ResourceStatus;
import com.smartcampus.operations.entity.ResourceType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class ResourceCreateRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotNull(message = "Type is required")
    private ResourceType type;

    private String subtype;

    @Min(value = 0, message = "Capacity cannot be negative")
    private Integer capacity;

    @NotBlank(message = "Location is required")
    private String location;

    @NotNull(message = "Status is required")
    private ResourceStatus status;


    private UUID imageId;
}
