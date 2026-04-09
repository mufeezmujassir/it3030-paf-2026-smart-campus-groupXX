// src/main/java/com/smartcampus/operations/dto/AvailableTimeSlotsResponse.java
package com.smartcampus.operations.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.smartcampus.operations.entity.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AvailableTimeSlotsResponse {
    private List<TimeSlot> availableSlots;
    private List<BookedSlot> bookedSlots;

    // Jackson strips the "is" prefix from primitive boolean fields (isXxx -> xxx).
    // @JsonProperty forces the exact key name "isUnderMaintenance" in the JSON response
    // so the frontend can read it reliably.
    @JsonProperty("isUnderMaintenance")
    private boolean isUnderMaintenance;

    private String maintenanceReason;
    private LocalDate maintenanceEndDate;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class TimeSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private boolean available;
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class BookedSlot {
        private LocalTime startTime;
        private LocalTime endTime;
        private BookingStatus status;
    }
}