package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.CommentRequest;
import com.smartcampus.operations.dto.CommentResponse;
import com.smartcampus.operations.service.TicketCommentService;
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
public class TicketCommentController {

    private final TicketCommentService commentService;

    @PostMapping("/{ticketId}/comments")
    public ResponseEntity<CommentResponse> addComment(
            @PathVariable UUID ticketId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(commentService.addComment(ticketId, request, userDetails.getUsername()));
    }

    @GetMapping("/{ticketId}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(
            @PathVariable UUID ticketId,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(commentService.getComments(ticketId, userDetails.getUsername()));
    }

    @PutMapping("/comments/{commentId}")
    public ResponseEntity<CommentResponse> updateComment(
            @PathVariable UUID commentId,
            @Valid @RequestBody CommentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(commentService.updateComment(commentId, request, userDetails.getUsername()));
    }

    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable UUID commentId,
            @AuthenticationPrincipal UserDetails userDetails) {
        commentService.deleteComment(commentId, userDetails.getUsername());
        return ResponseEntity.noContent().build();
    }
}