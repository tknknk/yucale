package io.github.tknknk.yucale.config;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

/**
 * Resolves the real client IP from a request, accounting for trusted reverse
 * proxies in front of the application.
 *
 * <p>{@code X-Forwarded-For} is attacker-controllable: a client can send an
 * arbitrary value and every proxy in the chain merely appends to it. Blindly
 * taking the left-most entry (as the previous implementation did) lets a client
 * spoof its IP and bypass per-IP rate limiting. Instead we count a fixed number
 * of trusted proxy hops from the right of the chain {@code [XFF..., remoteAddr]}
 * and treat the entry just before them as the client.</p>
 *
 * <p>Production topology is {@code viewer -> CloudFront -> nginx -> backend}, so
 * the backend sees {@code remoteAddr = nginx} and
 * {@code X-Forwarded-For = [..spoofable.., viewerIp, cloudFrontEdgeIp]}. With
 * {@code trustedProxyCount = 2} (nginx + CloudFront edge) the resolver returns
 * the viewer IP regardless of any spoofed prefix.</p>
 *
 * <p>Default is {@code 0}: no proxy is trusted and {@code remoteAddr} is used,
 * ignoring {@code X-Forwarded-For} entirely. This is the safe default for
 * direct/unknown deployments; set {@code APP_TRUSTED_PROXY_COUNT} to match the
 * real number of trusted hops when running behind proxies.</p>
 */
@Component
public class ClientIpResolver {

    private final int trustedProxyCount;

    public ClientIpResolver(@Value("${app.security.trusted-proxy-count:0}") int trustedProxyCount) {
        this.trustedProxyCount = Math.max(0, trustedProxyCount);
    }

    public String resolve(HttpServletRequest request) {
        String remoteAddr = request.getRemoteAddr();

        if (trustedProxyCount == 0) {
            return remoteAddr;
        }

        // Build the full hop chain as seen by the backend: every X-Forwarded-For
        // entry (left = closest to the original client) followed by the direct
        // peer (remoteAddr).
        List<String> chain = new ArrayList<>();
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            for (String part : xForwardedFor.split(",")) {
                String trimmed = part.trim();
                if (!trimmed.isEmpty()) {
                    chain.add(trimmed);
                }
            }
        }
        chain.add(remoteAddr);

        // The client is the entry immediately to the left of the trusted proxies.
        // Anything further left is client-supplied and untrusted, so we never go
        // past index 0.
        int index = chain.size() - 1 - trustedProxyCount;
        if (index < 0) {
            index = 0;
        }
        return chain.get(index);
    }
}
