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

    // Check for overlapping APPROVED bookings only
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.status = 'APPROVED' " +
            "AND b.startTime < :endTime " +
            "AND b.endTime > :startTime")
    List<Booking> findOverlappingApprovedBookings(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    // Get all bookings for a resource on a specific date (including pending)
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.status != 'CANCELLED'")
    List<Booking> findBookingsByResourceAndDate(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate);

    // Get user's bookings (all)
    Page<Booking> findByUserIdOrderByBookingDateDescStartTimeDesc(UUID userId, Pageable pageable);

    // Get user's bookings filtered by status
    Page<Booking> findByUserIdAndStatusOrderByBookingDateDescStartTimeDesc(UUID userId, BookingStatus status, Pageable pageable);

    // Get user's bookings filtered by status and booking type
    @Query("SELECT b FROM Booking b WHERE b.userId = :userId " +
            "AND (:status IS NULL OR b.status = :status) " +
            "AND (:bookingType IS NULL OR b.bookingType = :bookingType) " +
            "ORDER BY b.bookingDate DESC, b.startTime DESC")
    Page<Booking> findByUserIdAndStatusAndBookingTypeOrderByBookingDateDescStartTimeDesc(
            @Param("userId") UUID userId,
            @Param("status") BookingStatus status,
            @Param("bookingType") String bookingType,
            Pageable pageable);

    // Get user's bookings filtered by booking type only
    @Query("SELECT b FROM Booking b WHERE b.userId = :userId " +
            "AND (:bookingType IS NULL OR b.bookingType = :bookingType) " +
            "ORDER BY b.bookingDate DESC, b.startTime DESC")
    Page<Booking> findByUserIdAndBookingTypeOrderByBookingDateDescStartTimeDesc(
            @Param("userId") UUID userId,
            @Param("bookingType") String bookingType,
            Pageable pageable);

    // Check if user has a specific booking
    @Query("SELECT b FROM Booking b WHERE b.userId = :userId " +
            "AND b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.startTime = :startTime " +
            "AND b.endTime = :endTime")
    List<Booking> findByUserIdAndResourceIdAndBookingDateAndStartTimeAndEndTime(
            @Param("userId") UUID userId,
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    // ========== SEPARATE QUERY METHODS FOR ADMIN FILTERING ==========

    // No filters - get all bookings
    Page<Booking> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // Filter by status only
    Page<Booking> findByStatusOrderByCreatedAtDesc(BookingStatus status, Pageable pageable);

    // Filter by date only
    Page<Booking> findByBookingDateOrderByCreatedAtDesc(LocalDate bookingDate, Pageable pageable);

    // Filter by resource only
    Page<Booking> findByResourceIdOrderByCreatedAtDesc(UUID resourceId, Pageable pageable);

    // Filter by status AND date
    Page<Booking> findByStatusAndBookingDateOrderByCreatedAtDesc(BookingStatus status, LocalDate bookingDate, Pageable pageable);

    // Filter by status AND resource
    Page<Booking> findByStatusAndResourceIdOrderByCreatedAtDesc(BookingStatus status, UUID resourceId, Pageable pageable);

    // Filter by date AND resource
    Page<Booking> findByBookingDateAndResourceIdOrderByCreatedAtDesc(LocalDate bookingDate, UUID resourceId, Pageable pageable);

    // Filter by status AND date AND resource (all three)
    Page<Booking> findByStatusAndBookingDateAndResourceIdOrderByCreatedAtDesc(BookingStatus status, LocalDate bookingDate, UUID resourceId, Pageable pageable);

    // Get pending bookings for admin
    Page<Booking> findByStatusOrderByCreatedAtAsc(BookingStatus status, Pageable pageable);

    Optional<Booking> findByIdAndUserId(UUID id, UUID userId);

    // Get all bookings by status
    List<Booking> findByStatus(BookingStatus status);

    // Check if a booking exists with specific status
    boolean existsByResourceIdAndBookingDateAndStartTimeAndEndTimeAndStatus(
            UUID resourceId, LocalDate bookingDate, LocalTime startTime, LocalTime endTime, BookingStatus status);

    // Get all pending bookings for a specific slot (excluding a specific booking)
    @Query("SELECT b FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.startTime = :startTime " +
            "AND b.endTime = :endTime " +
            "AND b.status = 'PENDING' " +
            "AND b.id != :excludeId")
    List<Booking> findOtherPendingBookingsForSlot(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime,
            @Param("excludeId") UUID excludeId);

    // Get count of pending bookings for a specific slot
    @Query("SELECT COUNT(b) FROM Booking b WHERE b.resourceId = :resourceId " +
            "AND b.bookingDate = :bookingDate " +
            "AND b.startTime = :startTime " +
            "AND b.endTime = :endTime " +
            "AND b.status = 'PENDING'")
    long countPendingBookingsForSlot(
            @Param("resourceId") UUID resourceId,
            @Param("bookingDate") LocalDate bookingDate,
            @Param("startTime") LocalTime startTime,
            @Param("endTime") LocalTime endTime);

    List<Booking> findByStatusAndBookingType(BookingStatus status, String bookingType);
}