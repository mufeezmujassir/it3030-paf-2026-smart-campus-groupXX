package com.smartcampus.operations.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
public class CommentResponse {
    private UUID id;
    private String content;
    private UUID authorId;
    private String authorName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}