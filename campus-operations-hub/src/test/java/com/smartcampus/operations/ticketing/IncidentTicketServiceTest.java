package com.smartcampus.operations.ticketing;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.*;
import com.smartcampus.operations.repository.*;
import com.smartcampus.operations.service.impl.IncidentTicketServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class IncidentTicketServiceTest {

    @Mock
    private IncidentTicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private IncidentTicketServiceImpl ticketService;

    private User student;
    private User admin;
    private User technician;
    private IncidentTicket ticket;

    @BeforeEach
    void setUp() {
        student = User.builder()
                .id(UUID.randomUUID())
                .fullName("Test Student")
                .email("student@campus.com")
                .role(Role.STUDENT)
                .isActive(true)
                .isLocked(false)
                .build();

        admin = User.builder()
                .id(UUID.randomUUID())
                .fullName("Test Admin")
                .email("admin@campus.com")
                .role(Role.ADMIN)
                .isActive(true)
                .isLocked(false)
                .build();

        technician = User.builder()
                .id(UUID.randomUUID())
                .fullName("Test Technician")
                .email("tech@campus.com")
                .role(Role.TECHNICIAN)
                .technicianSpecialization("IT Support")
                .isActive(true)
                .isLocked(false)
                .build();

        ticket = IncidentTicket.builder()
                .id(UUID.randomUUID())
                .title("Projector not working")
                .category(TicketCategory.IT_EQUIPMENT)
                .description("Projector in Lab B4 is not turning on")
                .priority(TicketPriority.HIGH)
                .status(TicketStatus.ASSIGNED)
                .resourceLocation("Lab B4")
                .preferredContact("0771234567")
                .createdBy(student)
                .assignedTo(technician)
                .attachments(new ArrayList<>())
                .comments(new ArrayList<>())
                .build();
    }

    // ── CREATE TICKET TESTS ───────────────────────────────────────────────

    @Test
    void createTicket_withMatchingTechnician_shouldAssignAndSetStatusAssigned() {
        // Arrange
        TicketCreateRequest request = new TicketCreateRequest();
        request.setTitle("Projector broken");
        request.setCategory(TicketCategory.IT_EQUIPMENT);
        request.setDescription("Projector not turning on in Lab B4");
        request.setPriority(TicketPriority.HIGH);
        request.setResourceLocation("Lab B4");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(userRepository.findByRoleAndTechnicianSpecializationContainingIgnoreCase(Role.TECHNICIAN, "it"))
                .thenReturn(List.of(technician));
        when(ticketRepository.countByAssignedToAndStatusIn(any(), any())).thenReturn(0L);
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.createTicket(request, "student@campus.com");

        // Assert
        assertNotNull(response);
        assertEquals(TicketStatus.ASSIGNED, response.getStatus());
        assertEquals("Test Technician", response.getAssignedToName());
        verify(ticketRepository, times(1)).save(any(IncidentTicket.class));
    }

    @Test
    void createTicket_withNoTechnicians_shouldSetStatusOpen() {
        // Arrange
        TicketCreateRequest request = new TicketCreateRequest();
        request.setTitle("Broken chair");
        request.setCategory(TicketCategory.FURNITURE);
        request.setDescription("Chair leg broken in Room 201");
        request.setPriority(TicketPriority.LOW);
        request.setResourceLocation("Room 201");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(userRepository.findByRoleAndTechnicianSpecializationContainingIgnoreCase(any(), any()))
                .thenReturn(List.of());
        when(userRepository.findByRole(Role.TECHNICIAN)).thenReturn(List.of());
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.createTicket(request, "student@campus.com");

        // Assert
        assertEquals(TicketStatus.OPEN, response.getStatus());
        assertNull(response.getAssignedToId());
    }

    @Test
    void createTicket_userNotFound_shouldThrowUserNotFoundException() {
        // Arrange
        when(userRepository.findByEmail("unknown@campus.com")).thenReturn(Optional.empty());
        TicketCreateRequest request = new TicketCreateRequest();
        request.setTitle("Test");
        request.setCategory(TicketCategory.OTHER);
        request.setDescription("Test description");
        request.setPriority(TicketPriority.LOW);
        request.setResourceLocation("Room 1");

        // Act & Assert
        assertThrows(UserNotFoundException.class, () ->
                ticketService.createTicket(request, "unknown@campus.com"));
    }

    // ── GET TICKET TESTS ──────────────────────────────────────────────────

    @Test
    void getTicketById_asOwner_shouldReturnTicket() {
        // Arrange
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act
        TicketResponse response = ticketService.getTicketById(ticket.getId(), "student@campus.com");

        // Assert
        assertNotNull(response);
        assertEquals(ticket.getId(), response.getId());
        assertEquals("Projector not working", response.getTitle());
    }

    @Test
    void getTicketById_asAdmin_shouldReturnAnyTicket() {
        // Arrange
        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act
        TicketResponse response = ticketService.getTicketById(ticket.getId(), "admin@campus.com");

        // Assert
        assertNotNull(response);
        assertEquals(ticket.getId(), response.getId());
    }

    @Test
    void getTicketById_asOtherStudent_shouldThrowUnauthorized() {
        // Arrange
        User otherStudent = User.builder()
                .id(UUID.randomUUID())
                .email("other@campus.com")
                .role(Role.STUDENT)
                .build();

        when(userRepository.findByEmail("other@campus.com")).thenReturn(Optional.of(otherStudent));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.getTicketById(ticket.getId(), "other@campus.com"));
    }

    @Test
    void getTicketById_ticketNotFound_shouldThrowTicketNotFoundException() {
        // Arrange
        UUID fakeId = UUID.randomUUID();
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(fakeId)).thenReturn(Optional.empty());

        // Act & Assert
        assertThrows(TicketNotFoundException.class, () ->
                ticketService.getTicketById(fakeId, "student@campus.com"));
    }

    // ── GET ALL TICKETS TESTS ─────────────────────────────────────────────

    @Test
    void getAllTickets_asAdmin_shouldReturnAllTickets() {
        // Arrange
        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findAll()).thenReturn(List.of(ticket));

        // Act
        List<TicketResponse> responses = ticketService.getAllTickets("admin@campus.com");

        // Assert
        assertEquals(1, responses.size());
        verify(ticketRepository, times(1)).findAll();
        verify(ticketRepository, never()).findByCreatedBy(any());
    }

    @Test
    void getAllTickets_asStudent_shouldReturnOnlyOwnTickets() {
        // Arrange
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findByCreatedBy(student)).thenReturn(List.of(ticket));

        // Act
        List<TicketResponse> responses = ticketService.getAllTickets("student@campus.com");

        // Assert
        assertEquals(1, responses.size());
        verify(ticketRepository, times(1)).findByCreatedBy(student);
        verify(ticketRepository, never()).findAll();
    }

    @Test
    void getAllTickets_asTechnician_shouldReturnOnlyAssignedTickets() {
        // Arrange
        when(userRepository.findByEmail("tech@campus.com")).thenReturn(Optional.of(technician));
        when(ticketRepository.findByAssignedTo(technician)).thenReturn(List.of(ticket));

        // Act
        List<TicketResponse> responses = ticketService.getAllTickets("tech@campus.com");

        // Assert
        assertEquals(1, responses.size());
        verify(ticketRepository, times(1)).findByAssignedTo(technician);
    }

    // ── STATUS TRANSITION TESTS ───────────────────────────────────────────

    @Test
    void updateTicketStatus_technicianStartsWork_shouldSetInProgress() {
        // Arrange
        ticket.setStatus(TicketStatus.ASSIGNED);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest();
        request.setStatus(TicketStatus.IN_PROGRESS);

        when(userRepository.findByEmail("tech@campus.com")).thenReturn(Optional.of(technician));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.updateTicketStatus(
                ticket.getId(), request, "tech@campus.com");

        // Assert
        assertEquals(TicketStatus.IN_PROGRESS, response.getStatus());
    }

    @Test
    void updateTicketStatus_studentTriesToStartWork_shouldThrowUnauthorized() {
        // Arrange
        ticket.setStatus(TicketStatus.ASSIGNED);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest();
        request.setStatus(TicketStatus.IN_PROGRESS);

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.updateTicketStatus(ticket.getId(), request, "student@campus.com"));
    }

    @Test
    void updateTicketStatus_closedTicket_shouldThrowInvalidTransition() {
        // Arrange
        ticket.setStatus(TicketStatus.CLOSED);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest();
        request.setStatus(TicketStatus.IN_PROGRESS);

        when(userRepository.findByEmail("tech@campus.com")).thenReturn(Optional.of(technician));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(InvalidStatusTransitionException.class, () ->
                ticketService.updateTicketStatus(ticket.getId(), request, "tech@campus.com"));
    }

    @Test
    void updateTicketStatus_studentClosesTicket_shouldThrowUnauthorized() {
        // Arrange
        ticket.setStatus(TicketStatus.RESOLVED);
        TicketStatusUpdateRequest request = new TicketStatusUpdateRequest();
        request.setStatus(TicketStatus.CLOSED);

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.updateTicketStatus(ticket.getId(), request, "student@campus.com"));
    }

    // ── REJECT TICKET TESTS ───────────────────────────────────────────────

    @Test
    void rejectTicket_asAdmin_shouldSetRejectedWithReason() {
        // Arrange
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        TicketRejectRequest request = new TicketRejectRequest();
        request.setReason("Insufficient information provided");

        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.rejectTicket(
                ticket.getId(), request, "admin@campus.com");

        // Assert
        assertEquals(TicketStatus.REJECTED, response.getStatus());
        assertEquals("Insufficient information provided", response.getRejectionReason());
    }

    @Test
    void rejectTicket_asStudent_shouldThrowUnauthorized() {
        // Arrange
        TicketRejectRequest request = new TicketRejectRequest();
        request.setReason("Some reason");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.rejectTicket(ticket.getId(), request, "student@campus.com"));
    }

    @Test
    void rejectTicket_alreadyRejected_shouldThrowInvalidTransition() {
        // Arrange
        ticket.setStatus(TicketStatus.REJECTED);
        TicketRejectRequest request = new TicketRejectRequest();
        request.setReason("Reason");

        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(InvalidStatusTransitionException.class, () ->
                ticketService.rejectTicket(ticket.getId(), request, "admin@campus.com"));
    }

    // ── RESOLUTION TESTS ──────────────────────────────────────────────────

    @Test
    void addResolutionNotes_asTechnician_shouldSetResolvedWithNotes() {
        // Arrange
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        TicketResolutionRequest request = new TicketResolutionRequest();
        request.setResolutionNotes("Replaced the projector bulb. Issue resolved.");

        when(userRepository.findByEmail("tech@campus.com")).thenReturn(Optional.of(technician));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.addResolutionNotes(
                ticket.getId(), request, "tech@campus.com");

        // Assert
        assertEquals(TicketStatus.RESOLVED, response.getStatus());
        assertEquals("Replaced the projector bulb. Issue resolved.", response.getResolutionNotes());
    }

    @Test
    void addResolutionNotes_asStudent_shouldThrowUnauthorized() {
        // Arrange
        TicketResolutionRequest request = new TicketResolutionRequest();
        request.setResolutionNotes("Fixed it myself");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.addResolutionNotes(ticket.getId(), request, "student@campus.com"));
    }

    // ── DELETE TICKET TESTS ───────────────────────────────────────────────

    @Test
    void deleteTicket_asOwner_shouldDelete() {
        // Arrange
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        doNothing().when(ticketRepository).delete(any());
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        assertDoesNotThrow(() ->
                ticketService.deleteTicket(ticket.getId(), "student@campus.com"));

        // Assert
        verify(ticketRepository, times(1)).delete(ticket);
    }

    @Test
    void deleteTicket_asOtherStudent_shouldThrowUnauthorized() {
        // Arrange
        User otherStudent = User.builder()
                .id(UUID.randomUUID())
                .email("other@campus.com")
                .role(Role.STUDENT)
                .build();

        when(userRepository.findByEmail("other@campus.com")).thenReturn(Optional.of(otherStudent));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.deleteTicket(ticket.getId(), "other@campus.com"));
    }

    @Test
    void deleteTicket_asAdmin_shouldDeleteAnyTicket() {
        // Arrange
        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        doNothing().when(ticketRepository).delete(any());
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        assertDoesNotThrow(() ->
                ticketService.deleteTicket(ticket.getId(), "admin@campus.com"));

        verify(ticketRepository, times(1)).delete(ticket);
    }

    // ── ASSIGN TICKET TESTS ───────────────────────────────────────────────

    @Test
    void assignTicket_asAdmin_shouldAssignTechnician() {
        // Arrange
        ticket.setStatus(TicketStatus.OPEN);
        ticket.setAssignedTo(null);

        TicketAssignRequest request = new TicketAssignRequest();
        request.setTechnicianId(technician.getId());

        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(userRepository.findById(technician.getId())).thenReturn(Optional.of(technician));
        when(ticketRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        doNothing().when(notificationService).sendNotification(any(), any(), any(), any());

        // Act
        TicketResponse response = ticketService.assignTicket(
                ticket.getId(), request, "admin@campus.com");

        // Assert
        assertEquals(TicketStatus.ASSIGNED, response.getStatus());
        assertEquals("Test Technician", response.getAssignedToName());
    }

    @Test
    void assignTicket_asStudent_shouldThrowUnauthorized() {
        // Arrange
        TicketAssignRequest request = new TicketAssignRequest();
        request.setTechnicianId(technician.getId());

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                ticketService.assignTicket(ticket.getId(), request, "student@campus.com"));
    }

    @Test
    void assignTicket_withNonTechnicianUser_shouldThrowIllegalArgument() {
        // Arrange
        TicketAssignRequest request = new TicketAssignRequest();
        request.setTechnicianId(student.getId());

        when(userRepository.findByEmail("admin@campus.com")).thenReturn(Optional.of(admin));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(userRepository.findById(student.getId())).thenReturn(Optional.of(student));

        // Act & Assert
        assertThrows(IllegalArgumentException.class, () ->
                ticketService.assignTicket(ticket.getId(), request, "admin@campus.com"));
    }
}