package com.evault.notifications.exception;

/**
 * Thrown when the mail subsystem fails to send a message.
 */
public class EmailSendException extends RuntimeException {
    public EmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
