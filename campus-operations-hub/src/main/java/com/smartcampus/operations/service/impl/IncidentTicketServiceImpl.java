package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.*;
import com.smartcampus.operations.repository.*;
import com.smartcampus.operations.service.IncidentTicketService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.smartcampus.operations.dto.TechnicianResponse;
import java.util.Map;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IncidentTicketServiceImpl implements IncidentTicketService {

    private final IncidentTicketRepository ticketRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public TicketResponse createTicket(TicketCreateRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);

        // Auto-assign technician based on category specialization
        String specialization = CATEGORY_SPECIALIZATION_MAP
                .getOrDefault(request.getCategory().name(), "");

        List<User> matched = specialization.isEmpty()
                ? List.of()
                : userRepository.findByRoleAndTechnicianSpecializationContainingIgnoreCase(
                Role.TECHNICIAN, specialization);

        User assignedTechnician = matched.stream().findFirst()
                .orElseGet(() ->
                        userRepository.findByRole(Role.TECHNICIAN)
                                .stream()
                                .findFirst()
                                .orElse(null) // null if no technicians exist yet
                );

        IncidentTicket ticket = IncidentTicket.builder()
                .title(request.getTitle())
                .category(request.getCategory())
                .description(request.getDescription())
                .priority(request.getPriority())
                .status(assignedTechnician != null ? TicketStatus.IN_PROGRESS : TicketStatus.OPEN)
                .resourceLocation(request.getResourceLocation())
                .preferredContact(request.getPreferredContact())
                .createdBy(user)
                .assignedTo(assignedTechnician)
                .build();

        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    public TicketResponse getTicketById(UUID id, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(id);

        if (!canViewTicket(user, ticket)) {
            throw new UnauthorizedTicketAccessException();
        }

        return mapToResponse(ticket);
    }

    @Override
    public List<TicketResponse> getAllTickets(String userEmail) {
        User user = getUserByEmail(userEmail);

        List<IncidentTicket> tickets;

        if (user.getRole() == Role.ADMIN) {
            tickets = ticketRepository.findAll();
        } else if (user.getRole() == Role.TECHNICIAN) {
            tickets = ticketRepository.findByAssignedTo(user);
        } else {
            tickets = ticketRepository.findByCreatedBy(user);
        }

        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<TicketResponse> getTicketsByStatus(TicketStatus status, String userEmail) {
        User user = getUserByEmail(userEmail);

        List<IncidentTicket> tickets;

        if (user.getRole() == Role.ADMIN) {
            tickets = ticketRepository.findByStatus(status);
        } else {
            tickets = ticketRepository.findByCreatedByAndStatus(user, status);
        }

        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public TicketResponse updateTicketStatus(UUID id, TicketStatusUpdateRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(id);

        validateStatusTransition(ticket.getStatus(), request.getStatus(), user);

        ticket.setStatus(request.getStatus());
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional
    public TicketResponse assignTicket(UUID id, TicketAssignRequest request, String userEmail) {
        User admin = getUserByEmail(userEmail);

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTicketAccessException();
        }

        IncidentTicket ticket = getTicketOrThrow(id);

        User technician = userRepository.findById(request.getTechnicianId())
                .orElseThrow(() -> new UserNotFoundException("Technician not found"));

        if (technician.getRole() != Role.TECHNICIAN) {
            throw new IllegalArgumentException("Assigned user must have TECHNICIAN role");
        }

        ticket.setAssignedTo(technician);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional
    public TicketResponse rejectTicket(UUID id, TicketRejectRequest request, String userEmail) {
        User admin = getUserByEmail(userEmail);

        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTicketAccessException();
        }

        IncidentTicket ticket = getTicketOrThrow(id);

        if (ticket.getStatus() == TicketStatus.CLOSED || ticket.getStatus() == TicketStatus.REJECTED) {
            throw new InvalidStatusTransitionException(ticket.getStatus(), TicketStatus.REJECTED);
        }

        ticket.setStatus(TicketStatus.REJECTED);
        ticket.setRejectionReason(request.getReason());
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional
    public TicketResponse addResolutionNotes(UUID id, TicketResolutionRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(id);

        if (user.getRole() != Role.TECHNICIAN && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedTicketAccessException();
        }

        ticket.setResolutionNotes(request.getResolutionNotes());
        ticket.setStatus(TicketStatus.RESOLVED);
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    @Transactional
    public void deleteTicket(UUID id, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(id);

        if (user.getRole() != Role.ADMIN && !ticket.getCreatedBy().getId().equals(user.getId())) {
            throw new UnauthorizedTicketAccessException();
        }

        ticketRepository.delete(ticket);
    }

    private static final Map<String, String> CATEGORY_SPECIALIZATION_MAP = Map.of(
            "ELECTRICAL", "electrical",
            "PLUMBING", "plumbing",
            "HVAC", "hvac",
            "IT_EQUIPMENT", "it",
            "FURNITURE", "furniture",
            "CLEANING", "cleaning",
            "SECURITY", "security",
            "OTHER", ""
    );

    @Override
    @Transactional
    public TicketResponse autoAssignTicket(UUID id, String userEmail) {
        User admin = getUserByEmail(userEmail);
        if (admin.getRole() != Role.ADMIN) {
            throw new UnauthorizedTicketAccessException();
        }

        IncidentTicket ticket = getTicketOrThrow(id);

        String specialization = CATEGORY_SPECIALIZATION_MAP
                .getOrDefault(ticket.getCategory().name(), "");

        // Try to find a matching technician by specialization
        List<User> matched = specialization.isEmpty()
                ? List.of()
                : userRepository.findByRoleAndTechnicianSpecializationContainingIgnoreCase(
                Role.TECHNICIAN, specialization);

        // Fall back to any available technician
        User technician = matched.stream().findFirst()
                .orElseGet(() ->
                        userRepository.findByRole(Role.TECHNICIAN)
                                .stream()
                                .findFirst()
                                .orElseThrow(() -> new IllegalArgumentException(
                                        "No technicians available for auto-assignment"))
                );

        ticket.setAssignedTo(technician);
        ticket.setStatus(TicketStatus.IN_PROGRESS);
        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    public List<TechnicianResponse> getAvailableTechnicians() {
        return userRepository.findByRole(Role.TECHNICIAN)
                .stream()
                .map(t -> TechnicianResponse.builder()
                        .id(t.getId())
                        .fullName(t.getFullName())
                        .email(t.getEmail())
                        .technicianSpecialization(t.getTechnicianSpecialization())
                        .department(t.getDepartment())
                        .build())
                .collect(Collectors.toList());
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }

    private IncidentTicket getTicketOrThrow(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private boolean canViewTicket(User user, IncidentTicket ticket) {
        if (user.getRole() == Role.ADMIN) return true;
        if (user.getRole() == Role.TECHNICIAN &&
                ticket.getAssignedTo() != null &&
                ticket.getAssignedTo().getId().equals(user.getId())) return true;
        return ticket.getCreatedBy().getId().equals(user.getId());
    }

    private void validateStatusTransition(TicketStatus current, TicketStatus next, User user) {
        if (current == TicketStatus.CLOSED || current == TicketStatus.REJECTED) {
            throw new InvalidStatusTransitionException(current, next);
        }
        if (next == TicketStatus.IN_PROGRESS && user.getRole() != Role.ADMIN && user.getRole() != Role.TECHNICIAN) {
            throw new UnauthorizedTicketAccessException();
        }
        if (next == TicketStatus.CLOSED && user.getRole() != Role.ADMIN) {
            throw new UnauthorizedTicketAccessException();
        }
    }

    private TicketResponse mapToResponse(IncidentTicket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .title(ticket.getTitle())
                .category(ticket.getCategory())
                .description(ticket.getDescription())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .resourceLocation(ticket.getResourceLocation())
                .preferredContact(ticket.getPreferredContact())
                .rejectionReason(ticket.getRejectionReason())
                .resolutionNotes(ticket.getResolutionNotes())
                .createdById(ticket.getCreatedBy().getId())
                .createdByName(ticket.getCreatedBy().getFullName())
                .assignedToId(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getId() : null)
                .assignedToName(ticket.getAssignedTo() != null ? ticket.getAssignedTo().getFullName() : null)
                .attachments(ticket.getAttachments().stream().map(a -> AttachmentResponse.builder()
                        .id(a.getId())
                        .fileName(a.getFileName())
                        .fileType(a.getFileType())
                        .fileSize(a.getFileSize())
                        .uploadedAt(a.getUploadedAt())
                        .build()).collect(Collectors.toList()))
                .comments(ticket.getComments().stream().map(c -> CommentResponse.builder()
                        .id(c.getId())
                        .content(c.getContent())
                        .authorId(c.getAuthor().getId())
                        .authorName(c.getAuthor().getFullName())
                        .createdAt(c.getCreatedAt())
                        .updatedAt(c.getUpdatedAt())
                        .build()).collect(Collectors.toList()))
                .createdAt(ticket.getCreatedAt())
                .updatedAt(ticket.getUpdatedAt())
                .build();
    }
}