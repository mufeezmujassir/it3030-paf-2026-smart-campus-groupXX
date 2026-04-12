package com.smartcampus.operations.exception;

public class UnauthorizedTicketAccessException extends RuntimeException {
    public UnauthorizedTicketAccessException() {
        super("You are not authorized to perform this action on this ticket");
    }
}