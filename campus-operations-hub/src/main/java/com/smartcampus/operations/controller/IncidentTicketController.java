package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.TicketStatus;
import com.smartcampus.operations.service.IncidentTicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class IncidentTicketController {

    private final IncidentTicketService ticketService;

    @PostMapping
    public ResponseEntity<TicketResponse> createTicket(
            @Valid @RequestBody TicketCreateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ticketService.createTicket(request, userDetails.getUsername()));
    }

    @GetMapping
    public ResponseEntity<List<TicketResponse>> getAllTickets(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) TicketStatus status) {
        if (status != null) {
            return ResponseEntity.ok(ticketService.getTicketsByStatus(status, userDetails.getUsername()));
        }
        return ResponseEntity.ok(ticketService.getAllTickets(userDetails.getUsername()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicketById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.getTicketById(id, userDetails.getUsername()));
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<TicketResponse> updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody TicketStatusUpdateRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.updateTicketStatus(id, request, userDetails.getUsername()));
    }

    @PostMapping("/{id}/assign")
    public ResponseEntity<TicketResponse> assignTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketAssignRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.assignTicket(id, request, userDetails.getUsername()));
    }

    @PatchMapping("/{id}/reject")
    public ResponseEntity<TicketResponse> rejectTicket(
            @PathVariable UUID id,
            @Valid @RequestBody TicketRejectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.rejectTicket(id, request, userDetails.getUsername()));
    }

    @PutMapping("/{id}/resolution")
    public ResponseEntity<TicketResponse> addResolution(
            @PathVariable UUID id,
            @Valid @RequestBody TicketResolutionRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.addResolutionNotes(id, request, userDetails.getUsername()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTicket(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        ticketService.deleteTicket(id, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/auto-assign")
    public ResponseEntity<TicketResponse> autoAssign(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.autoAssignTicket(id, userDetails.getUsername()));
    }

    @GetMapping("/technicians")
    public ResponseEntity<List<com.smartcampus.operations.dto.TechnicianResponse>> getTechnicians() {
        return ResponseEntity.ok(ticketService.getAvailableTechnicians());
    }

    @PatchMapping("/{id}/technician-reject")
    public ResponseEntity<TicketResponse> technicianReject(
            @PathVariable UUID id,
            @Valid @RequestBody TicketRejectRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(ticketService.technicianRejectTicket(id, request, userDetails.getUsername()));
    }
}