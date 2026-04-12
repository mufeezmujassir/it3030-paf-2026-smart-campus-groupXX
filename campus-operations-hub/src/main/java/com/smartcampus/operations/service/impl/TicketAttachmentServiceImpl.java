package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.AttachmentResponse;
import com.smartcampus.operations.entity.IncidentTicket;
import com.smartcampus.operations.entity.TicketAttachment;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.exception.AttachmentLimitExceededException;
import com.smartcampus.operations.exception.TicketNotFoundException;
import com.smartcampus.operations.exception.UnauthorizedTicketAccessException;
import com.smartcampus.operations.exception.UserNotFoundException;
import com.smartcampus.operations.repository.IncidentTicketRepository;
import com.smartcampus.operations.repository.TicketAttachmentRepository;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.TicketAttachmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketAttachmentServiceImpl implements TicketAttachmentService {

    private final TicketAttachmentRepository attachmentRepository;
    private final IncidentTicketRepository ticketRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public AttachmentResponse uploadAttachment(UUID ticketId, MultipartFile file, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(ticketId);

        if (!canAccessTicket(user, ticket)) {
            throw new UnauthorizedTicketAccessException();
        }

        if (attachmentRepository.countByTicketId(ticketId) >= 3) {
            throw new AttachmentLimitExceededException();
        }

        validateImageFile(file);

        try {
            TicketAttachment attachment = TicketAttachment.builder()
                    .ticket(ticket)
                    .fileName(file.getOriginalFilename())
                    .fileType(file.getContentType())
                    .fileSize(file.getSize())
                    .data(file.getBytes())
                    .build();

            return mapToResponse(attachmentRepository.save(attachment));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read file: " + e.getMessage());
        }
    }

    @Override
    public List<AttachmentResponse> getAttachments(UUID ticketId, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(ticketId);

        if (!canAccessTicket(user, ticket)) {
            throw new UnauthorizedTicketAccessException();
        }

        return attachmentRepository.findByTicketId(ticketId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteAttachment(UUID ticketId, UUID attachmentId, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(ticketId);

        if (!canAccessTicket(user, ticket)) {
            throw new UnauthorizedTicketAccessException();
        }

        TicketAttachment attachment = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));

        attachmentRepository.delete(attachment);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private void validateImageFile(MultipartFile file) {
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            throw new IllegalArgumentException("Only image files are allowed");
        }
        if (file.getSize() > 5 * 1024 * 1024) {
            throw new IllegalArgumentException("File size must not exceed 5MB");
        }
    }

    private boolean canAccessTicket(User user, IncidentTicket ticket) {
        return switch (user.getRole()) {
            case ADMIN -> true;
            case TECHNICIAN -> true;
            default -> ticket.getCreatedBy().getId().equals(user.getId());
        };
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }

    private IncidentTicket getTicketOrThrow(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private AttachmentResponse mapToResponse(TicketAttachment attachment) {
        String base64Data = null;
        if (attachment.getData() != null) {
            base64Data = "data:" + attachment.getFileType() + ";base64," +
                    Base64.getEncoder().encodeToString(attachment.getData());
        }

        return AttachmentResponse.builder()
                .id(attachment.getId())
                .fileName(attachment.getFileName())
                .fileType(attachment.getFileType())
                .fileSize(attachment.getFileSize())
                .base64Data(base64Data)
                .uploadedAt(attachment.getUploadedAt())
                .build();
    }
}