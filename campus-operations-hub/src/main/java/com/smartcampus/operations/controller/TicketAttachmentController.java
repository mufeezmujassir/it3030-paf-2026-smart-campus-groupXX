package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.AttachmentResponse;
import com.smartcampus.operations.service.TicketAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketAttachmentController {

    private final TicketAttachmentService attachmentService;

    @PostMapping("/{ticketId}/attachments")
    public ResponseEntity<AttachmentResponse> uploadAttachment(
            @PathVariable UUID ticketId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(attachmentService.uploadAttachment(ticketId, file, userDetails.getUsername()));
    }

    @GetMapping("/{ticketId}/attachments")
    public ResponseEntity<List<AttachmentResponse>> getAttachments(
            @PathVariable UUID ticketId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(attachmentService.getAttachments(ticketId, userDetails.getUsername()));
    }

    @DeleteMapping("/{ticketId}/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable UUID ticketId,
            @PathVariable UUID attachmentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        attachmentService.deleteAttachment(ticketId, attachmentId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}