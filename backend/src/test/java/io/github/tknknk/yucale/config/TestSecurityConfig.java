package io.github.tknknk.yucale.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

import java.io.IOException;

/**
 * テスト用のセキュリティ設定
 * RateLimitFilterのモックを提供する
 */
@TestConfiguration
public class TestSecurityConfig {

    /**
     * テスト用のRateLimitFilter
     * レート制限を行わず、常にリクエストを通過させる
     */
    @Bean
    @Primary
    public RateLimitFilter rateLimitFilter() {
        return new RateLimitFilter() {
            @Override
            protected void doFilterInternal(HttpServletRequest request,
                                            HttpServletResponse response,
                                            FilterChain chain) throws ServletException, IOException {
                // テスト時はレート制限をスキップ
                chain.doFilter(request, response);
            }
        };
    }
}
