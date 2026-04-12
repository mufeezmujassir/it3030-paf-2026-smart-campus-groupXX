package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.CommentRequest;
import com.smartcampus.operations.dto.CommentResponse;

import java.util.List;
import java.util.UUID;

public interface TicketCommentService {

    CommentResponse addComment(UUID ticketId, CommentRequest request, String userEmail);

    List<CommentResponse> getComments(UUID ticketId, String userEmail);

    CommentResponse updateComment(UUID commentId, CommentRequest request, String userEmail);

    void deleteComment(UUID commentId, String userEmail);
}