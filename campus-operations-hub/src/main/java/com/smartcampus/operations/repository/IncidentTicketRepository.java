package com.smartcampus.operations.repository;

import com.smartcampus.operations.entity.IncidentTicket;
import com.smartcampus.operations.entity.TicketStatus;
import com.smartcampus.operations.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface IncidentTicketRepository extends JpaRepository<IncidentTicket, UUID> {

    List<IncidentTicket> findByCreatedBy(User createdBy);

    List<IncidentTicket> findByAssignedTo(User assignedTo);

    List<IncidentTicket> findByStatus(TicketStatus status);

    List<IncidentTicket> findByCreatedByAndStatus(User createdBy, TicketStatus status);

    long countByAssignedToAndStatusIn(User assignedTo, List<TicketStatus> statuses);

    // Dashboard count methods
    long countByStatus(TicketStatus status);

    long countByAssignedTo(User assignedTo);

    long countByAssignedToAndStatus(User assignedTo, TicketStatus status);

    long countByCreatedBy(User createdBy);
}