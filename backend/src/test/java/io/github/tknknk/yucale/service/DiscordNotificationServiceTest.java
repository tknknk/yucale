package io.github.tknknk.yucale.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * DiscordNotificationServiceのユニットテスト
 * Discord Webhook通知機能をテスト
 */
@ExtendWith(MockitoExtension.class)
class DiscordNotificationServiceTest {

    @Mock
    private RestTemplate restTemplate;

    private DiscordNotificationService discordNotificationService;

    private static final String VALID_WEBHOOK_URL = "https://discord.com/api/webhooks/123456/abcdef";
    private static final String FRONTEND_URL = "http://localhost:3000";

    @BeforeEach
    void setUp() {
        discordNotificationService = new DiscordNotificationService();
        // RestTemplateをモックに置き換え
        ReflectionTestUtils.setField(discordNotificationService, "restTemplate", restTemplate);
        ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", VALID_WEBHOOK_URL);
        ReflectionTestUtils.setField(discordNotificationService, "frontendUrl", FRONTEND_URL);
    }

    @Nested
    @DisplayName("sendNewRequestNotification - 新規リクエスト通知")
    class SendNewRequestNotificationTests {

        @Test
        @DisplayName("正常にDiscord通知が送信される")
        void shouldSendNotificationSuccessfully() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendNewRequestNotification("testuser", "EDITOR", "Please approve");

            // 検証
            @SuppressWarnings("unchecked")
            ArgumentCaptor<HttpEntity<Map<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(eq(VALID_WEBHOOK_URL), captor.capture(), eq(String.class));

            HttpEntity<Map<String, String>> request = captor.getValue();
            String content = request.getBody().get("content");
            assertThat(content).contains("testuser");
            assertThat(content).contains("EDITOR");
            assertThat(content).contains("Please approve");
            assertThat(content).contains(FRONTEND_URL + "/admin");
        }

        @Test
        @DisplayName("メッセージがnullの場合、デフォルトメッセージが使用される")
        void shouldUseDefaultMessageWhenNull() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendNewRequestNotification("testuser", "VIEWER", null);

            // 検証
            @SuppressWarnings("unchecked")
            ArgumentCaptor<HttpEntity<Map<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(eq(VALID_WEBHOOK_URL), captor.capture(), eq(String.class));

