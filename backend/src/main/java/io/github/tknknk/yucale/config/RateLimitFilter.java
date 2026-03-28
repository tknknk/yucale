package io.github.tknknk.yucale.config;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String clientIp = getClientIp(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Skip rate limiting for OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        String bucketKey = clientIp + ":" + getBucketCategory(path);
        Bucket bucket = buckets.computeIfAbsent(bucketKey, k -> createBucket(path));

        if (bucket.tryConsume(1)) {
            chain.doFilter(request, response);
        } else {
            String category = getBucketCategory(path);
            log.warn("Rate limit exceeded | IP: {} | path: {} | category: {}", clientIp, path, category);
            response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
            response.setContentType("application/json;charset=UTF-8");
            response.getWriter().write("{\"success\":false,\"message\":\"リクエストが多すぎます。しばらくしてから再度お試しください。\"}");
        }
    }

    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    private String getBucketCategory(String path) {
        if (path.contains("/auth/login")) {
            return "login";
        } else if (path.contains("/auth/register")) {
            return "register";
        } else if (path.startsWith("/api/")) {
            return "api";
        }
        return "default";
    }

    private Bucket createBucket(String path) {
        if (path.contains("/auth/login")) {
            // Login: 5 requests per 15 minutes
            return Bucket.builder()
                    .addLimit(Bandwidth.classic(5, Refill.intervally(5, Duration.ofMinutes(15))))
                    .build();
        } else if (path.contains("/auth/register")) {
            // Register: 3 requests per hour
            return Bucket.builder()
                    .addLimit(Bandwidth.classic(3, Refill.intervally(3, Duration.ofHours(1))))
                    .build();
        }
        // General API: 1000 requests per hour
        return Bucket.builder()
                .addLimit(Bandwidth.classic(1000, Refill.intervally(1000, Duration.ofHours(1))))
                .build();
    }
}
