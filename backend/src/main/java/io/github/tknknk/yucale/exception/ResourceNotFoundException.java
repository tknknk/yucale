package io.github.tknknk.yucale.exception;

/**
 * Exception thrown when a requested resource is not found (HTTP 404).
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
