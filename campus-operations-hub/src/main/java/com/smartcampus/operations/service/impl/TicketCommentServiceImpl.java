package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.CommentRequest;
import com.smartcampus.operations.dto.CommentResponse;
import com.smartcampus.operations.entity.IncidentTicket;
import com.smartcampus.operations.entity.TicketComment;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.exception.TicketNotFoundException;
import com.smartcampus.operations.exception.UnauthorizedTicketAccessException;
import com.smartcampus.operations.exception.UserNotFoundException;
import com.smartcampus.operations.repository.IncidentTicketRepository;
import com.smartcampus.operations.repository.TicketCommentRepository;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.TicketCommentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TicketCommentServiceImpl implements TicketCommentService {

    private final TicketCommentRepository commentRepository;
    private final IncidentTicketRepository ticketRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional
    public CommentResponse addComment(UUID ticketId, CommentRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);
        IncidentTicket ticket = getTicketOrThrow(ticketId);

        TicketComment comment = TicketComment.builder()
                .ticket(ticket)
                .author(user)
                .content(request.getContent())
                .build();

        return mapToResponse(commentRepository.save(comment));
    }

    @Override
    public List<CommentResponse> getComments(UUID ticketId, String userEmail) {
        getTicketOrThrow(ticketId);
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public CommentResponse updateComment(UUID commentId, CommentRequest request, String userEmail) {
        User user = getUserByEmail(userEmail);

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new UnauthorizedTicketAccessException();
        }

        comment.setContent(request.getContent());
        return mapToResponse(commentRepository.save(comment));
    }

    @Override
    @Transactional
    public void deleteComment(UUID commentId, String userEmail) {
        User user = getUserByEmail(userEmail);

        TicketComment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new RuntimeException("Comment not found"));

        if (!comment.getAuthor().getId().equals(user.getId())) {
            throw new UnauthorizedTicketAccessException();
        }

        commentRepository.delete(comment);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + email));
    }

    private IncidentTicket getTicketOrThrow(UUID id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private CommentResponse mapToResponse(TicketComment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .content(comment.getContent())
                .authorId(comment.getAuthor().getId())
                .authorName(comment.getAuthor().getFullName())
                .createdAt(comment.getCreatedAt())
                .updatedAt(comment.getUpdatedAt())
                .build();
    }
}