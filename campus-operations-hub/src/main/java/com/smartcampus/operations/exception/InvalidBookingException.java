// src/main/java/com/smartcampus/operations/exception/InvalidBookingException.java
package com.smartcampus.operations.exception;

public class InvalidBookingException extends RuntimeException {
    public InvalidBookingException(String message) {
        super(message);
    }
}