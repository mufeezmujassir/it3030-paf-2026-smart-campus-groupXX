package com.smartcampus.operations.exception;

import com.smartcampus.operations.entity.TicketStatus;

public class InvalidStatusTransitionException extends RuntimeException {
    public InvalidStatusTransitionException(TicketStatus from, TicketStatus to) {
        super("Invalid status transition from " + from + " to " + to);
    }
}