package io.github.tknknk.yucale.controller;

import io.github.tknknk.yucale.config.SecurityConfig;
import io.github.tknknk.yucale.config.TestSecurityConfig;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * HealthControllerのユニットテスト
 * ヘルスチェックエンドポイントをテストする
 * 全てのエンドポイントは認証不要（パブリックアクセス）
 */
@WebMvcTest(HealthController.class)
@Import({SecurityConfig.class, TestSecurityConfig.class})
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DataSource dataSource;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    @Nested
    @DisplayName("GET /api/health - 基本ヘルスチェック")
    class BasicHealthCheckTests {

        @Test
        @DisplayName("サービスが稼働中の場合、200 OKを返す")
        void health_serviceUp() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/health"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Service is healthy"))
                    .andExpect(jsonPath("$.data.status").value("UP"))
                    .andExpect(jsonPath("$.data.timestamp").exists());
        }

        @Test
        @DisplayName("認証なしでアクセス可能")
        void health_publicAccess() throws Exception {
            // Act & Assert - 認証なしで200 OKが返されることを確認
            mockMvc.perform(get("/api/health"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/health/detailed - 詳細ヘルスチェック")
    class DetailedHealthCheckTests {

        @Test
        @DisplayName("データベース接続が正常な場合、200 OKを返す")
        void detailedHealth_dbUp() throws Exception {
            // Arrange
            Connection mockConnection = mock(Connection.class);
            when(mockConnection.isValid(anyInt())).thenReturn(true);
            when(dataSource.getConnection()).thenReturn(mockConnection);

            // Act & Assert
            mockMvc.perform(get("/api/health/detailed"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Service is healthy"))
                    .andExpect(jsonPath("$.data.status").value("UP"))
                    .andExpect(jsonPath("$.data.database").value("UP"))
                    .andExpect(jsonPath("$.data.timestamp").exists());
        }

        @Test
        @DisplayName("データベース接続が失敗した場合、503 Service Unavailableを返す")
        void detailedHealth_dbDown() throws Exception {
            // Arrange
            when(dataSource.getConnection()).thenThrow(new SQLException("Connection refused"));

            // Act & Assert
            mockMvc.perform(get("/api/health/detailed"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Service is degraded"))
                    .andExpect(jsonPath("$.data.status").value("DEGRADED"))
                    .andExpect(jsonPath("$.data.database").value("DOWN"));
        }

        @Test
        @DisplayName("データベース接続がinvalidな場合、503 Service Unavailableを返す")
        void detailedHealth_dbInvalid() throws Exception {
            // Arrange
            Connection mockConnection = mock(Connection.class);
            when(mockConnection.isValid(anyInt())).thenReturn(false);
            when(dataSource.getConnection()).thenReturn(mockConnection);

            // Act & Assert
            mockMvc.perform(get("/api/health/detailed"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.data.status").value("DEGRADED"))
                    .andExpect(jsonPath("$.data.database").value("DOWN"));
        }

        @Test
        @DisplayName("認証なしでアクセス可能")
        void detailedHealth_publicAccess() throws Exception {
            // Arrange
            Connection mockConnection = mock(Connection.class);
            when(mockConnection.isValid(anyInt())).thenReturn(true);
            when(dataSource.getConnection()).thenReturn(mockConnection);

            // Act & Assert
            mockMvc.perform(get("/api/health/detailed"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/health/ready - レディネスチェック")
    class ReadinessCheckTests {

        @Test
        @DisplayName("サービスがレディ状態の場合、200 OKを返す")
        void readiness_ready() throws Exception {
            // Arrange
            Connection mockConnection = mock(Connection.class);
            when(mockConnection.isValid(anyInt())).thenReturn(true);
            when(dataSource.getConnection()).thenReturn(mockConnection);

            // Act & Assert
            mockMvc.perform(get("/api/health/ready"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Service is ready"))
                    .andExpect(jsonPath("$.data.status").value("READY"))
                    .andExpect(jsonPath("$.data.database").value("READY"))
                    .andExpect(jsonPath("$.data.timestamp").exists());
        }

        @Test
        @DisplayName("データベースがレディでない場合、503 Service Unavailableを返す")
        void readiness_notReady() throws Exception {
            // Arrange
            when(dataSource.getConnection()).thenThrow(new SQLException("Database not ready"));

            // Act & Assert
            mockMvc.perform(get("/api/health/ready"))
                    .andExpect(status().isServiceUnavailable())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Service is not ready"))
                    .andExpect(jsonPath("$.data.status").value("NOT_READY"))
                    .andExpect(jsonPath("$.data.database").value("NOT_READY"));
        }

        @Test
        @DisplayName("認証なしでアクセス可能")
        void readiness_publicAccess() throws Exception {
            // Arrange
            Connection mockConnection = mock(Connection.class);
            when(mockConnection.isValid(anyInt())).thenReturn(true);
            when(dataSource.getConnection()).thenReturn(mockConnection);

            // Act & Assert
            mockMvc.perform(get("/api/health/ready"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/health/live - ライブネスチェック")
    class LivenessCheckTests {

        @Test
        @DisplayName("サービスが稼働中の場合、200 OKを返す")
        void liveness_alive() throws Exception {
            // Act & Assert - ライブネスチェックはDB接続に依存しない
            mockMvc.perform(get("/api/health/live"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("Service is alive"))
                    .andExpect(jsonPath("$.data.status").value("ALIVE"))
                    .andExpect(jsonPath("$.data.timestamp").exists());
        }

        @Test
        @DisplayName("データベースがダウンしていてもライブネスは成功")
        void liveness_aliveEvenWhenDbDown() throws Exception {
            // Arrange - DBがダウンしていても
            when(dataSource.getConnection()).thenThrow(new SQLException("Database down"));

            // Act & Assert - ライブネスは200 OKを返す
            mockMvc.perform(get("/api/health/live"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.status").value("ALIVE"));
        }

        @Test
        @DisplayName("認証なしでアクセス可能")
        void liveness_publicAccess() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/health/live"))
                    .andExpect(status().isOk());
        }
    }
}
