// src/main/java/com/smartcampus/operations/dto/BookingCreateRequest.java

package com.smartcampus.operations.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BookingCreateRequest {

    @NotNull(message = "Resource ID is required")
    private UUID resourceId;

    @NotNull(message = "Booking date is required")
    private LocalDate bookingDate;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    private String purpose;

    @Min(value = 1, message = "Expected attendees must be at least 1")
    private Integer expectedAttendees;

    // Maintenance fields (for technicians)
    private String bookingType; // REGULAR or MAINTENANCE
    private String issueDescription;
    private String priority; // LOW, MEDIUM, HIGH, CRITICAL
}