package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.TicketStatus;

import java.util.List;
import java.util.UUID;

public interface IncidentTicketService {

    TicketResponse createTicket(TicketCreateRequest request, String userEmail);

    TicketResponse getTicketById(UUID id, String userEmail);

    List<TicketResponse> getAllTickets(String userEmail);

    List<TicketResponse> getTicketsByStatus(TicketStatus status, String userEmail);

    TicketResponse updateTicketStatus(UUID id, TicketStatusUpdateRequest request, String userEmail);

    TicketResponse assignTicket(UUID id, TicketAssignRequest request, String userEmail);

    TicketResponse rejectTicket(UUID id, TicketRejectRequest request, String userEmail);

    TicketResponse addResolutionNotes(UUID id, TicketResolutionRequest request, String userEmail);

    void deleteTicket(UUID id, String userEmail);

    TicketResponse autoAssignTicket(UUID id, String userEmail);

    List<com.smartcampus.operations.dto.TechnicianResponse> getAvailableTechnicians();
}