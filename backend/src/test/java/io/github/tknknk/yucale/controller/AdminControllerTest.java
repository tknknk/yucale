package io.github.tknknk.yucale.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.tknknk.yucale.config.SecurityConfig;
import io.github.tknknk.yucale.config.TestSecurityConfig;
import io.github.tknknk.yucale.dto.AuthRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import io.github.tknknk.yucale.service.AdminService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AdminControllerのユニットテスト
 * 管理者用エンドポイントをテストする
 * 全てのエンドポイントはADMINロールが必要
 */
@WebMvcTest(AdminController.class)
@Import({SecurityConfig.class, TestSecurityConfig.class})
class AdminControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AdminService adminService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // テスト用のAuthRequestDtoを作成
    private AuthRequestDto createTestAuthRequestDto(Long id, RequestStatus status) {
        return AuthRequestDto.builder()
                .id(id)
                .userId(1L)
                .username("testuser")
                .requestedRole(Role.VIEWER)
                .requestMessage("Please grant me viewer access")
                .status(status)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // テスト用のUserDtoを作成
    private UserDto createTestUserDto(Long id, Role role) {
        return UserDto.builder()
                .id(id)
                .username("user" + id)
                .email("user" + id + "@example.com")
                .role(role)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("GET /api/admin/requests - ペンディングリクエスト取得")
    class GetPendingRequestsTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーがペンディングリクエストを取得")
        void getPendingRequests_asAdmin() throws Exception {
            // Arrange
            List<AuthRequestDto> pendingRequests = Arrays.asList(
                    createTestAuthRequestDto(1L, RequestStatus.PENDING),
                    createTestAuthRequestDto(2L, RequestStatus.PENDING)
            );
            when(adminService.getPendingRequests()).thenReturn(pendingRequests);

            // Act & Assert
            mockMvc.perform(get("/api/admin/requests"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("申請中のリクエストを取得しました"))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ペンディングリクエストが空の場合")
        void getPendingRequests_empty() throws Exception {
            // Arrange
            when(adminService.getPendingRequests()).thenReturn(Collections.emptyList());

            // Act & Assert
            mockMvc.perform(get("/api/admin/requests"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(0));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはアクセス拒否")
        void getPendingRequests_asViewer() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/requests"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーはアクセス拒否")
        void getPendingRequests_asEditor() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/requests"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void getPendingRequests_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/requests"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/admin/requests/all - 全リクエスト取得")
    class GetAllRequestsTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーが全リクエストを取得")
        void getAllRequests_asAdmin() throws Exception {
            // Arrange
            List<AuthRequestDto> allRequests = Arrays.asList(
                    createTestAuthRequestDto(1L, RequestStatus.PENDING),
                    createTestAuthRequestDto(2L, RequestStatus.APPROVED),
                    createTestAuthRequestDto(3L, RequestStatus.REJECTED)
            );
            when(adminService.getAllRequests()).thenReturn(allRequests);

            // Act & Assert
            mockMvc.perform(get("/api/admin/requests/all"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("すべてのリクエストを取得しました"))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(3));
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーはアクセス拒否")
        void getAllRequests_asEditor() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/requests/all"))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("PUT /api/admin/requests/{id}/approve - リクエスト承認")
    class ApproveRequestTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("リクエスト承認成功")
        void approveRequest_success() throws Exception {
            // Arrange
            AuthRequestDto approvedRequest = createTestAuthRequestDto(1L, RequestStatus.APPROVED);
            when(adminService.approveRequest(1L)).thenReturn(approvedRequest);

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/approve").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("リクエストを承認しました"))
                    .andExpect(jsonPath("$.data.status").value("APPROVED"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("存在しないリクエストの承認は400エラー")
        void approveRequest_notFound() throws Exception {
            // Arrange
            when(adminService.approveRequest(999L))
                    .thenThrow(new RuntimeException("Request not found with id: 999"));

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/999/approve").with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Request not found with id: 999"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("既に処理済みのリクエストの承認は400エラー")
        void approveRequest_alreadyProcessed() throws Exception {
            // Arrange
            when(adminService.approveRequest(1L))
                    .thenThrow(new RuntimeException("Request has already been processed"));

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/approve").with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Request has already been processed"));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはアクセス拒否")
        void approveRequest_asViewer() throws Exception {
            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/approve").with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("PUT /api/admin/requests/{id}/reject - リクエスト拒否")
    class RejectRequestTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("リクエスト拒否成功（理由なし）")
        void rejectRequest_successWithoutReason() throws Exception {
            // Arrange
            AuthRequestDto rejectedRequest = createTestAuthRequestDto(1L, RequestStatus.REJECTED);
            when(adminService.rejectRequest(anyLong(), any())).thenReturn(rejectedRequest);

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/reject").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("リクエストを却下しました"))
                    .andExpect(jsonPath("$.data.status").value("REJECTED"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("リクエスト拒否成功（理由あり）")
        void rejectRequest_successWithReason() throws Exception {
            // Arrange
            AuthRequestDto rejectedRequest = createTestAuthRequestDto(1L, RequestStatus.REJECTED);
            when(adminService.rejectRequest(anyLong(), anyString())).thenReturn(rejectedRequest);

            Map<String, String> body = new HashMap<>();
            body.put("reason", "Insufficient justification");

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/reject")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(body)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("リクエストを却下しました"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("存在しないリクエストの拒否は400エラー")
        void rejectRequest_notFound() throws Exception {
            // Arrange
            when(adminService.rejectRequest(anyLong(), any()))
                    .thenThrow(new RuntimeException("Request not found with id: 999"));

            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/999/reject").with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Request not found with id: 999"));
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーはアクセス拒否")
        void rejectRequest_asEditor() throws Exception {
            // Act & Assert
            mockMvc.perform(put("/api/admin/requests/1/reject").with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }

    @Nested
    @DisplayName("GET /api/admin/users - 全ユーザー取得")
    class GetAllUsersTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーが全ユーザーを取得")
        void getAllUsers_asAdmin() throws Exception {
            // Arrange
            List<UserDto> users = Arrays.asList(
                    createTestUserDto(1L, Role.ADMIN),
                    createTestUserDto(2L, Role.EDITOR),
                    createTestUserDto(3L, Role.VIEWER),
                    createTestUserDto(4L, Role.NO_ROLE)
            );
            when(adminService.getAllUsers()).thenReturn(users);

            // Act & Assert
            mockMvc.perform(get("/api/admin/users"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("ユーザー一覧を取得しました"))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(4));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはアクセス拒否")
        void getAllUsers_asViewer() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/users"))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void getAllUsers_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/admin/users"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("DELETE /api/admin/users/{id} - ユーザー削除")
    class DeleteUserTests {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ユーザー削除成功")
        void deleteUser_success() throws Exception {
            // Arrange
            doNothing().when(adminService).deleteUser(1L);

            // Act & Assert
            mockMvc.perform(delete("/api/admin/users/1").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("ユーザーを削除しました"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("存在しないユーザーの削除は400エラー")
        void deleteUser_notFound() throws Exception {
            // Arrange
            doThrow(new RuntimeException("User not found with id: 999"))
                    .when(adminService).deleteUser(999L);

            // Act & Assert
            mockMvc.perform(delete("/api/admin/users/999").with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("User not found with id: 999"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーの削除は400エラー")
        void deleteUser_cannotDeleteAdmin() throws Exception {
            // Arrange
            doThrow(new RuntimeException("Cannot delete admin user"))
                    .when(adminService).deleteUser(1L);

            // Act & Assert
            mockMvc.perform(delete("/api/admin/users/1").with(csrf()))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Cannot delete admin user"));
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーはアクセス拒否")
        void deleteUser_asEditor() throws Exception {
            // Act & Assert
            mockMvc.perform(delete("/api/admin/users/1").with(csrf()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void deleteUser_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(delete("/api/admin/users/1").with(csrf()))
                    .andExpect(status().isUnauthorized());
        }
    }
}
