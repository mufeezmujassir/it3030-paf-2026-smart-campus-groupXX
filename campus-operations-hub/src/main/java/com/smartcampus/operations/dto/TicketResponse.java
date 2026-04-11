package com.smartcampus.operations.dto;

import com.smartcampus.operations.entity.TicketCategory;
import com.smartcampus.operations.entity.TicketPriority;
import com.smartcampus.operations.entity.TicketStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@Builder
public class TicketResponse {
    private UUID id;
    private String title;
    private TicketCategory category;
    private String description;
    private TicketPriority priority;
    private TicketStatus status;
    private String resourceLocation;
    private String preferredContact;
    private String rejectionReason;
    private String resolutionNotes;
    private UUID createdById;
    private String createdByName;
    private UUID assignedToId;
    private String assignedToName;
    private List<AttachmentResponse> attachments;
    private List<CommentResponse> comments;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}