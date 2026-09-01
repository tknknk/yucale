package io.github.tknknk.yucale.config;

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.github.benmanes.caffeine.cache.Ticker;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

@Component
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    /**
     * Hard cap on tracked clients. A plain map keyed by client IP grows for as
     * long as the process lives, which on a 448M container is a slow leak and,
     * for anyone able to source addresses from an IPv6 /64, a cheap way to
     * exhaust the heap deliberately. At roughly 300 bytes per entry this ceiling
     * costs a few MB at worst.
     *
     * <p>Evicting under pressure resets that client's counter, so a flood could
     * in principle push out a legitimate client's bucket. Caffeine's W-TinyLFU
     * favours frequently used entries, which is the opposite of what a
     * one-request-per-address flood produces, and a reset limit is a far better
     * failure than an OutOfMemoryError.
     */
    static final int MAX_TRACKED_CLIENTS = 10_000;

    /**
     * Idle time after which a client's buckets are dropped. Must be at least the
     * longest refill window used below (1 hour), and that is exactly why it is
     * safe: {@code Refill.intervally} hands back the whole quota once the window
     * passes, so a bucket untouched for that long is already indistinguishable
     * from a fresh one. Dropping it changes no decision — it only stops the map
     * from remembering every address that ever connected.
     *
     * <p>Being rate-limited still counts as access, so a client sitting on an
     * exhausted bucket keeps it alive and cannot win an early reset by waiting.
     */
    static final Duration IDLE_RETENTION = Duration.ofHours(1);

    private final Cache<String, Bucket> buckets;

    private final ClientIpResolver clientIpResolver;

    // @Autowired is required, not decorative: a class with a single constructor
    // gets it used implicitly, but adding the test constructor below makes the
    // choice ambiguous and Spring falls back to looking for a no-arg one.
    @Autowired
    public RateLimitFilter(ClientIpResolver clientIpResolver) {
        this(clientIpResolver, Ticker.systemTicker());
    }

    // Visible for tests, which drive expiry off a fake clock rather than waiting
    // an hour.
    RateLimitFilter(ClientIpResolver clientIpResolver, Ticker ticker) {
        this.clientIpResolver = clientIpResolver;
        this.buckets = Caffeine.newBuilder()
                .maximumSize(MAX_TRACKED_CLIENTS)
                .expireAfterAccess(IDLE_RETENTION)
                .ticker(ticker)
                .build();
    }

    /**
     * Number of clients currently tracked. Visible for tests asserting the map
     * stays bounded; Caffeine evicts asynchronously, so pending work is flushed
     * first to make the count deterministic.
     */
    long trackedClientCount() {
        buckets.cleanUp();
        return buckets.estimatedSize();
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        String clientIp = clientIpResolver.resolve(request);
        String path = request.getRequestURI();
        String method = request.getMethod();

        // Skip rate limiting for OPTIONS (CORS preflight)
        if ("OPTIONS".equalsIgnoreCase(method)) {
            chain.doFilter(request, response);
            return;
        }

        String bucketKey = clientIp + ":" + getBucketCategory(path);
        Bucket bucket = buckets.get(bucketKey, k -> createBucket(path));

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
