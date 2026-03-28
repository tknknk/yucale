package io.github.tknknk.yucale.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Filter to set MDC (Mapped Diagnostic Context) values for logging.
 * Sets requestId for each request. User info is handled by RequestLoggingFilter
 * after Spring Security authentication completes.
 */
@Component
@Order(-91)  // Before RequestLoggingFilter (-90), after Spring Security (-100)
public class MDCFilter extends OncePerRequestFilter {

    private static final String REQUEST_ID_KEY = "requestId";
    private static final String USER_KEY = "user";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            // Generate unique request ID (8 characters from UUID)
            String requestId = UUID.randomUUID().toString().substring(0, 8);
            MDC.put(REQUEST_ID_KEY, requestId);
            // Set initial user as anonymous; will be updated by RequestLoggingFilter after auth
            MDC.put(USER_KEY, "anonymous");

            chain.doFilter(request, response);
        } finally {
            MDC.remove(REQUEST_ID_KEY);
            MDC.remove(USER_KEY);
        }
    }
}
