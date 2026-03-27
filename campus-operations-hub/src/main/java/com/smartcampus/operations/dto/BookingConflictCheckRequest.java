// src/main/java/com/smartcampus/operations/dto/BookingConflictCheckRequest.java
package com.smartcampus.operations.dto;

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
public class BookingConflictCheckRequest {
    private UUID resourceId;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
}