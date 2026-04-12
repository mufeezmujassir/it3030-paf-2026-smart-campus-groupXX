package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.AttachmentResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

public interface TicketAttachmentService {

    AttachmentResponse uploadAttachment(UUID ticketId, MultipartFile file, String userEmail);

    List<AttachmentResponse> getAttachments(UUID ticketId, String userEmail);

    void deleteAttachment(UUID ticketId, UUID attachmentId, String userEmail);
}