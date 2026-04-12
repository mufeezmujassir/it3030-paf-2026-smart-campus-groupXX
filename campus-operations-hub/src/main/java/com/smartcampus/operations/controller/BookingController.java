// src/main/java/com/smartcampus/operations/controller/BookingController.java
package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    @PostMapping
    public ResponseEntity<BookingResponse> createBooking(
            @Valid @RequestBody BookingCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        BookingResponse response = bookingService.createBooking(request, userDetails.getUsername());
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @GetMapping("/my")
    public ResponseEntity<Page<BookingResponse>> getMyBookings(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String bookingType,
            @PageableDefault(size = 20, sort = "bookingDate", direction = Sort.Direction.DESC) Pageable pageable) {
        System.out.println("Fetching user bookings with status: " + status + ", bookingType: " + bookingType);
        return ResponseEntity.ok(bookingService.getUserBookings(userDetails.getUsername(), status, bookingType, pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingResponse> getBookingById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.getBookingById(id, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}/cancel")
    public ResponseEntity<BookingResponse> cancelBooking(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.cancelBooking(id, userDetails.getUsername()));
    }

    @GetMapping("/available-slots")
    public ResponseEntity<AvailableTimeSlotsResponse> getAvailableTimeSlots(
            @RequestParam UUID resourceId,
            @RequestParam LocalDate date) {
        return ResponseEntity.ok(bookingService.getAvailableTimeSlots(resourceId, date));
    }

    @GetMapping("/check-conflict")
    public ResponseEntity<Boolean> checkConflict(
            @RequestParam UUID resourceId,
            @RequestParam LocalDate date,
            @RequestParam LocalTime startTime,
            @RequestParam LocalTime endTime) {
        return ResponseEntity.ok(bookingService.checkConflict(resourceId, date, startTime, endTime));
    }

    // Admin endpoints
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<BookingResponse>> getAllBookings(
            @RequestParam(required = false) UUID resourceId,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate bookingDate,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {

        System.out.println("Admin Booking Filters - ResourceId: " + resourceId +
                ", Status: " + status +
                ", BookingDate: " + bookingDate);

        Page<BookingResponse> result = bookingService.getAllBookings(resourceId, status, bookingDate, pageable);
        System.out.println("Total bookings found: " + result.getTotalElements());

        return ResponseEntity.ok(result);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BookingResponse> updateBookingStatus(
            @PathVariable UUID id,
            @Valid @RequestBody BookingStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(bookingService.updateBookingStatus(id, request, userDetails.getUsername()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<BookingResponse> updateBooking(
            @PathVariable UUID id,
            @Valid @RequestBody BookingUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        BookingResponse response = bookingService.updateBooking(id, request, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Long>> getBookingStats() {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", bookingService.getTotalBookingsCount());
        stats.put("pending", bookingService.getPendingBookingsCount());
        stats.put("approved", bookingService.getApprovedBookingsCount());
        stats.put("rejected", bookingService.getRejectedBookingsCount());
        stats.put("cancelled", bookingService.getCancelledBookingsCount());
        stats.put("maintenance", bookingService.getMaintenanceBookingsCount());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/stats/my")
    public ResponseEntity<Map<String, Long>> getMyBookingStats(@AuthenticationPrincipal UserDetails userDetails) {
        Map<String, Long> stats = new HashMap<>();
        stats.put("total", bookingService.getUserBookingsCount(userDetails.getUsername()));
        stats.put("pending", bookingService.getUserPendingBookingsCount(userDetails.getUsername()));
        stats.put("approved", bookingService.getUserApprovedBookingsCount(userDetails.getUsername()));
        return ResponseEntity.ok(stats);
    }
}