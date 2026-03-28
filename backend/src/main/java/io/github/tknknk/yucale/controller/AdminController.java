package io.github.tknknk.yucale.controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import io.github.tknknk.yucale.dto.ApiResponse;
import io.github.tknknk.yucale.dto.AuthRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.service.AdminService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@Slf4j
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/requests")
    public ResponseEntity<ApiResponse<List<AuthRequestDto>>> getPendingRequests() {
        log.info("Fetching pending role requests");
        List<AuthRequestDto> requests = adminService.getPendingRequests();
        return ResponseEntity.ok(ApiResponse.success("申請中のリクエストを取得しました", requests));
    }

    @GetMapping("/requests/all")
    public ResponseEntity<ApiResponse<List<AuthRequestDto>>> getAllRequests() {
        log.info("Fetching all role requests");
        List<AuthRequestDto> requests = adminService.getAllRequests();
        return ResponseEntity.ok(ApiResponse.success("すべてのリクエストを取得しました", requests));
    }

    @PutMapping("/requests/{id}/approve")
    public ResponseEntity<ApiResponse<AuthRequestDto>> approveRequest(@PathVariable Long id) {
        log.info("Approving role request: {}", id);
        try {
            AuthRequestDto request = adminService.approveRequest(id);
            return ResponseEntity.ok(ApiResponse.success("リクエストを承認しました", request));
        } catch (RuntimeException e) {
            log.error("Failed to approve request {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/requests/{id}/reject")
    public ResponseEntity<ApiResponse<AuthRequestDto>> rejectRequest(
            @PathVariable Long id,
            @RequestBody(required = false) Map<String, String> body) {
        log.info("Rejecting role request: {}", id);
        try {
            String reason = body != null ? body.get("reason") : null;
            AuthRequestDto request = adminService.rejectRequest(id, reason);
            return ResponseEntity.ok(ApiResponse.success("リクエストを却下しました", request));
        } catch (RuntimeException e) {
            log.error("Failed to reject request {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<List<UserDto>>> getAllUsers() {
        log.info("Fetching all users");
        List<UserDto> users = adminService.getAllUsers();
        return ResponseEntity.ok(ApiResponse.success("ユーザー一覧を取得しました", users));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteUser(@PathVariable Long id) {
        log.info("Deleting user: {}", id);
        try {
            adminService.deleteUser(id);
            return ResponseEntity.ok(ApiResponse.success("ユーザーを削除しました", null));
        } catch (RuntimeException e) {
            log.error("Failed to delete user {}: {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }
}
