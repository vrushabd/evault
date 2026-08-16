package com.evault.auth.exception;

public class NonceExpiredException extends RuntimeException {
    public NonceExpiredException(String message) {
        super(message);
    }
}
