// src/main/java/com/smartcampus/operations/dto/BookingResponse.java
package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BookingResponse {
    private UUID id;
    private UUID resourceId;
    private String resourceName;
    private UUID userId;
    private String userFullName;
    private String userEmail;
    private LocalDate bookingDate;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private Integer expectedAttendees;
    private BookingStatus status;
    private String adminReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}