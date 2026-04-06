// src/main/java/com/smartcampus/operations/dto/BookingUpdateRequest.java
package com.smartcampus.operations.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingUpdateRequest {

    @NotBlank(message = "Purpose is required")
    private String purpose;

    private Integer expectedAttendees;
}