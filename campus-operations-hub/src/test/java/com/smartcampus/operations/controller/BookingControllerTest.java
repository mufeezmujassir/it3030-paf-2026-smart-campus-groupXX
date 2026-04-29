// src/test/java/com/smartcampus/operations/controller/BookingControllerTest.java
package com.smartcampus.operations.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.BookingStatus;
import com.smartcampus.operations.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(BookingController.class)
class BookingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BookingService bookingService;

    @Autowired
    private ObjectMapper objectMapper;

    private final UUID testBookingId = UUID.randomUUID();
    private final UUID testResourceId = UUID.randomUUID();

    private BookingResponse createTestBookingResponse() {
        return BookingResponse.builder()
                .id(testBookingId)
                .resourceId(testResourceId)
                .resourceName("Engineering Lab")
                .userFullName("Test Student")
                .userEmail("student@test.com")
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .purpose("Study session")
                .expectedAttendees(10)
                .status(BookingStatus.PENDING)
                .bookingType("REGULAR")
                .build();
    }

    // ========== CREATE BOOKING TESTS ==========

    @Test
    @WithMockUser(username = "student@test.com", roles = {"STUDENT"})
    void createBooking_shouldReturnCreated_whenValidRequest() throws Exception {
        BookingCreateRequest request = BookingCreateRequest.builder()
                .resourceId(testResourceId)
                .bookingDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .purpose("Study session")
                .expectedAttendees(10)
                .build();

        BookingResponse response = createTestBookingResponse();

        when(bookingService.createBooking(any(BookingCreateRequest.class), eq("student@test.com")))
                .thenReturn(response);

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(testBookingId.toString()))
                .andExpect(jsonPath("$.resourceName").value("Engineering Lab"))
                .andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test
    @WithMockUser
    void createBooking_shouldReturnBadRequest_whenInvalidData() throws Exception {
        BookingCreateRequest request = new BookingCreateRequest(); // Empty request - missing required fields

        mockMvc.perform(post("/api/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ========== GET MY BOOKINGS TESTS ==========

    @Test
    @WithMockUser(username = "student@test.com")
    void getMyBookings_shouldReturnUserBookings() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getUserBookings(eq("student@test.com"), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testBookingId.toString()));
    }

    @Test
    @WithMockUser(username = "student@test.com")
    void getMyBookings_shouldFilterByStatus() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getUserBookings(eq("student@test.com"), eq("PENDING"), isNull(), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings/my")
                        .param("status", "PENDING"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(username = "student@test.com")
    void getMyBookings_shouldFilterByBookingType() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getUserBookings(eq("student@test.com"), isNull(), eq("REGULAR"), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings/my")
                        .param("bookingType", "REGULAR"))
                .andExpect(status().isOk());
    }

    // ========== GET BOOKING BY ID TESTS ==========

    @Test
    @WithMockUser(username = "student@test.com")
    void getBookingById_shouldReturnBooking_whenAuthorized() throws Exception {
        BookingResponse response = createTestBookingResponse();

        when(bookingService.getBookingById(eq(testBookingId), eq("student@test.com")))
                .thenReturn(response);

        mockMvc.perform(get("/api/bookings/{id}", testBookingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(testBookingId.toString()));
    }

    // ========== CANCEL BOOKING TESTS ==========

    @Test
    @WithMockUser(username = "student@test.com")
    void cancelBooking_shouldReturnCancelledBooking() throws Exception {
        BookingResponse response = createTestBookingResponse();
        response.setStatus(BookingStatus.CANCELLED);

        when(bookingService.cancelBooking(eq(testBookingId), eq("student@test.com")))
                .thenReturn(response);

        mockMvc.perform(delete("/api/bookings/{id}/cancel", testBookingId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));
    }

    // ========== GET AVAILABLE SLOTS TESTS ==========

    @Test
    @WithMockUser
    void getAvailableTimeSlots_shouldReturnSlots() throws Exception {
        AvailableTimeSlotsResponse response = AvailableTimeSlotsResponse.builder()
                .availableSlots(List.of(
                        AvailableTimeSlotsResponse.TimeSlot.builder()
                                .startTime(LocalTime.of(9, 0))
                                .endTime(LocalTime.of(10, 0))
                                .available(true)
                                .build()
                ))
                .bookedSlots(List.of())
                .isUnderMaintenance(false)
                .build();

        when(bookingService.getAvailableTimeSlots(eq(testResourceId), any(LocalDate.class)))
                .thenReturn(response);

        mockMvc.perform(get("/api/bookings/available-slots")
                        .param("resourceId", testResourceId.toString())
                        .param("date", "2026-04-30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableSlots[0].available").value(true));
    }

    // ========== CHECK CONFLICT TESTS ==========

    @Test
    @WithMockUser
    void checkConflict_shouldReturnTrue_whenConflictExists() throws Exception {
        when(bookingService.checkConflict(eq(testResourceId), any(LocalDate.class), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(true);

        mockMvc.perform(get("/api/bookings/check-conflict")
                        .param("resourceId", testResourceId.toString())
                        .param("date", "2026-04-30")
                        .param("startTime", "10:00")
                        .param("endTime", "11:00"))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    // ========== ADMIN: GET ALL BOOKINGS TESTS ==========

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void getAllBookings_shouldReturnAllBookings_forAdmin() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getAllBookings(isNull(), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(testBookingId.toString()));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void getAllBookings_shouldFilterByStatus_forAdmin() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getAllBookings(isNull(), eq("PENDING"), isNull(), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings")
                        .param("status", "PENDING"))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void getAllBookings_shouldFilterByResource_forAdmin() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getAllBookings(eq(testResourceId), isNull(), isNull(), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings")
                        .param("resourceId", testResourceId.toString()))
                .andExpect(status().isOk());
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void getAllBookings_shouldFilterByDate_forAdmin() throws Exception {
        Page<BookingResponse> bookingPage = new PageImpl<>(List.of(createTestBookingResponse()));

        when(bookingService.getAllBookings(isNull(), isNull(), any(LocalDate.class), any(PageRequest.class)))
                .thenReturn(bookingPage);

        mockMvc.perform(get("/api/bookings")
                        .param("bookingDate", "2026-04-30"))
                .andExpect(status().isOk());
    }

    // ========== ADMIN: UPDATE BOOKING STATUS TESTS ==========

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void updateBookingStatus_shouldApproveBooking_forAdmin() throws Exception {
        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest();
        request.setStatus(BookingStatus.APPROVED);
        request.setReason("Approved");

        BookingResponse response = createTestBookingResponse();
        response.setStatus(BookingStatus.APPROVED);

        when(bookingService.updateBookingStatus(eq(testBookingId), any(BookingStatusUpdateRequest.class), eq("admin")))
                .thenReturn(response);

        mockMvc.perform(patch("/api/bookings/{id}/status", testBookingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void updateBookingStatus_shouldReturnBadRequest_whenNoStatus() throws Exception {
        BookingStatusUpdateRequest request = new BookingStatusUpdateRequest(); // No status field

        mockMvc.perform(patch("/api/bookings/{id}/status", testBookingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    // ========== USER: UPDATE BOOKING TESTS ==========

    @Test
    @WithMockUser(username = "student@test.com")
    void updateBooking_shouldUpdateBooking_whenAuthorized() throws Exception {
        BookingUpdateRequest request = new BookingUpdateRequest();
        request.setPurpose("Updated purpose");
        request.setExpectedAttendees(15);

        BookingResponse response = createTestBookingResponse();
        response.setPurpose("Updated purpose");
        response.setExpectedAttendees(15);

        when(bookingService.updateBooking(eq(testBookingId), any(BookingUpdateRequest.class), eq("student@test.com")))
                .thenReturn(response);

        mockMvc.perform(put("/api/bookings/{id}", testBookingId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.purpose").value("Updated purpose"))
                .andExpect(jsonPath("$.expectedAttendees").value(15));
    }

    // ========== STATISTICS TESTS ==========

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void getBookingStats_shouldReturnStats_forAdmin() throws Exception {
        when(bookingService.getTotalBookingsCount()).thenReturn(100L);
        when(bookingService.getPendingBookingsCount()).thenReturn(25L);
        when(bookingService.getApprovedBookingsCount()).thenReturn(50L);
        when(bookingService.getRejectedBookingsCount()).thenReturn(15L);
        when(bookingService.getCancelledBookingsCount()).thenReturn(10L);
        when(bookingService.getMaintenanceBookingsCount()).thenReturn(5L);

        mockMvc.perform(get("/api/bookings/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(100))
                .andExpect(jsonPath("$.pending").value(25))
                .andExpect(jsonPath("$.approved").value(50))
                .andExpect(jsonPath("$.rejected").value(15))
                .andExpect(jsonPath("$.cancelled").value(10))
                .andExpect(jsonPath("$.maintenance").value(5));
    }

    @Test
    @WithMockUser(username = "student@test.com")
    void getMyBookingStats_shouldReturnUserStats() throws Exception {
        when(bookingService.getUserBookingsCount("student@test.com")).thenReturn(20L);
        when(bookingService.getUserPendingBookingsCount("student@test.com")).thenReturn(5L);
        when(bookingService.getUserApprovedBookingsCount("student@test.com")).thenReturn(10L);

        mockMvc.perform(get("/api/bookings/stats/my"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(20))
                .andExpect(jsonPath("$.pending").value(5))
                .andExpect(jsonPath("$.approved").value(10));
    }
}
