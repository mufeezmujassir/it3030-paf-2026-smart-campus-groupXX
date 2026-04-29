package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.CommentRequest;
import com.smartcampus.operations.dto.CommentResponse;
import com.smartcampus.operations.entity.*;
import com.smartcampus.operations.exception.*;
import com.smartcampus.operations.repository.*;
import com.smartcampus.operations.service.impl.TicketCommentServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TicketCommentServiceTest {

    @Mock
    private TicketCommentRepository commentRepository;

    @Mock
    private IncidentTicketRepository ticketRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private TicketCommentServiceImpl commentService;

    private User student;
    private User otherStudent;
    private IncidentTicket ticket;
    private TicketComment comment;

    @BeforeEach
    void setUp() {
        student = User.builder()
                .id(UUID.randomUUID())
                .fullName("Test Student")
                .email("student@campus.com")
                .role(Role.STUDENT)
                .build();

        otherStudent = User.builder()
                .id(UUID.randomUUID())
                .fullName("Other Student")
                .email("other@campus.com")
                .role(Role.STUDENT)
                .build();

        ticket = IncidentTicket.builder()
                .id(UUID.randomUUID())
                .title("Test Ticket")
                .createdBy(student)
                .attachments(new ArrayList<>())
                .comments(new ArrayList<>())
                .build();

        comment = TicketComment.builder()
                .id(UUID.randomUUID())
                .ticket(ticket)
                .author(student)
                .content("This is a test comment")
                .build();
    }

    @Test
    void addComment_shouldSaveAndReturnComment() {
        // Arrange
        CommentRequest request = new CommentRequest();
        request.setContent("This is a test comment");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        CommentResponse response = commentService.addComment(
                ticket.getId(), request, "student@campus.com");

        // Assert
        assertNotNull(response);
        assertEquals("This is a test comment", response.getContent());
        assertEquals("Test Student", response.getAuthorName());
        verify(commentRepository, times(1)).save(any(TicketComment.class));
    }

    @Test
    void updateComment_asAuthor_shouldUpdateContent() {
        // Arrange
        CommentRequest request = new CommentRequest();
        request.setContent("Updated comment content");

        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(commentRepository.findById(comment.getId())).thenReturn(Optional.of(comment));
        when(commentRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        // Act
        CommentResponse response = commentService.updateComment(
                comment.getId(), request, "student@campus.com");

        // Assert
        assertEquals("Updated comment content", response.getContent());
    }

    @Test
    void updateComment_asNonAuthor_shouldThrowUnauthorized() {
        // Arrange
        CommentRequest request = new CommentRequest();
        request.setContent("Trying to edit someone else's comment");

        when(userRepository.findByEmail("other@campus.com")).thenReturn(Optional.of(otherStudent));
        when(commentRepository.findById(comment.getId())).thenReturn(Optional.of(comment));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                commentService.updateComment(comment.getId(), request, "other@campus.com"));
    }

    @Test
    void deleteComment_asAuthor_shouldDelete() {
        // Arrange
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(commentRepository.findById(comment.getId())).thenReturn(Optional.of(comment));
        doNothing().when(commentRepository).delete(any());

        // Act
        assertDoesNotThrow(() ->
                commentService.deleteComment(comment.getId(), "student@campus.com"));

        verify(commentRepository, times(1)).delete(comment);
    }

    @Test
    void deleteComment_asNonAuthor_shouldThrowUnauthorized() {
        // Arrange
        when(userRepository.findByEmail("other@campus.com")).thenReturn(Optional.of(otherStudent));
        when(commentRepository.findById(comment.getId())).thenReturn(Optional.of(comment));

        // Act & Assert
        assertThrows(UnauthorizedTicketAccessException.class, () ->
                commentService.deleteComment(comment.getId(), "other@campus.com"));
    }

    @Test
    void getComments_shouldReturnAllCommentsForTicket() {
        // Arrange
        when(userRepository.findByEmail("student@campus.com")).thenReturn(Optional.of(student));
        when(ticketRepository.findById(ticket.getId())).thenReturn(Optional.of(ticket));
        when(commentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()))
                .thenReturn(List.of(comment));

        // Act
        List<CommentResponse> responses = commentService.getComments(
                ticket.getId(), "student@campus.com");

        // Assert
        assertEquals(1, responses.size());
        assertEquals("This is a test comment", responses.get(0).getContent());
    }
}