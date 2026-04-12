// src/main/java/com/smartcampus/operations/service/BookingService.java
package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public interface BookingService {

    BookingResponse createBooking(BookingCreateRequest request, String userEmail);

    BookingResponse updateBookingStatus(UUID bookingId, BookingStatusUpdateRequest request, String adminEmail);

    BookingResponse cancelBooking(UUID bookingId, String userEmail);

    // Updated method signature with 3 parameters
    Page<BookingResponse> getUserBookings(String userEmail, String status, String bookingType, Pageable pageable);

    Page<BookingResponse> getAllBookings(UUID resourceId, String status, LocalDate bookingDate, Pageable pageable);

    AvailableTimeSlotsResponse getAvailableTimeSlots(UUID resourceId, LocalDate date);

    boolean checkConflict(UUID resourceId, LocalDate date, LocalTime startTime, LocalTime endTime);

    BookingResponse getBookingById(UUID bookingId, String userEmail);

    BookingResponse updateBooking(UUID bookingId, BookingUpdateRequest request, String userEmail);

    // Dashboard count methods
    long getTotalBookingsCount();
    long getPendingBookingsCount();
    long getApprovedBookingsCount();
    long getRejectedBookingsCount();
    long getCancelledBookingsCount();
    long getMaintenanceBookingsCount();

    // User-specific counts
    long getUserBookingsCount(String userEmail);
    long getUserPendingBookingsCount(String userEmail);
    long getUserApprovedBookingsCount(String userEmail);
}