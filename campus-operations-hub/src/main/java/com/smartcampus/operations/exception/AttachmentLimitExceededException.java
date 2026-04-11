package com.smartcampus.operations.exception;

public class AttachmentLimitExceededException extends RuntimeException {
    public AttachmentLimitExceededException() {
        super("Maximum of 3 attachments allowed per ticket");
    }
}