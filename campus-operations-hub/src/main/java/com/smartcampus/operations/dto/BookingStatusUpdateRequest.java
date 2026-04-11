// src/main/java/com/smartcampus/operations/dto/BookingStatusUpdateRequest.java
package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.BookingStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class BookingStatusUpdateRequest {

    @NotNull(message = "Status is required")
    private BookingStatus status;

    private String reason;
}