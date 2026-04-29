// src/test/java/com/smartcampus/operations/service/impl/BookingServiceImplTest.java
package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.InvalidBookingException;
import com.smartcampus.operations.exception.ResourceNotFoundException;
import com.smartcampus.operations.repository.BookingRepository;
import com.smartcampus.operations.repository.MaintenanceRequestRepository;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {

    @Mock
    private BookingRepository bookingRepository;

    @Mock
    private ResourceRepository resourceRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @Mock
    private MaintenanceRequestRepository maintenanceRequestRepository;

    @InjectMocks
    private BookingServiceImpl bookingService;

    private final UUID testUserId = UUID.randomUUID();
    private final UUID testResourceId = UUID.randomUUID();
    private final UUID testBookingId = UUID.randomUUID();

    private User createTestUser() {
        return User.builder()
                .id(testUserId)
                .email("student@test.com")
                .fullName("Test Student")
                .role(Role.STUDENT)
                .build();
    }

    private Resource createTestResource() {
        return Resource.builder()
                .id(testResourceId)
                .name("Engineering Lab")
                .type(ResourceType.LAB)
                .capacity(30)
                .status(ResourceStatus.ACTIVE)
                .maintenanceMode(false)
                .build();
    }

    private BookingCreateRequest createValidBookingRequest() {
        return BookingCreateRequest.builder()
                .resourceId(testResourceId)
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .purpose("Study session")
                .expectedAttendees(10)
                .bookingType("REGULAR")
                .build();
    }

    // ========== CREATE BOOKING TESTS ==========

    @Test
    void createBooking_shouldCreateBooking_whenValidRequest() {
        User user = createTestUser();
        Resource resource = createTestResource();
        BookingCreateRequest request = createValidBookingRequest();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.findOverlappingApprovedBookings(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findByUserIdAndResourceIdAndBookingDateAndStartTimeAndEndTime(
                        any(), any(), any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.countPendingBookingsForSlot(any(), any(), any(), any()))
                .thenReturn(0L);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.createBooking(request, "student@test.com");

        assertNotNull(response);
        assertEquals(testResourceId, response.getResourceId());
        verify(notificationService, atLeastOnce()).sendNotification(any(), any(), any(), any());
    }

    @Test
    void createBooking_shouldThrowException_whenCapacityExceeded() {
        User user = createTestUser();
        Resource resource = createTestResource();
        resource.setCapacity(5);
        BookingCreateRequest request = createValidBookingRequest();
        request.setExpectedAttendees(10); // Exceeds capacity

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.createBooking(request, "student@test.com"));
    }

    @Test
    void createBooking_shouldThrowException_whenResourceInactive() {
        User user = createTestUser();
        Resource resource = createTestResource();
        resource.setStatus(ResourceStatus.OUT_OF_SERVICE);
        BookingCreateRequest request = createValidBookingRequest();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.createBooking(request, "student@test.com"));
    }

    @Test
    void createBooking_shouldThrowException_whenTimeConflict() {
        User user = createTestUser();
        Resource resource = createTestResource();
        BookingCreateRequest request = createValidBookingRequest();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.findOverlappingApprovedBookings(any(), any(), any(), any()))
                .thenReturn(List.of(new Booking())); // Conflict exists

        assertThrows(InvalidBookingException.class,
                () -> bookingService.createBooking(request, "student@test.com"));
    }

    @Test
    void createBooking_shouldThrowException_whenUserAlreadyHasPendingBooking() {
        User user = createTestUser();
        Resource resource = createTestResource();
        BookingCreateRequest request = createValidBookingRequest();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.findOverlappingApprovedBookings(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findByUserIdAndResourceIdAndBookingDateAndStartTimeAndEndTime(
                        any(), any(), any(), any(), any()))
                .thenReturn(List.of(Booking.builder().status(BookingStatus.PENDING).build()));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.createBooking(request, "student@test.com"));
    }

    // ========== UPDATE BOOKING STATUS TESTS ==========

    @Test
    void updateBookingStatus_shouldApproveBooking_whenValid() {
        User user = createTestUser();
        Resource resource = createTestResource();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .userId(testUserId)
                .status(BookingStatus.PENDING)
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .expectedAttendees(10)
                .build();

        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest();
        request.setStatus(BookingStatus.APPROVED);
        request.setReason("Approved by admin");

        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(user));
        when(bookingRepository.findOverlappingApprovedBookings(any(), any(), any(), any()))
                .thenReturn(List.of());
        when(bookingRepository.findBookingsByResourceAndDate(any(), any())).thenReturn(List.of());
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.updateBookingStatus(testBookingId, request, "admin@test.com");

        assertEquals(BookingStatus.APPROVED, response.getStatus());
        verify(notificationService, atLeastOnce()).sendNotification(any(), any(), any(), any());
    }

    @Test
    void updateBookingStatus_shouldRejectBooking_whenValid() {
        Booking booking = Booking.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .userId(testUserId)
                .status(BookingStatus.PENDING)
                .build();

        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest();
        request.setStatus(BookingStatus.REJECTED);
        request.setReason("No available slots");

        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(createTestResource()));
        when(userRepository.findById(testUserId)).thenReturn(Optional.of(createTestUser()));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.updateBookingStatus(testBookingId, request, "admin@test.com");

        assertEquals(BookingStatus.REJECTED, response.getStatus());
        assertEquals("No available slots", response.getAdminReason());
    }

    @Test
    void updateBookingStatus_shouldThrowException_whenCapacityExceededOnApproval() {
        Resource resource = createTestResource();
        resource.setCapacity(5);
        Booking booking = Booking.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .userId(testUserId)
                .status(BookingStatus.PENDING)
                .expectedAttendees(10) // Exceeds capacity
                .build();

        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest();
        request.setStatus(BookingStatus.APPROVED);

        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.updateBookingStatus(testBookingId, request, "admin@test.com"));
    }

    @Test
    void updateBookingStatus_shouldThrowException_whenAlreadyApproved() {
        Booking booking = Booking.builder()
                .id(testBookingId)
                .status(BookingStatus.APPROVED)
                .build();

        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest();
        request.setStatus(BookingStatus.APPROVED);

        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.updateBookingStatus(testBookingId, request, "admin@test.com"));
    }

    // ========== CANCEL BOOKING TESTS ==========

    @Test
    void cancelBooking_shouldCancelPendingBooking_whenValid() {
        User user = createTestUser();
        Resource resource = createTestResource();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .userId(testUserId)
                .status(BookingStatus.PENDING)
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByIdAndUserId(testBookingId, testUserId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.cancelBooking(testBookingId, "student@test.com");

        assertEquals(BookingStatus.CANCELLED, response.getStatus());
        verify(notificationService).sendNotification(eq(testUserId), eq("Booking Cancelled"), any(), any());
    }

    @Test
    void cancelBooking_shouldCancelApprovedBooking_whenValid() {
        User user = createTestUser();
        Resource resource = createTestResource();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .userId(testUserId)
                .status(BookingStatus.APPROVED)
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .build();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByIdAndUserId(testBookingId, testUserId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.cancelBooking(testBookingId, "student@test.com");

        assertEquals(BookingStatus.CANCELLED, response.getStatus());
        assertEquals("Cancelled by user", response.getAdminReason());
    }

    @Test
    void cancelBooking_shouldThrowException_whenSlotAlreadyPassed() {
        User user = createTestUser();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .userId(testUserId)
                .status(BookingStatus.APPROVED)
                .bookingDate(LocalDate.now().minusDays(1)) // Past date
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(9, 0))
                .build();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByIdAndUserId(testBookingId, testUserId)).thenReturn(Optional.of(booking));

        assertThrows(InvalidBookingException.class,
                () -> bookingService.cancelBooking(testBookingId, "student@test.com"));
    }

    // ========== GET USER BOOKINGS TESTS ==========

    @Test
    void getUserBookings_shouldReturnUserBookings_whenValid() {
        User user = createTestUser();
        Pageable pageable = PageRequest.of(0, 10);
        Page<Booking> bookingPage = new PageImpl<>(List.of(
                Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING).build(),
                Booking.builder().id(UUID.randomUUID()).status(BookingStatus.APPROVED).build()
        ));

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByUserIdOrderByBookingDateDescStartTimeDesc(eq(testUserId), eq(pageable)))
                .thenReturn(bookingPage);
        when(resourceRepository.findById(any())).thenReturn(Optional.of(createTestResource()));

        Page<BookingResponse> result = bookingService.getUserBookings("student@test.com", null, null, pageable);

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());
    }

    @Test
    void getUserBookings_shouldFilterByStatus_whenStatusProvided() {
        User user = createTestUser();
        Pageable pageable = PageRequest.of(0, 10);
        Page<Booking> bookingPage = new PageImpl<>(List.of(
                Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING).build()
        ));

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByUserIdAndStatusOrderByBookingDateDescStartTimeDesc(
                eq(testUserId), eq(BookingStatus.PENDING), eq(pageable)))
                .thenReturn(bookingPage);
        when(resourceRepository.findById(any())).thenReturn(Optional.of(createTestResource()));

        Page<BookingResponse> result = bookingService.getUserBookings("student@test.com", "PENDING", null, pageable);

        assertNotNull(result);
        verify(bookingRepository).findByUserIdAndStatusOrderByBookingDateDescStartTimeDesc(
                eq(testUserId), eq(BookingStatus.PENDING), eq(pageable));
    }

    // ========== GET ALL BOOKINGS (ADMIN) TESTS ==========

    @Test
    void getAllBookings_shouldReturnAllBookings_whenNoFilters() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Booking> bookingPage = new PageImpl<>(List.of(
                Booking.builder().id(UUID.randomUUID()).build(),
                Booking.builder().id(UUID.randomUUID()).build()
        ));

        when(bookingRepository.findAllByOrderByCreatedAtDesc(pageable)).thenReturn(bookingPage);
        when(resourceRepository.findById(any())).thenReturn(Optional.of(createTestResource()));
        when(userRepository.findById(any())).thenReturn(Optional.of(createTestUser()));

        Page<BookingResponse> result = bookingService.getAllBookings(null, null, null, pageable);

        assertEquals(2, result.getTotalElements());
        verify(bookingRepository).findAllByOrderByCreatedAtDesc(pageable);
    }

    @Test
    void getAllBookings_shouldFilterByStatus_whenStatusProvided() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Booking> bookingPage = new PageImpl<>(List.of(
                Booking.builder().id(UUID.randomUUID()).status(BookingStatus.PENDING).build()
        ));

        when(bookingRepository.findByStatusOrderByCreatedAtDesc(eq(BookingStatus.PENDING), eq(pageable)))
                .thenReturn(bookingPage);
        when(resourceRepository.findById(any())).thenReturn(Optional.of(createTestResource()));
        when(userRepository.findById(any())).thenReturn(Optional.of(createTestUser()));

        Page<BookingResponse> result = bookingService.getAllBookings(null, "PENDING", null, pageable);

        assertNotNull(result);
        verify(bookingRepository).findByStatusOrderByCreatedAtDesc(eq(BookingStatus.PENDING), eq(pageable));
    }

    @Test
    void getAllBookings_shouldFilterByResource_whenResourceIdProvided() {
        Pageable pageable = PageRequest.of(0, 20);
        Page<Booking> bookingPage = new PageImpl<>(List.of(
                Booking.builder().id(UUID.randomUUID()).resourceId(testResourceId).build()
        ));

        when(bookingRepository.findByResourceIdOrderByCreatedAtDesc(eq(testResourceId), eq(pageable)))
                .thenReturn(bookingPage);
        when(resourceRepository.findById(any())).thenReturn(Optional.of(createTestResource()));
        when(userRepository.findById(any())).thenReturn(Optional.of(createTestUser()));

        Page<BookingResponse> result = bookingService.getAllBookings(testResourceId, null, null, pageable);

        assertNotNull(result);
        verify(bookingRepository).findByResourceIdOrderByCreatedAtDesc(eq(testResourceId), eq(pageable));
    }

    // ========== CHECK CONFLICT TESTS ==========

    @Test
    void checkConflict_shouldReturnTrue_whenOverlapExists() {
        LocalDate date = LocalDate.now().plusDays(1);
        LocalTime start = LocalTime.of(10, 0);
        LocalTime end = LocalTime.of(11, 0);

        when(bookingRepository.findOverlappingApprovedBookings(eq(testResourceId), eq(date), eq(start), eq(end)))
                .thenReturn(List.of(new Booking()));

        boolean hasConflict = bookingService.checkConflict(testResourceId, date, start, end);

        assertTrue(hasConflict);
    }

    @Test
    void checkConflict_shouldReturnFalse_whenNoOverlap() {
        LocalDate date = LocalDate.now().plusDays(1);
        LocalTime start = LocalTime.of(10, 0);
        LocalTime end = LocalTime.of(11, 0);

        when(bookingRepository.findOverlappingApprovedBookings(eq(testResourceId), eq(date), eq(start), eq(end)))
                .thenReturn(List.of());

        boolean hasConflict = bookingService.checkConflict(testResourceId, date, start, end);

        assertFalse(hasConflict);
    }

    // ========== UPDATE BOOKING TESTS ==========

    @Test
    void updateBooking_shouldUpdate_whenBookingIsPending() {
        User user = createTestUser();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .userId(testUserId)
                .status(BookingStatus.PENDING)
                .purpose("Old purpose")
                .expectedAttendees(5)
                .build();
        Resource resource = createTestResource();

        BookingUpdateRequest request = new BookingUpdateRequest();
        request.setPurpose("New purpose");
        request.setExpectedAttendees(10);

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByIdAndUserId(testBookingId, testUserId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));

        BookingResponse response = bookingService.updateBooking(testBookingId, request, "student@test.com");

        assertEquals("New purpose", response.getPurpose());
        assertEquals(10, response.getExpectedAttendees());
    }

    @Test
    void updateBooking_shouldThrowException_whenBookingIsNotPending() {
        User user = createTestUser();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .userId(testUserId)
                .status(BookingStatus.APPROVED) // Not pending
                .build();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findByIdAndUserId(testBookingId, testUserId)).thenReturn(Optional.of(booking));

        BookingUpdateRequest request = new BookingUpdateRequest();
        request.setPurpose("New purpose");

        assertThrows(InvalidBookingException.class,
                () -> bookingService.updateBooking(testBookingId, request, "student@test.com"));
    }

    // ========== GET BOOKING BY ID TESTS ==========

    @Test
    void getBookingById_shouldReturnBooking_forOwner() {
        User user = createTestUser();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .userId(testUserId)
                .resourceId(testResourceId)
                .build();
        Resource resource = createTestResource();

        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));

        BookingResponse response = bookingService.getBookingById(testBookingId, "student@test.com");

        assertNotNull(response);
        assertEquals(testBookingId, response.getId());
    }

    @Test
    void getBookingById_shouldReturnBooking_forAdmin() {
        User admin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .role(Role.ADMIN)
                .build();
        Booking booking = Booking.builder()
                .id(testBookingId)
                .userId(UUID.randomUUID()) // Different user
                .resourceId(testResourceId)
                .build();
        Resource resource = createTestResource();

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));
        when(bookingRepository.findById(testBookingId)).thenReturn(Optional.of(booking));
        when(resourceRepository.findById(testResourceId)).thenReturn(Optional.of(resource));

        BookingResponse response = bookingService.getBookingById(testBookingId, "admin@test.com");

        assertNotNull(response);
        assertEquals(testBookingId, response.getId());
    }

    // ========== STATISTICS TESTS ==========

    @Test
    void getTotalBookingsCount_shouldReturnCount() {
        when(bookingRepository.count()).thenReturn(100L);
        assertEquals(100L, bookingService.getTotalBookingsCount());
    }

    @Test
    void getPendingBookingsCount_shouldReturnPendingCount() {
        when(bookingRepository.countByStatus(BookingStatus.PENDING)).thenReturn(25L);
        assertEquals(25L, bookingService.getPendingBookingsCount());
    }

    @Test
    void getApprovedBookingsCount_shouldReturnApprovedCount() {
        when(bookingRepository.countByStatus(BookingStatus.APPROVED)).thenReturn(50L);
        assertEquals(50L, bookingService.getApprovedBookingsCount());
    }

    @Test
    void getUserBookingsCount_shouldReturnUserBookingsCount() {
        User user = createTestUser();
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.countByUserId(testUserId)).thenReturn(15L);

        assertEquals(15L, bookingService.getUserBookingsCount("student@test.com"));
    }

    @Test
    void getUserPendingBookingsCount_shouldReturnUserPendingCount() {
        User user = createTestUser();
        when(userRepository.findByEmail("student@test.com")).thenReturn(Optional.of(user));
        when(bookingRepository.countByUserIdAndStatus(testUserId, BookingStatus.PENDING)).thenReturn(5L);

        assertEquals(5L, bookingService.getUserPendingBookingsCount("student@test.com"));
    }

    @Test
    void getMaintenanceBookingsCount_shouldReturnMaintenanceCount() {
        when(bookingRepository.findByStatusAndBookingType(BookingStatus.APPROVED, "MAINTENANCE"))
                .thenReturn(List.of(new Booking(), new Booking()));

        assertEquals(2L, bookingService.getMaintenanceBookingsCount());
    }
}
