package io.github.tknknk.yucale.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.github.tknknk.yucale.dto.ApiResponse;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

/**
 * Health check controller for ALB and monitoring.
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private final DataSource dataSource;

    @Autowired
    public HealthController(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    /**
     * Simple health check endpoint for ALB.
     * Returns 200 OK if the application is running.
     */
    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> health() {
        Map<String, Object> healthInfo = new HashMap<>();
        healthInfo.put("status", "UP");
        healthInfo.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Service is healthy", healthInfo));
    }

    /**
     * Detailed health check endpoint including database connectivity.
     * Used for more thorough health monitoring.
     */
    @GetMapping("/health/detailed")
    public ResponseEntity<ApiResponse<Map<String, Object>>> detailedHealth() {
        Map<String, Object> healthInfo = new HashMap<>();
        healthInfo.put("timestamp", Instant.now().toString());

        // Check database connectivity
        boolean dbHealthy = checkDatabaseHealth();
        healthInfo.put("database", dbHealthy ? "UP" : "DOWN");

        // Overall status
        String overallStatus = dbHealthy ? "UP" : "DEGRADED";
        healthInfo.put("status", overallStatus);

        if (dbHealthy) {
            return ResponseEntity.ok(ApiResponse.success("Service is healthy", healthInfo));
        } else {
            return ResponseEntity.status(503)
                    .body(ApiResponse.error("Service is degraded", healthInfo));
        }
    }

    /**
     * Readiness check endpoint.
     * Returns 200 if the service is ready to accept traffic.
     */
    @GetMapping("/health/ready")
    public ResponseEntity<ApiResponse<Map<String, Object>>> readiness() {
        Map<String, Object> readinessInfo = new HashMap<>();
        readinessInfo.put("timestamp", Instant.now().toString());

        boolean dbReady = checkDatabaseHealth();
        readinessInfo.put("database", dbReady ? "READY" : "NOT_READY");

        if (dbReady) {
            readinessInfo.put("status", "READY");
            return ResponseEntity.ok(ApiResponse.success("Service is ready", readinessInfo));
        } else {
            readinessInfo.put("status", "NOT_READY");
            return ResponseEntity.status(503)
                    .body(ApiResponse.error("Service is not ready", readinessInfo));
        }
    }

    /**
     * Liveness check endpoint.
     * Returns 200 if the service is alive (application is running).
     */
    @GetMapping("/health/live")
    public ResponseEntity<ApiResponse<Map<String, Object>>> liveness() {
        Map<String, Object> livenessInfo = new HashMap<>();
        livenessInfo.put("status", "ALIVE");
        livenessInfo.put("timestamp", Instant.now().toString());

        return ResponseEntity.ok(ApiResponse.success("Service is alive", livenessInfo));
    }

    private boolean checkDatabaseHealth() {
        try (Connection connection = dataSource.getConnection()) {
            return connection.isValid(5);
        } catch (SQLException e) {
            return false;
        }
    }
}
