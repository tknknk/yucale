package io.github.tknknk.yucale.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class DiscordNotificationService {

    @Value("${discord.webhook.url:}")
    private String webhookUrl;

    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;

    private final RestTemplate restTemplate;

    public DiscordNotificationService() {
        this.restTemplate = new RestTemplate();
    }

    @Async
    public void sendNewRequestNotification(String username, String requestedRole, String message) {
        if (!isWebhookConfigured()) {
            log.debug("Discord webhook not configured, skipping notification");
            return;
        }

        String adminUrl = frontendUrl + "/admin";
        String content = String.format(
                "**New Role Request**\n" +
                "User: `%s`\n" +
                "Requested Role: `%s`\n" +
                "Message: %s\n\n" +
                "Review: %s",
                username,
                requestedRole,
                message != null ? message : "(No message)",
                adminUrl
        );

        sendMessage(content);
    }

    @Async
    public void sendApprovalNotification(String username, String role) {
        if (!isWebhookConfigured()) {
            log.debug("Discord webhook not configured, skipping notification");
            return;
        }

        String content = String.format(
                "**Role Request Approved**\n" +
                "User: `%s`\n" +
                "Role: `%s`",
                username,
                role
        );

        sendMessage(content);
    }

    @Async
    public void sendRejectionNotification(String username, String role, String reason) {
        if (!isWebhookConfigured()) {
            log.debug("Discord webhook not configured, skipping notification");
            return;
        }

        String content = String.format(
                "**Role Request Rejected**\n" +
                "User: `%s`\n" +
                "Requested Role: `%s`\n" +
                "Reason: %s",
                username,
                role,
                reason != null ? reason : "(No reason provided)"
        );

        sendMessage(content);
    }

    private boolean isWebhookConfigured() {
        return webhookUrl != null && !webhookUrl.isEmpty() && !webhookUrl.equals("https://discord.com/api/webhooks/xxx");
    }

    private void sendMessage(String content) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, String> payload = new HashMap<>();
            payload.put("content", content);

            HttpEntity<Map<String, String>> request = new HttpEntity<>(payload, headers);

            restTemplate.postForEntity(webhookUrl, request, String.class);
            log.info("Discord notification sent successfully");
        } catch (Exception e) {
            log.error("Failed to send Discord notification: {}", e.getMessage());
        }
    }
}
