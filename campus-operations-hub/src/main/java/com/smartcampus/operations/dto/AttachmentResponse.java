package com.smartcampus.operations.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class AttachmentResponse {
    private UUID id;
    private String fileName;
    private String fileType;
    private Long fileSize;
    private String base64Data;
    private LocalDateTime uploadedAt;
}