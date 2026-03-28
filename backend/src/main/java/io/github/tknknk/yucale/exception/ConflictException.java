package io.github.tknknk.yucale.exception;

/**
 * Exception thrown when a resource conflict occurs (HTTP 409).
 * Used for duplicate email, username, etc.
 */
public class ConflictException extends RuntimeException {
    public ConflictException(String message) {
        super(message);
    }
}
