package com.evault.notifications.exception;

/**
 * Thrown when an unsupported or unknown notification type is requested.
 */
public class InvalidNotificationTypeException extends RuntimeException {
    public InvalidNotificationTypeException(String message) {
        super(message);
    }
}
