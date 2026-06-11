package io.github.tknknk.yucale.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * ClientIpResolverのユニットテスト
 * 信頼するプロキシ数に基づくクライアントIP解決と、X-Forwarded-For詐称への耐性を検証する。
 */
class ClientIpResolverTest {

    private MockHttpServletRequest request(String remoteAddr, String xForwardedFor) {
        MockHttpServletRequest req = new MockHttpServletRequest();
        req.setRemoteAddr(remoteAddr);
        if (xForwardedFor != null) {
            req.addHeader("X-Forwarded-For", xForwardedFor);
        }
        return req;
    }

    @Test
    @DisplayName("trustedProxyCount=0ではX-Forwarded-Forを無視してremoteAddrを使う")
    void trustsNoProxy_usesRemoteAddr() {
        ClientIpResolver resolver = new ClientIpResolver(0);
        assertThat(resolver.resolve(request("10.0.0.1", "203.0.113.1, 1.2.3.4")))
                .isEqualTo("10.0.0.1");
    }

    @Test
    @DisplayName("trustedProxyCount=0でヘッダーが無くてもremoteAddrを使う")
    void trustsNoProxy_noHeader() {
        ClientIpResolver resolver = new ClientIpResolver(0);
        assertThat(resolver.resolve(request("192.168.1.1", null)))
                .isEqualTo("192.168.1.1");
    }

    @Test
    @DisplayName("trustedProxyCount=2 (CloudFront+nginx) で実クライアントIPを解決する")
    void trustsTwoProxies_resolvesViewerIp() {
        // chain = [viewer, cloudFrontEdge, nginx(remoteAddr)]
        ClientIpResolver resolver = new ClientIpResolver(2);
        assertThat(resolver.resolve(request("10.0.0.1", "203.0.113.7, 130.176.0.1")))
                .isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("詐称された左側のX-Forwarded-For値は無視される")
    void trustsTwoProxies_ignoresSpoofedPrefix() {
        ClientIpResolver resolver = new ClientIpResolver(2);
        // Attacker prepends a fake IP; the real viewer entry stays fixed from the right.
        assertThat(resolver.resolve(request("10.0.0.1", "1.1.1.1, 203.0.113.7, 130.176.0.1")))
                .isEqualTo("203.0.113.7");
    }

    @Test
    @DisplayName("チェーンが信頼プロキシ数より短い場合は左端を返す")
    void shortChain_returnsLeftmost() {
        ClientIpResolver resolver = new ClientIpResolver(2);
        // chain = [5.5.5.5, remoteAddr]; index would be negative, clamp to 0.
        assertThat(resolver.resolve(request("10.0.0.1", "5.5.5.5")))
                .isEqualTo("5.5.5.5");
    }

    @Test
    @DisplayName("空のX-Forwarded-For値は無視される")
    void blankEntriesIgnored() {
        ClientIpResolver resolver = new ClientIpResolver(1);
        // chain = [203.0.113.7, remoteAddr]; trusted=1 -> client = 203.0.113.7
        assertThat(resolver.resolve(request("10.0.0.1", " , 203.0.113.7")))
                .isEqualTo("203.0.113.7");
    }
}
