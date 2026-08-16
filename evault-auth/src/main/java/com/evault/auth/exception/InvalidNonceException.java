package com.evault.auth.exception;

public class InvalidNonceException extends RuntimeException {
    public InvalidNonceException(String message) {
        super(message);
    }
}
