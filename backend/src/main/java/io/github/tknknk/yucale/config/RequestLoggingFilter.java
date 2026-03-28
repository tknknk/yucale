package io.github.tknknk.yucale.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import io.github.tknknk.yucale.security.CustomUserDetails;

import java.io.IOException;

/**
 * Filter to log HTTP requests and responses.
 * Logs request method, path, client IP, response status, and duration.
 *
 * Improvements:
 * - Updates MDC with authenticated user after Spring Security filter
 * - Skips OPTIONS requests (CORS preflight) at DEBUG level
 * - Uses appropriate log levels based on response status (WARN for 4xx, ERROR for 5xx)
 */
@Component
@Order(-90)  // After Spring Security (-100) to access authenticated user
@Slf4j
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final String USER_KEY = "user";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String path = request.getRequestURI();

        // Skip logging for health check endpoint
        if (path.equals("/api/health") || path.equals("/api/health/")) {
            chain.doFilter(request, response);
            return;
        }

        String method = request.getMethod();
        String clientIp = getClientIp(request);
        long startTime = System.currentTimeMillis();

        // Log OPTIONS at DEBUG level to reduce noise
        if ("OPTIONS".equals(method)) {
            log.debug("--> {} {} | IP: {}", method, path, clientIp);
            try {
                chain.doFilter(request, response);
            } finally {
                long duration = System.currentTimeMillis() - startTime;
                log.debug("<-- {} {} | Status: {} | Duration: {}ms", method, path, response.getStatus(), duration);
            }
            return;
        }

        log.info("--> {} {} | IP: {}", method, path, clientIp);

        try {
            chain.doFilter(request, response);
        } finally {
            // Update MDC with authenticated user after security filter has run
            updateUserInMDC();

            long duration = System.currentTimeMillis() - startTime;
            int status = response.getStatus();
            logResponse(method, path, status, duration);
        }
    }

    private void updateUserInMDC() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof CustomUserDetails customUserDetails) {
                MDC.put(USER_KEY, customUserDetails.getUsername());
                return;
            }
            if (!"anonymousUser".equals(principal)) {
                MDC.put(USER_KEY, authentication.getName());
                return;
            }
        }
        // Keep as anonymous if not authenticated
    }

    private void logResponse(String method, String path, int status, long duration) {
        String message = "<-- {} {} | Status: {} | Duration: {}ms";

        if (status >= 500) {
            log.error(message, method, path, status, duration);
        } else if (status >= 400) {
            log.warn(message, method, path, status, duration);
        } else {
            log.info(message, method, path, status, duration);
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }
}