            String content = captor.getValue().getBody().get("content");
            assertThat(content).contains("(No message)");
        }

        @Test
        @DisplayName("Webhook URLが未設定の場合、通知をスキップ")
        void shouldSkipWhenWebhookNotConfigured() {
            // 準備: Webhook URLを空に設定
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", "");

            // 実行
            discordNotificationService.sendNewRequestNotification("testuser", "EDITOR", "test");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }

        @Test
        @DisplayName("Webhook URLがデフォルト値の場合、通知をスキップ")
        void shouldSkipWhenWebhookIsDefault() {
            // 準備: デフォルトURLを設定
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", "https://discord.com/api/webhooks/xxx");

            // 実行
            discordNotificationService.sendNewRequestNotification("testuser", "EDITOR", "test");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }

        @Test
        @DisplayName("通信エラー時も例外をスローしない")
        void shouldNotThrowExceptionOnError() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new RestClientException("Connection failed"));

            // 実行・検証: 例外がスローされないこと
            discordNotificationService.sendNewRequestNotification("testuser", "EDITOR", "test");

            // 検証
            verify(restTemplate).postForEntity(anyString(), any(HttpEntity.class), eq(String.class));
        }
    }

    @Nested
    @DisplayName("sendApprovalNotification - 承認通知")
    class SendApprovalNotificationTests {

        @Test
        @DisplayName("正常に承認通知が送信される")
        void shouldSendApprovalNotificationSuccessfully() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendApprovalNotification("testuser", "EDITOR");

            // 検証
            @SuppressWarnings("unchecked")
            ArgumentCaptor<HttpEntity<Map<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(eq(VALID_WEBHOOK_URL), captor.capture(), eq(String.class));

            String content = captor.getValue().getBody().get("content");
            assertThat(content).contains("Role Request Approved");
            assertThat(content).contains("testuser");
            assertThat(content).contains("EDITOR");
        }

        @Test
        @DisplayName("Webhook未設定時は通知をスキップ")
        void shouldSkipWhenWebhookNotConfigured() {
            // 準備
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", null);

            // 実行
            discordNotificationService.sendApprovalNotification("testuser", "ADMIN");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }
    }

    @Nested
    @DisplayName("sendRejectionNotification - 拒否通知")
    class SendRejectionNotificationTests {

        @Test
        @DisplayName("正常に拒否通知が送信される")
        void shouldSendRejectionNotificationSuccessfully() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendRejectionNotification("testuser", "ADMIN", "Not eligible");

            // 検証
            @SuppressWarnings("unchecked")
            ArgumentCaptor<HttpEntity<Map<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(eq(VALID_WEBHOOK_URL), captor.capture(), eq(String.class));

            String content = captor.getValue().getBody().get("content");
            assertThat(content).contains("Role Request Rejected");
            assertThat(content).contains("testuser");
            assertThat(content).contains("ADMIN");
            assertThat(content).contains("Not eligible");
        }

        @Test
        @DisplayName("理由がnullの場合、デフォルトメッセージが使用される")
        void shouldUseDefaultReasonWhenNull() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendRejectionNotification("testuser", "EDITOR", null);

            // 検証
            @SuppressWarnings("unchecked")
            ArgumentCaptor<HttpEntity<Map<String, String>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
            verify(restTemplate).postForEntity(eq(VALID_WEBHOOK_URL), captor.capture(), eq(String.class));

            String content = captor.getValue().getBody().get("content");
            assertThat(content).contains("(No reason provided)");
        }

        @Test
        @DisplayName("通信エラー時も例外をスローしない")
        void shouldNotThrowExceptionOnError() {
            // 準備
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenThrow(new RestClientException("Timeout"));

            // 実行・検証: 例外がスローされないこと
            discordNotificationService.sendRejectionNotification("testuser", "EDITOR", "test");
        }
    }

    @Nested
    @DisplayName("isWebhookConfigured - Webhook設定確認")
    class IsWebhookConfiguredTests {

        @Test
        @DisplayName("有効なURLが設定されている場合、通知が送信される")
        void shouldSendWhenValidUrlConfigured() {
            // 準備
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", VALID_WEBHOOK_URL);
            when(restTemplate.postForEntity(anyString(), any(HttpEntity.class), eq(String.class)))
                    .thenReturn(new ResponseEntity<>("OK", HttpStatus.OK));

            // 実行
            discordNotificationService.sendApprovalNotification("user", "VIEWER");

            // 検証
            verify(restTemplate).postForEntity(anyString(), any(), any());
        }

        @Test
        @DisplayName("URLがnullの場合、通知をスキップ")
        void shouldSkipWhenUrlIsNull() {
            // 準備
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", null);

            // 実行
            discordNotificationService.sendApprovalNotification("user", "VIEWER");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }

        @Test
        @DisplayName("URLが空文字の場合、通知をスキップ")
        void shouldSkipWhenUrlIsEmpty() {
            // 準備
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", "");

            // 実行
            discordNotificationService.sendApprovalNotification("user", "VIEWER");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }

        @Test
        @DisplayName("プレースホルダーURLの場合、通知をスキップ")
        void shouldSkipWhenUrlIsPlaceholder() {
            // 準備
            ReflectionTestUtils.setField(discordNotificationService, "webhookUrl", "https://discord.com/api/webhooks/xxx");

            // 実行
            discordNotificationService.sendApprovalNotification("user", "VIEWER");

            // 検証
            verify(restTemplate, never()).postForEntity(anyString(), any(), any());
        }
    }
}
