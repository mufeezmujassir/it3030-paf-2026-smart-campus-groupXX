// src/main/java/com/smartcampus/operations/repository/BookingRepository.java
package com.smartcampus.operations.repository;

import com.smartcampus.operations.entity.Booking;
import com.smartcampus.operations.entity.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BookingRepository extends JpaRepository<Booking, UUID> {

    // Check for overlapping bookings (only APPROVED ones block the slot)
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.status = 'APPROVED' " +
            "AND b.startTime < :endTime " +
            "AND b.endTime > :startTime")
    List<Booking> findOverlappingApprovedBookings(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime
    );

    // Get all bookings for a resource on a specific date
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.status != 'CANCELLED'")
    List<Booking> findBookingsByResourceAndDate(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate
    );

    // Get user's bookings
    Page<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(UUID userId, Pageable pageable);

    // Get all bookings with filters
    @Query("SELECT b FROM Booking b WHERE " +
            "(:resourceId IS NULL OR b.resourceId = :resourceId) AND " +
            "(:status IS NULL OR b.status = :status) AND " +
            "(:bookingDate IS NULL OR b.bookingDate = :bookingDate)")
    Page<Booking> findAllWithFilters(@Param("resourceId") UUID resourceId,
                                     @Param("status") BookingStatus status,
                                     @Param("bookingDate") LocalDate bookingDate,
                                     Pageable pageable);

    // Get pending bookings for admin
    Page<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status, Pageable pageable);

    // Check if a booking exists with specific status
    boolean existsByResourceIdAndBookingDateAndStartTimeAndEndTimeAndStatus(
            UUID resourceId, LocalDate bookingDate, LocalTime startTime, LocalTime endTime, BookingStatus status);

    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);
}