package io.github.tknknk.yucale.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.tknknk.yucale.config.SecurityConfig;
import io.github.tknknk.yucale.config.TestSecurityConfig;
import io.github.tknknk.yucale.dto.RegisterRequest;
import io.github.tknknk.yucale.dto.RoleRequestDto;
import io.github.tknknk.yucale.dto.UpdateUsernameRequest;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import io.github.tknknk.yucale.service.AuthService;
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

import jakarta.servlet.http.HttpServletRequest;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * AuthControllerのユニットテスト
 * 認証関連のエンドポイントをテストする
 */
@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, TestSecurityConfig.class})
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private AuthService authService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // テスト用のユーザーデータを作成
    private UserDto createTestUserDto() {
        return UserDto.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .role(Role.VIEWER)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("POST /api/auth/register - ユーザー登録")
    class RegisterTests {

        @Test
        @DisplayName("正常なリクエストで登録成功")
        void register_success() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("newuser")
                    .email("newuser@example.com")
                    .password("password123")
                    .build();

            UserDto createdUser = UserDto.builder()
                    .id(1L)
                    .username("newuser")
                    .email("newuser@example.com")
                    .role(Role.NO_ROLE)
                    .createdAt(LocalDateTime.now())
                    .build();

            // Create a mock UserDetails for auto-login
            org.springframework.security.core.userdetails.User mockUserDetails =
                new org.springframework.security.core.userdetails.User(
                    "newuser@example.com",
                    "password",
                    java.util.Collections.singletonList(
                        new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_NO_ROLE")
                    )
                );

            when(authService.register(any(RegisterRequest.class))).thenReturn(createdUser);
            when(customUserDetailsService.loadUserByUsername("newuser@example.com")).thenReturn(mockUserDetails);

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("登録が完了しました"))
                    .andExpect(jsonPath("$.data.username").value("newuser"))
                    .andExpect(jsonPath("$.data.email").value("newuser@example.com"));
        }

        @Test
        @DisplayName("ユーザー名が重複している場合は400エラー")
        void register_duplicateUsername() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("existinguser")
                    .email("new@example.com")
                    .password("password123")
                    .build();

            when(authService.register(any(RegisterRequest.class)))
                    .thenThrow(new IllegalArgumentException("Username is already taken"));

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Username is already taken"));
        }

        @Test
        @DisplayName("メールアドレスが重複している場合は400エラー")
        void register_duplicateEmail() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("newuser")
                    .email("existing@example.com")
                    .password("password123")
                    .build();

            when(authService.register(any(RegisterRequest.class)))
                    .thenThrow(new IllegalArgumentException("Email is already in use"));

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Email is already in use"));
        }

        @Test
        @DisplayName("バリデーションエラー：ユーザー名が空")
        void register_emptyUsername() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("")
                    .email("test@example.com")
                    .password("password123")
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("バリデーションエラー：メールアドレスが不正")
        void register_invalidEmail() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("testuser")
                    .email("invalid-email")
                    .password("password123")
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @DisplayName("バリデーションエラー：パスワードが短すぎる")
        void register_shortPassword() throws Exception {
            // Arrange
            RegisterRequest request = RegisterRequest.builder()
                    .username("testuser")
                    .email("test@example.com")
                    .password("123")
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET /api/auth/me - 現在のユーザー取得")
    class GetCurrentUserTests {

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("認証済みユーザーの情報を取得")
        void getCurrentUser_authenticated() throws Exception {
            // Arrange
            UserDto userDto = createTestUserDto();
            when(authService.getCurrentUserAndRefreshSession(any(HttpServletRequest.class))).thenReturn(userDto);

            // Act & Assert
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("ユーザー情報を取得しました"))
                    .andExpect(jsonPath("$.data.username").value("testuser"));
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void getCurrentUser_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("ユーザーが見つからない場合は401エラー")
        void getCurrentUser_notFound() throws Exception {
            // Arrange
            when(authService.getCurrentUserAndRefreshSession(any(HttpServletRequest.class)))
                    .thenThrow(new IllegalStateException("User not found"));

            // Act & Assert
            mockMvc.perform(get("/api/auth/me"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("User not found"));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/request-role - 権限リクエスト")
    class RequestRoleTests {

        @Test
        @WithMockUser(username = "testuser", roles = "NO_ROLE")
        @DisplayName("権限リクエストの送信成功")
        void requestRole_success() throws Exception {
            // Arrange
            RoleRequestDto request = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .message("Please grant me viewer access")
                    .build();

            User testUser = User.builder()
                    .id(1L)
                    .username("testuser")
                    .email("test@example.com")
                    .role(Role.NO_ROLE)
                    .build();

            AuthRequest authRequest = AuthRequest.builder()
                    .id(1L)
                    .user(testUser)
                    .requestedRole(Role.VIEWER)
                    .requestMessage("Please grant me viewer access")
                    .status(RequestStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(authService.requestRole(any(RoleRequestDto.class))).thenReturn(authRequest);

            // Act & Assert
            mockMvc.perform(post("/api/auth/request-role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("権限リクエストを送信しました"))
                    .andExpect(jsonPath("$.data.requestedRole").value("VIEWER"));
        }

        @Test
        @WithMockUser(username = "testuser", roles = "NO_ROLE")
        @DisplayName("既にペンディングリクエストがある場合は400エラー")
        void requestRole_alreadyPending() throws Exception {
            // Arrange
            RoleRequestDto request = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .build();

            when(authService.requestRole(any(RoleRequestDto.class)))
                    .thenThrow(new IllegalStateException("You already have a pending role request"));

            // Act & Assert
            mockMvc.perform(post("/api/auth/request-role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("You already have a pending role request"));
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void requestRole_unauthenticated() throws Exception {
            // Arrange
            RoleRequestDto request = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/auth/request-role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("POST /api/auth/refresh - セッションリフレッシュ")
    class RefreshSessionTests {

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("認証済みユーザーのセッションリフレッシュ成功")
        void refreshSession_authenticated() throws Exception {
            // Arrange
            UserDto userDto = createTestUserDto();
            when(authService.getCurrentUser()).thenReturn(userDto);

            // Act & Assert
            mockMvc.perform(post("/api/auth/refresh"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("セッションを更新しました"));
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void refreshSession_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(post("/api/auth/refresh"))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("セッション期限切れの場合は401エラー")
        void refreshSession_expired() throws Exception {
            // Arrange
            when(authService.getCurrentUser())
                    .thenThrow(new IllegalStateException("Session expired"));

            // Act & Assert
            mockMvc.perform(post("/api/auth/refresh"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("セッションが切れました"));
        }
    }

    @Nested
    @DisplayName("GET /api/auth/csrf - CSRFトークン取得")
    class GetCsrfTokenTests {

        @Test
        @WithMockUser
        @DisplayName("認証済みユーザーがCSRFトークンを取得")
        void getCsrfToken_success() throws Exception {
            // Act & Assert - CSRFトークンがない場合のレスポンス確認
            mockMvc.perform(get("/api/auth/csrf"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void getCsrfToken_unauthenticated() throws Exception {
            mockMvc.perform(get("/api/auth/csrf"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("PUT /api/auth/username - ユーザー名更新")
    class UpdateUsernameTests {

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("ユーザー名更新成功")
        void updateUsername_success() throws Exception {
            // Arrange
            UpdateUsernameRequest request = new UpdateUsernameRequest("newusername");

            UserDto updatedUser = UserDto.builder()
                    .id(1L)
                    .username("newusername")
                    .email("test@example.com")
                    .role(Role.VIEWER)
                    .build();

            when(authService.updateUsername(anyString())).thenReturn(updatedUser);

            // Act & Assert
            mockMvc.perform(put("/api/auth/username")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("ユーザー名を更新しました"))
                    .andExpect(jsonPath("$.data.username").value("newusername"));
        }

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("同じユーザー名の場合は400エラー")
        void updateUsername_sameUsername() throws Exception {
            // Arrange
            UpdateUsernameRequest request = new UpdateUsernameRequest("testuser");

            when(authService.updateUsername(anyString()))
                    .thenThrow(new IllegalArgumentException("New username is the same as current username"));

            // Act & Assert
            mockMvc.perform(put("/api/auth/username")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("New username is the same as current username"));
        }

        @Test
        @WithMockUser(username = "testuser", roles = "VIEWER")
        @DisplayName("ユーザー名が既に使用中の場合は400エラー")
        void updateUsername_alreadyTaken() throws Exception {
            // Arrange
            UpdateUsernameRequest request = new UpdateUsernameRequest("existinguser");

            when(authService.updateUsername(anyString()))
                    .thenThrow(new IllegalArgumentException("Username is already taken"));

            // Act & Assert
            mockMvc.perform(put("/api/auth/username")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Username is already taken"));
        }

        @Test
        @DisplayName("未認証ユーザーは401エラー")
        void updateUsername_unauthenticated() throws Exception {
            // Arrange
            UpdateUsernameRequest request = new UpdateUsernameRequest("newusername");

            // Act & Assert
            mockMvc.perform(put("/api/auth/username")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }
    }
}
