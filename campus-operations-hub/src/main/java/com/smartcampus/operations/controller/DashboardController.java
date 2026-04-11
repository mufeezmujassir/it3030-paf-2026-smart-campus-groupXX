package com.smartcampus.operations.controller;

import com.smartcampus.operations.entity.BookingStatus;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.TicketStatus;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.repository.BookingRepository;
import com.smartcampus.operations.repository.IncidentTicketRepository;
import com.smartcampus.operations.repository.ResourceRepository;
import com.smartcampus.operations.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
public class DashboardController {

    private final UserRepository userRepository;
    private final IncidentTicketRepository ticketRepository;
    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByEmail(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> stats = new HashMap<>();
        Role role = user.getRole();

        if (role == Role.ADMIN) {
            stats.put("totalUsers", userRepository.count());
            stats.put("activeTickets", ticketRepository.countByStatus(TicketStatus.OPEN) + ticketRepository.countByStatus(TicketStatus.IN_PROGRESS));
            stats.put("pendingBookings", bookingRepository.countByStatus(BookingStatus.PENDING));
            stats.put("totalResources", resourceRepository.count());
        } else if (role == Role.STUDENT || role == Role.STAFF) {
            stats.put("myPendingBookings", bookingRepository.countByUserIdAndStatus(user.getId(), BookingStatus.PENDING));
            stats.put("myApprovedBookings", bookingRepository.countByUserIdAndStatus(user.getId(), BookingStatus.APPROVED));
            stats.put("myTotalBookings", bookingRepository.countByUserId(user.getId()));
            stats.put("myTickets", ticketRepository.countByCreatedBy(user));
            if (role == Role.STAFF) {
                stats.put("department", user.getDepartment());
            }
        } else if (role == Role.TECHNICIAN) {
            stats.put("assignedTicketsOpen", ticketRepository.countByAssignedToAndStatus(user, TicketStatus.OPEN));
            stats.put("assignedTicketsInProgress", ticketRepository.countByAssignedToAndStatus(user, TicketStatus.IN_PROGRESS));
            stats.put("assignedTicketsResolved", ticketRepository.countByAssignedToAndStatus(user, TicketStatus.RESOLVED));
            stats.put("totalAssignedTickets", ticketRepository.countByAssignedTo(user));
        }

        return ResponseEntity.ok(stats);
    }
}
