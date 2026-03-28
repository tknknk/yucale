package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.dto.RegisterRequest;
import io.github.tknknk.yucale.dto.RoleRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.exception.ConflictException;
import io.github.tknknk.yucale.exception.ResourceNotFoundException;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.AuthRequestRepository;
import io.github.tknknk.yucale.repository.SurveyResponseRepository;
import io.github.tknknk.yucale.repository.UserRepository;
import io.github.tknknk.yucale.security.CustomUserDetails;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * AuthServiceのユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuthRequestRepository authRequestRepository;

    @Mock
    private SurveyResponseRepository surveyResponseRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private DiscordNotificationService discordNotificationService;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private AuthService authService;

    private User testUser;
    private RegisterRequest registerRequest;

    @BeforeEach
    void setUp() {
        // テスト用ユーザーの作成
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedPassword")
                .role(Role.NO_ROLE)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // テスト用登録リクエストの作成
        registerRequest = RegisterRequest.builder()
                .username("newuser")
                .email("newuser@example.com")
                .password("password123")
                .build();
    }

    // ============================================
    // register() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("register() のテスト")
    class RegisterTests {

        @Test
        @DisplayName("正常系: 新規ユーザー登録が成功する")
        void register_success() {
            // Arrange
            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

            User savedUser = User.builder()
                    .id(1L)
                    .username(registerRequest.getUsername())
                    .email(registerRequest.getEmail())
                    .passwordHash("encodedPassword")
                    .role(Role.NO_ROLE)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.save(any(User.class))).thenReturn(savedUser);

            // Act
            UserDto result = authService.register(registerRequest);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getUsername()).isEqualTo(registerRequest.getUsername());
            assertThat(result.getEmail()).isEqualTo(registerRequest.getEmail());
            assertThat(result.getRole()).isEqualTo(Role.NO_ROLE);

            verify(userRepository).existsByUsername(registerRequest.getUsername());
            verify(userRepository).existsByEmail(registerRequest.getEmail());
            verify(passwordEncoder).encode(registerRequest.getPassword());
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("正常系: 管理者メールアドレスで登録するとADMINロールが付与される")
        void register_withAdminEmail_assignsAdminRole() {
            // Arrange
            String adminEmail = "admin@example.com";
            ReflectionTestUtils.setField(authService, "adminEmail", adminEmail);

            RegisterRequest adminRequest = RegisterRequest.builder()
                    .username("adminuser")
                    .email(adminEmail)
                    .password("password123")
                    .build();

            when(userRepository.existsByUsername(anyString())).thenReturn(false);
            when(userRepository.existsByEmail(anyString())).thenReturn(false);
            when(passwordEncoder.encode(anyString())).thenReturn("encodedPassword");

            User savedUser = User.builder()
                    .id(1L)
                    .username(adminRequest.getUsername())
                    .email(adminRequest.getEmail())
                    .passwordHash("encodedPassword")
                    .role(Role.ADMIN)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.save(any(User.class))).thenReturn(savedUser);

            // Act
            UserDto result = authService.register(adminRequest);

            // Assert
            assertThat(result.getRole()).isEqualTo(Role.ADMIN);
        }

        @Test
        @DisplayName("異常系: ユーザー名が既に存在する場合はConflictExceptionをスロー")
        void register_duplicateUsername_throwsException() {
            // Arrange
            when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("このユーザー名は既に使用されています");

            verify(userRepository).existsByUsername(registerRequest.getUsername());
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("異常系: メールアドレスが既に存在する場合はConflictExceptionをスロー")
        void register_duplicateEmail_throwsException() {
            // Arrange
            when(userRepository.existsByUsername(registerRequest.getUsername())).thenReturn(false);
            when(userRepository.existsByEmail(registerRequest.getEmail())).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> authService.register(registerRequest))
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("このメールアドレスは既に登録されています");

            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ============================================
    // getCurrentUser() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getCurrentUser() のテスト")
    class GetCurrentUserTests {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.setContext(securityContext);
        }

        @Test
        @DisplayName("正常系: 認証されたユーザー情報を取得できる")
        void getCurrentUser_success() {
            // Arrange
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

            // Act
            UserDto result = authService.getCurrentUser();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(testUser.getId());
            assertThat(result.getUsername()).isEqualTo(testUser.getUsername());
            assertThat(result.getEmail()).isEqualTo(testUser.getEmail());
        }

        @Test
        @DisplayName("異常系: 認証されていない場合はIllegalStateExceptionをスロー")
        void getCurrentUser_notAuthenticated_throwsException() {
            // Arrange
            when(securityContext.getAuthentication()).thenReturn(null);

            // Act & Assert
            assertThatThrownBy(() -> authService.getCurrentUser())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("認証されたユーザーが見つかりません");
        }

        @Test
        @DisplayName("異常系: ユーザーが見つからない場合はResourceNotFoundExceptionをスロー")
        void getCurrentUser_userNotFound_throwsException() {
            // Arrange
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> authService.getCurrentUser())
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ユーザーが見つかりません");
        }
    }

    // ============================================
    // getCurrentUserAndRefreshSession() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getCurrentUserAndRefreshSession() のテスト")
    class GetCurrentUserAndRefreshSessionTests {

        @Mock
        private HttpServletRequest request;

        @Mock
        private HttpSession session;

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.setContext(securityContext);
        }

        @Test
        @DisplayName("正常系: セッションをリフレッシュしてユーザー情報を取得できる")
        void getCurrentUserAndRefreshSession_success() {
            // Arrange
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(request.getSession(false)).thenReturn(session);

            // Act
            UserDto result = authService.getCurrentUserAndRefreshSession(request);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(testUser.getId());
            verify(session).setAttribute(anyString(), any(SecurityContext.class));
        }

        @Test
        @DisplayName("正常系: セッションがnullの場合でもユーザー情報を取得できる")
        void getCurrentUserAndRefreshSession_nullSession_success() {
            // Arrange
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(request.getSession(false)).thenReturn(null);

            // Act
            UserDto result = authService.getCurrentUserAndRefreshSession(request);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(testUser.getId());
        }
    }

    // ============================================
    // requestRole() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("requestRole() のテスト")
    class RequestRoleTests {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.setContext(securityContext);
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        }

        @Test
        @DisplayName("正常系: ロールリクエストが正常に作成される")
        void requestRole_success() {
            // Arrange
            RoleRequestDto roleRequestDto = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .message("テストメッセージ")
                    .build();

            when(authRequestRepository.existsByUserIdAndStatus(testUser.getId(), RequestStatus.PENDING))
                    .thenReturn(false);

            AuthRequest savedRequest = AuthRequest.builder()
                    .id(1L)
                    .user(testUser)
                    .requestedRole(Role.VIEWER)
                    .requestMessage("テストメッセージ")
                    .status(RequestStatus.PENDING)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(authRequestRepository.save(any(AuthRequest.class))).thenReturn(savedRequest);

            // Act
            AuthRequest result = authService.requestRole(roleRequestDto);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getRequestedRole()).isEqualTo(Role.VIEWER);
            assertThat(result.getStatus()).isEqualTo(RequestStatus.PENDING);

            verify(discordNotificationService).sendNewRequestNotification(
                    testUser.getUsername(),
                    Role.VIEWER.name(),
                    "テストメッセージ"
            );
        }

        @Test
        @DisplayName("異常系: 既にペンディング中のリクエストがある場合はIllegalStateExceptionをスロー")
        void requestRole_pendingRequestExists_throwsException() {
            // Arrange
            RoleRequestDto roleRequestDto = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .build();

            when(authRequestRepository.existsByUserIdAndStatus(testUser.getId(), RequestStatus.PENDING))
                    .thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> authService.requestRole(roleRequestDto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("申請中のリクエストがあります");

            verify(authRequestRepository, never()).save(any(AuthRequest.class));
        }

        @Test
        @DisplayName("異常系: requestedRoleがnullの場合はIllegalArgumentExceptionをスロー")
        void requestRole_nullRequestedRole_throwsException() {
            // Arrange
            RoleRequestDto roleRequestDto = RoleRequestDto.builder()
                    .requestedRole(null)
                    .build();

            when(authRequestRepository.existsByUserIdAndStatus(testUser.getId(), RequestStatus.PENDING))
                    .thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> authService.requestRole(roleRequestDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("リクエストするロールを指定してください");
        }

        @Test
        @DisplayName("異常系: NO_ROLEをリクエストした場合はIllegalArgumentExceptionをスロー")
        void requestRole_noRoleRequested_throwsException() {
            // Arrange
            RoleRequestDto roleRequestDto = RoleRequestDto.builder()
                    .requestedRole(Role.NO_ROLE)
                    .build();

            when(authRequestRepository.existsByUserIdAndStatus(testUser.getId(), RequestStatus.PENDING))
                    .thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> authService.requestRole(roleRequestDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("NO_ROLEはリクエストできません");
        }

        @Test
        @DisplayName("異常系: 既に同じか高いロールを持っている場合はIllegalArgumentExceptionをスロー")
        void requestRole_alreadyHasRole_throwsException() {
            // Arrange
            // ユーザーをVIEWERロールに設定
            User viewerUser = User.builder()
                    .id(1L)
                    .username("testuser")
                    .email("test@example.com")
                    .passwordHash("hashedPassword")
                    .role(Role.VIEWER)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            CustomUserDetails userDetails = new CustomUserDetails(viewerUser);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(viewerUser.getId())).thenReturn(Optional.of(viewerUser));

            RoleRequestDto roleRequestDto = RoleRequestDto.builder()
                    .requestedRole(Role.VIEWER)
                    .build();

            when(authRequestRepository.existsByUserIdAndStatus(viewerUser.getId(), RequestStatus.PENDING))
                    .thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> authService.requestRole(roleRequestDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("既にこのロール以上の権限を持っています");
        }
    }

    // ============================================
    // updateUsername() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("updateUsername() のテスト")
    class UpdateUsernameTests {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.setContext(securityContext);
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
        }

        @Test
        @DisplayName("正常系: ユーザー名が正常に更新される")
        void updateUsername_success() {
            // Arrange
            String newUsername = "newusername";
            when(userRepository.existsByUsername(newUsername)).thenReturn(false);

            User updatedUser = User.builder()
                    .id(testUser.getId())
                    .username(newUsername)
                    .email(testUser.getEmail())
                    .passwordHash(testUser.getPasswordHash())
                    .role(testUser.getRole())
                    .createdAt(testUser.getCreatedAt())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.save(any(User.class))).thenReturn(updatedUser);

            // Act
            UserDto result = authService.updateUsername(newUsername);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getUsername()).isEqualTo(newUsername);
            verify(surveyResponseRepository).updateUserName("testuser", newUsername);
            verify(userRepository).save(any(User.class));
        }

        @Test
        @DisplayName("異常系: 新しいユーザー名が現在と同じ場合はIllegalArgumentExceptionをスロー")
        void updateUsername_sameUsername_throwsException() {
            // Arrange
            String sameUsername = testUser.getUsername();

            // Act & Assert
            assertThatThrownBy(() -> authService.updateUsername(sameUsername))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("新しいユーザー名が現在と同じです");

            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("異常系: 新しいユーザー名が既に使用されている場合はConflictExceptionをスロー")
        void updateUsername_usernameAlreadyTaken_throwsException() {
            // Arrange
            String newUsername = "existinguser";
            when(userRepository.existsByUsername(newUsername)).thenReturn(true);

            // Act & Assert
            assertThatThrownBy(() -> authService.updateUsername(newUsername))
                    .isInstanceOf(ConflictException.class)
                    .hasMessage("このユーザー名は既に使用されています");

            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ============================================
    // getAuthenticatedUser() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getAuthenticatedUser() のテスト")
    class GetAuthenticatedUserTests {

        @BeforeEach
        void setUpSecurityContext() {
            SecurityContextHolder.setContext(securityContext);
        }

        @Test
        @DisplayName("正常系: CustomUserDetailsから認証ユーザーを取得できる")
        void getAuthenticatedUser_fromCustomUserDetails_success() {
            // Arrange
            CustomUserDetails userDetails = new CustomUserDetails(testUser);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn(userDetails);
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));

            // Act
            User result = authService.getAuthenticatedUser();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getId()).isEqualTo(testUser.getId());
        }

        @Test
        @DisplayName("正常系: ユーザー名から認証ユーザーを取得できる（フォールバック）")
        void getAuthenticatedUser_fallbackToUsername_success() {
            // Arrange
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn("testuser"); // String principal
            when(authentication.getName()).thenReturn("testuser");
            when(userRepository.findByUsername("testuser")).thenReturn(Optional.of(testUser));

            // Act
            User result = authService.getAuthenticatedUser();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getUsername()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("異常系: フォールバックでユーザーが見つからない場合はResourceNotFoundExceptionをスロー")
        void getAuthenticatedUser_fallbackUserNotFound_throwsException() {
            // Arrange
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(true);
            when(authentication.getPrincipal()).thenReturn("unknownuser");
            when(authentication.getName()).thenReturn("unknownuser");
            when(userRepository.findByUsername("unknownuser")).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> authService.getAuthenticatedUser())
                    .isInstanceOf(ResourceNotFoundException.class)
                    .hasMessageContaining("ユーザーが見つかりません");
        }

        @Test
        @DisplayName("異常系: 認証が無効な場合はIllegalStateExceptionをスロー")
        void getAuthenticatedUser_authenticationNotValid_throwsException() {
            // Arrange
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.isAuthenticated()).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> authService.getAuthenticatedUser())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("認証されたユーザーが見つかりません");
        }
    }
}
