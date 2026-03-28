package io.github.tknknk.yucale.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * RateLimitFilterのユニットテスト
 * レート制限機能をテストする
 */
class RateLimitFilterTest {

    private RateLimitFilter rateLimitFilter;
    private MockHttpServletRequest request;
    private MockHttpServletResponse response;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        rateLimitFilter = new RateLimitFilter();
        request = new MockHttpServletRequest();
        response = new MockHttpServletResponse();
        filterChain = mock(FilterChain.class);
    }

    @Nested
    @DisplayName("OPTIONSリクエスト（CORSプリフライト）")
    class OptionsRequestTests {

        @Test
        @DisplayName("OPTIONSリクエストはレート制限をスキップする")
        void optionsRequest_skipsRateLimiting() throws ServletException, IOException {
            // Arrange
            request.setMethod("OPTIONS");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("192.168.1.1");

            // Act - 100回リクエストしてもレート制限されない
            for (int i = 0; i < 100; i++) {
                rateLimitFilter.doFilterInternal(request, response, filterChain);
            }

            // Assert
            verify(filterChain, times(100)).doFilter(request, response);
            assertThat(response.getStatus()).isEqualTo(HttpStatus.OK.value());
        }
    }

    @Nested
    @DisplayName("ログインエンドポイントのレート制限")
    class LoginRateLimitTests {

        @Test
        @DisplayName("5回までのリクエストは許可される")
        void loginEndpoint_allowsFirst5Requests() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("192.168.1.1");

            // Act & Assert - 5回は成功
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
                assertThat(freshResponse.getStatus()).isEqualTo(HttpStatus.OK.value());
            }

            verify(filterChain, times(5)).doFilter(eq(request), any());
        }

        @Test
        @DisplayName("6回目のリクエストは429エラーを返す")
        void loginEndpoint_blocks6thRequest() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("192.168.1.2");

            // Act - 最初の5回
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 6回目
            MockHttpServletResponse sixthResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, sixthResponse, filterChain);

            // Assert
            assertThat(sixthResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
            assertThat(sixthResponse.getContentType()).isEqualTo("application/json;charset=UTF-8");
            assertThat(sixthResponse.getContentAsString()).contains("リクエストが多すぎます");
        }

        @Test
        @DisplayName("異なるIPアドレスは別々にカウントされる")
        void loginEndpoint_differentIpsHaveSeparateLimits() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");

            // Act - IP1から5回
            request.setRemoteAddr("192.168.1.10");
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // IP2からの1回目は成功するべき
            request.setRemoteAddr("192.168.1.11");
            MockHttpServletResponse differentIpResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, differentIpResponse, filterChain);

            // Assert
            assertThat(differentIpResponse.getStatus()).isEqualTo(HttpStatus.OK.value());
        }
    }

    @Nested
    @DisplayName("登録エンドポイントのレート制限")
    class RegisterRateLimitTests {

        @Test
        @DisplayName("3回までのリクエストは許可される")
        void registerEndpoint_allowsFirst3Requests() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/register");
            request.setRemoteAddr("192.168.1.20");

            // Act & Assert - 3回は成功
            for (int i = 0; i < 3; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
                assertThat(freshResponse.getStatus()).isEqualTo(HttpStatus.OK.value());
            }

            verify(filterChain, times(3)).doFilter(eq(request), any());
        }

        @Test
        @DisplayName("4回目のリクエストは429エラーを返す")
        void registerEndpoint_blocks4thRequest() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/register");
            request.setRemoteAddr("192.168.1.21");

            // Act - 最初の3回
            for (int i = 0; i < 3; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 4回目
            MockHttpServletResponse fourthResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, fourthResponse, filterChain);

            // Assert
            assertThat(fourthResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
            assertThat(fourthResponse.getContentAsString()).contains("リクエストが多すぎます");
        }
    }

    @Nested
    @DisplayName("一般APIエンドポイントのレート制限")
    class GeneralApiRateLimitTests {

        @Test
        @DisplayName("1000回までのリクエストは許可される")
        void generalApi_allowsFirst1000Requests() throws ServletException, IOException {
            // Arrange
            request.setMethod("GET");
            request.setRequestURI("/api/schedules");
            request.setRemoteAddr("192.168.1.30");

            // Act - 1000回は成功
            for (int i = 0; i < 1000; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // Assert
            verify(filterChain, times(1000)).doFilter(eq(request), any());
        }

        @Test
        @DisplayName("1001回目のリクエストは429エラーを返す")
        void generalApi_blocks1001stRequest() throws ServletException, IOException {
            // Arrange
            request.setMethod("GET");
            request.setRequestURI("/api/schedules");
            request.setRemoteAddr("192.168.1.31");

            // Act - 最初の1000回
            for (int i = 0; i < 1000; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 1001回目
            MockHttpServletResponse overLimitResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, overLimitResponse, filterChain);

            // Assert
            assertThat(overLimitResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        }
    }

    @Nested
    @DisplayName("X-Forwarded-Forヘッダーの処理")
    class XForwardedForTests {

        @Test
        @DisplayName("X-Forwarded-ForヘッダーからクライアントIPを取得する")
        void xForwardedFor_usesFirstIp() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("10.0.0.1"); // プロキシIP
            request.addHeader("X-Forwarded-For", "203.0.113.1, 70.41.3.18, 150.172.238.178");

            // Act - 203.0.113.1から5回
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 6回目は制限される
            MockHttpServletResponse sixthResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, sixthResponse, filterChain);

            // Assert
            assertThat(sixthResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        }

        @Test
        @DisplayName("X-Forwarded-Forがない場合はremoteAddrを使用する")
        void noXForwardedFor_usesRemoteAddr() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("192.168.1.40");
            // X-Forwarded-Forヘッダーなし

            // Act - 5回リクエスト
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 6回目は制限される
            MockHttpServletResponse sixthResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, sixthResponse, filterChain);

            // Assert
            assertThat(sixthResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        }
    }

    @Nested
    @DisplayName("エンドポイント別のバケットカテゴリ")
    class BucketCategoryTests {

        @Test
        @DisplayName("ログインと登録は別々のバケットを使用する")
        void loginAndRegister_useSeparateBuckets() throws ServletException, IOException {
            // Arrange
            request.setRemoteAddr("192.168.1.50");
            request.setMethod("POST");

            // Act - ログインで5回
            request.setRequestURI("/api/auth/login");
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 登録はまだ3回使える
            request.setRequestURI("/api/auth/register");
            for (int i = 0; i < 3; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
                assertThat(freshResponse.getStatus()).isEqualTo(HttpStatus.OK.value());
            }
        }

        @Test
        @DisplayName("一般APIは異なるパスでも同じバケットを共有する")
        void generalApi_sharesSameBucket() throws ServletException, IOException {
            // Arrange
            request.setRemoteAddr("192.168.1.51");
            request.setMethod("GET");

            // Act - 異なるAPIパスで合計1000回
            for (int i = 0; i < 500; i++) {
                request.setRequestURI("/api/schedules");
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }
            for (int i = 0; i < 500; i++) {
                request.setRequestURI("/api/notices");
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            // 1001回目は制限される
            request.setRequestURI("/api/schedules");
            MockHttpServletResponse overLimitResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, overLimitResponse, filterChain);

            // Assert
            assertThat(overLimitResponse.getStatus()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS.value());
        }
    }

    @Nested
    @DisplayName("レスポンス形式")
    class ResponseFormatTests {

        @Test
        @DisplayName("429レスポンスはJSON形式で返される")
        void rateLimitExceeded_returnsJsonResponse() throws ServletException, IOException {
            // Arrange
            request.setMethod("POST");
            request.setRequestURI("/api/auth/login");
            request.setRemoteAddr("192.168.1.60");

            // Act - 6回リクエスト
            for (int i = 0; i < 5; i++) {
                MockHttpServletResponse freshResponse = new MockHttpServletResponse();
                rateLimitFilter.doFilterInternal(request, freshResponse, filterChain);
            }

            MockHttpServletResponse limitedResponse = new MockHttpServletResponse();
            rateLimitFilter.doFilterInternal(request, limitedResponse, filterChain);

            // Assert
            assertThat(limitedResponse.getStatus()).isEqualTo(429);
            assertThat(limitedResponse.getContentType()).isEqualTo("application/json;charset=UTF-8");
            assertThat(limitedResponse.getContentAsString())
                    .contains("\"success\":false")
                    .contains("\"message\":\"リクエストが多すぎます。しばらくしてから再度お試しください。\"");
        }
    }
}
