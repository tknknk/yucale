package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.dto.AuthRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.AuthRequestRepository;
import io.github.tknknk.yucale.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

/**
 * AdminServiceのユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class AdminServiceTest {

    @Mock
    private AuthRequestRepository authRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private DiscordNotificationService discordNotificationService;

    @Mock
    private SessionService sessionService;

    @InjectMocks
    private AdminService adminService;

    private User testUser;
    private AuthRequest pendingRequest;
    private AuthRequest approvedRequest;

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

        // テスト用ペンディングリクエストの作成
        pendingRequest = AuthRequest.builder()
                .id(1L)
                .user(testUser)
                .requestedRole(Role.VIEWER)
                .requestMessage("テストリクエスト")
                .status(RequestStatus.PENDING)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        // テスト用承認済みリクエストの作成
        approvedRequest = AuthRequest.builder()
                .id(2L)
                .user(testUser)
                .requestedRole(Role.EDITOR)
                .requestMessage("別のリクエスト")
                .status(RequestStatus.APPROVED)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    // ============================================
    // getPendingRequests() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getPendingRequests() のテスト")
    class GetPendingRequestsTests {

        @Test
        @DisplayName("正常系: ペンディングリクエスト一覧を取得できる")
        void getPendingRequests_success() {
            // Arrange
            List<AuthRequest> pendingRequests = Arrays.asList(pendingRequest);
            when(authRequestRepository.findByStatus(RequestStatus.PENDING)).thenReturn(pendingRequests);

            // Act
            List<AuthRequestDto> result = adminService.getPendingRequests();

            // Assert
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getId()).isEqualTo(pendingRequest.getId());
            assertThat(result.get(0).getUsername()).isEqualTo(testUser.getUsername());
            assertThat(result.get(0).getRequestedRole()).isEqualTo(Role.VIEWER);
            assertThat(result.get(0).getStatus()).isEqualTo(RequestStatus.PENDING);

            verify(authRequestRepository).findByStatus(RequestStatus.PENDING);
        }

        @Test
        @DisplayName("正常系: ペンディングリクエストが存在しない場合は空のリストを返す")
        void getPendingRequests_empty() {
            // Arrange
            when(authRequestRepository.findByStatus(RequestStatus.PENDING)).thenReturn(Collections.emptyList());

            // Act
            List<AuthRequestDto> result = adminService.getPendingRequests();

            // Assert
            assertThat(result).isEmpty();
        }
    }

    // ============================================
    // getAllRequests() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getAllRequests() のテスト")
    class GetAllRequestsTests {

        @Test
        @DisplayName("正常系: 全てのリクエストを取得できる")
        void getAllRequests_success() {
            // Arrange
            List<AuthRequest> allRequests = Arrays.asList(pendingRequest, approvedRequest);
            when(authRequestRepository.findAll()).thenReturn(allRequests);

            // Act
            List<AuthRequestDto> result = adminService.getAllRequests();

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getStatus()).isEqualTo(RequestStatus.PENDING);
            assertThat(result.get(1).getStatus()).isEqualTo(RequestStatus.APPROVED);

            verify(authRequestRepository).findAll();
        }

        @Test
        @DisplayName("正常系: リクエストが存在しない場合は空のリストを返す")
        void getAllRequests_empty() {
            // Arrange
            when(authRequestRepository.findAll()).thenReturn(Collections.emptyList());

            // Act
            List<AuthRequestDto> result = adminService.getAllRequests();

            // Assert
            assertThat(result).isEmpty();
        }
    }

    // ============================================
    // approveRequest() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("approveRequest() のテスト")
    class ApproveRequestTests {

        @Test
        @DisplayName("正常系: リクエストを承認してユーザーのロールを更新する")
        void approveRequest_success() {
            // Arrange
            Long requestId = 1L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));
            when(authRequestRepository.save(any(AuthRequest.class))).thenReturn(pendingRequest);
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // Act
            AuthRequestDto result = adminService.approveRequest(requestId);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(RequestStatus.APPROVED);
            assertThat(pendingRequest.getStatus()).isEqualTo(RequestStatus.APPROVED);
            assertThat(testUser.getRole()).isEqualTo(Role.VIEWER);

            verify(authRequestRepository).findById(requestId);
            verify(authRequestRepository).save(pendingRequest);
            verify(userRepository).save(testUser);
            verify(discordNotificationService).sendApprovalNotification(
                    testUser.getUsername(),
                    Role.VIEWER.name()
            );
        }

        @Test
        @DisplayName("異常系: リクエストが見つからない場合はRuntimeExceptionをスロー")
        void approveRequest_notFound_throwsException() {
            // Arrange
            Long requestId = 999L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> adminService.approveRequest(requestId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("リクエストが見つかりません");

            verify(authRequestRepository, never()).save(any(AuthRequest.class));
            verify(userRepository, never()).save(any(User.class));
        }

        @Test
        @DisplayName("異常系: 既に処理済みのリクエストはRuntimeExceptionをスロー")
        void approveRequest_alreadyProcessed_throwsException() {
            // Arrange
            Long requestId = 2L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.of(approvedRequest));

            // Act & Assert
            assertThatThrownBy(() -> adminService.approveRequest(requestId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("このリクエストは既に処理済みです");

            verify(authRequestRepository, never()).save(any(AuthRequest.class));
            verify(userRepository, never()).save(any(User.class));
        }
    }

    // ============================================
    // rejectRequest() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("rejectRequest() のテスト")
    class RejectRequestTests {

        @Test
        @DisplayName("正常系: リクエストを拒否する（理由あり）")
        void rejectRequest_withReason_success() {
            // Arrange
            Long requestId = 1L;
            String reason = "テスト用拒否理由";
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));
            when(authRequestRepository.save(any(AuthRequest.class))).thenReturn(pendingRequest);

            // Act
            AuthRequestDto result = adminService.rejectRequest(requestId, reason);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(RequestStatus.REJECTED);
            assertThat(pendingRequest.getStatus()).isEqualTo(RequestStatus.REJECTED);

            verify(authRequestRepository).findById(requestId);
            verify(authRequestRepository).save(pendingRequest);
            verify(userRepository, never()).save(any(User.class)); // ロールは更新されない
            verify(discordNotificationService).sendRejectionNotification(
                    testUser.getUsername(),
                    Role.VIEWER.name(),
                    reason
            );
        }

        @Test
        @DisplayName("正常系: リクエストを拒否する（理由なし）")
        void rejectRequest_withoutReason_success() {
            // Arrange
            Long requestId = 1L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.of(pendingRequest));
            when(authRequestRepository.save(any(AuthRequest.class))).thenReturn(pendingRequest);

            // Act
            AuthRequestDto result = adminService.rejectRequest(requestId, null);

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getStatus()).isEqualTo(RequestStatus.REJECTED);

            verify(discordNotificationService).sendRejectionNotification(
                    testUser.getUsername(),
                    Role.VIEWER.name(),
                    null
            );
        }

        @Test
        @DisplayName("異常系: リクエストが見つからない場合はRuntimeExceptionをスロー")
        void rejectRequest_notFound_throwsException() {
            // Arrange
            Long requestId = 999L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> adminService.rejectRequest(requestId, "reason"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("リクエストが見つかりません");

            verify(authRequestRepository, never()).save(any(AuthRequest.class));
        }

        @Test
        @DisplayName("異常系: 既に処理済みのリクエストはRuntimeExceptionをスロー")
        void rejectRequest_alreadyProcessed_throwsException() {
            // Arrange
            Long requestId = 2L;
            when(authRequestRepository.findById(requestId)).thenReturn(Optional.of(approvedRequest));

            // Act & Assert
            assertThatThrownBy(() -> adminService.rejectRequest(requestId, "reason"))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("このリクエストは既に処理済みです");

            verify(authRequestRepository, never()).save(any(AuthRequest.class));
        }
    }

    // ============================================
    // getAllUsers() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("getAllUsers() のテスト")
    class GetAllUsersTests {

        @Test
        @DisplayName("正常系: 全ユーザーを取得できる")
        void getAllUsers_success() {
            // Arrange
            User user2 = User.builder()
                    .id(2L)
                    .username("user2")
                    .email("user2@example.com")
                    .passwordHash("hashedPassword")
                    .role(Role.VIEWER)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            List<User> users = Arrays.asList(testUser, user2);
            when(userRepository.findAll()).thenReturn(users);

            // Act
            List<UserDto> result = adminService.getAllUsers();

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getUsername()).isEqualTo("testuser");
            assertThat(result.get(1).getUsername()).isEqualTo("user2");

            verify(userRepository).findAll();
        }

        @Test
        @DisplayName("正常系: ユーザーが存在しない場合は空のリストを返す")
        void getAllUsers_empty() {
            // Arrange
            when(userRepository.findAll()).thenReturn(Collections.emptyList());

            // Act
            List<UserDto> result = adminService.getAllUsers();

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("正常系: UserDtoに正しい情報がマッピングされる")
        void getAllUsers_correctMapping() {
            // Arrange
            when(userRepository.findAll()).thenReturn(Collections.singletonList(testUser));

            // Act
            List<UserDto> result = adminService.getAllUsers();

            // Assert
            assertThat(result).hasSize(1);
            UserDto dto = result.get(0);
            assertThat(dto.getId()).isEqualTo(testUser.getId());
            assertThat(dto.getUsername()).isEqualTo(testUser.getUsername());
            assertThat(dto.getEmail()).isEqualTo(testUser.getEmail());
            assertThat(dto.getRole()).isEqualTo(testUser.getRole());
            assertThat(dto.getCreatedAt()).isEqualTo(testUser.getCreatedAt());
            assertThat(dto.getUpdatedAt()).isEqualTo(testUser.getUpdatedAt());
        }
    }

    // ============================================
    // deleteUser() メソッドのテスト
    // ============================================
    @Nested
    @DisplayName("deleteUser() のテスト")
    class DeleteUserTests {

        @Test
        @DisplayName("正常系: ユーザーを削除できる")
        void deleteUser_success() {
            // Arrange
            Long userId = testUser.getId();
            List<AuthRequest> userRequests = Collections.singletonList(pendingRequest);

            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(authRequestRepository.findByUserId(userId)).thenReturn(userRequests);

            // Act
            adminService.deleteUser(userId);

            // Assert
            verify(userRepository).findById(userId);
            verify(authRequestRepository).findByUserId(userId);
            verify(authRequestRepository).deleteAll(userRequests);
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("正常系: 関連するAuthRequestがない場合もユーザーを削除できる")
        void deleteUser_noAuthRequests_success() {
            // Arrange
            Long userId = testUser.getId();
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));
            when(authRequestRepository.findByUserId(userId)).thenReturn(Collections.emptyList());

            // Act
            adminService.deleteUser(userId);

            // Assert
            verify(authRequestRepository).deleteAll(Collections.emptyList());
            verify(userRepository).delete(testUser);
        }

        @Test
        @DisplayName("異常系: ユーザーが見つからない場合はRuntimeExceptionをスロー")
        void deleteUser_notFound_throwsException() {
            // Arrange
            Long userId = 999L;
            when(userRepository.findById(userId)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> adminService.deleteUser(userId))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("ユーザーが見つかりません");

            verify(userRepository, never()).delete(any(User.class));
        }

        @Test
        @DisplayName("異常系: ADMINユーザーは削除できない")
        void deleteUser_adminUser_throwsException() {
            // Arrange
            User adminUser = User.builder()
                    .id(100L)
                    .username("adminuser")
                    .email("admin@example.com")
                    .passwordHash("hashedPassword")
                    .role(Role.ADMIN)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.findById(adminUser.getId())).thenReturn(Optional.of(adminUser));

            // Act & Assert
            assertThatThrownBy(() -> adminService.deleteUser(adminUser.getId()))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("管理者ユーザーは削除できません");

            verify(userRepository, never()).delete(any(User.class));
            verify(authRequestRepository, never()).deleteAll(anyList());
        }

        @Test
        @DisplayName("正常系: VIEWERユーザーを削除できる")
        void deleteUser_viewerUser_success() {
            // Arrange
            User viewerUser = User.builder()
                    .id(3L)
                    .username("vieweruser")
                    .email("viewer@example.com")
                    .passwordHash("hashedPassword")
                    .role(Role.VIEWER)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.findById(viewerUser.getId())).thenReturn(Optional.of(viewerUser));
            when(authRequestRepository.findByUserId(viewerUser.getId())).thenReturn(Collections.emptyList());

            // Act
            adminService.deleteUser(viewerUser.getId());

            // Assert
            verify(userRepository).delete(viewerUser);
        }

        @Test
        @DisplayName("正常系: EDITORユーザーを削除できる")
        void deleteUser_editorUser_success() {
            // Arrange
            User editorUser = User.builder()
                    .id(4L)
                    .username("editoruser")
                    .email("editor@example.com")
                    .passwordHash("hashedPassword")
                    .role(Role.EDITOR)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(userRepository.findById(editorUser.getId())).thenReturn(Optional.of(editorUser));
            when(authRequestRepository.findByUserId(editorUser.getId())).thenReturn(Collections.emptyList());

            // Act
            adminService.deleteUser(editorUser.getId());

            // Assert
            verify(userRepository).delete(editorUser);
        }
    }

    // ============================================
    // DTO変換のテスト
    // ============================================
    @Nested
    @DisplayName("DTOへの変換テスト")
    class DtoMappingTests {

        @Test
        @DisplayName("AuthRequestDtoに正しい情報がマッピングされる")
        void authRequestDto_correctMapping() {
            // Arrange
            when(authRequestRepository.findByStatus(RequestStatus.PENDING))
                    .thenReturn(Collections.singletonList(pendingRequest));

            // Act
            List<AuthRequestDto> result = adminService.getPendingRequests();

            // Assert
            assertThat(result).hasSize(1);
            AuthRequestDto dto = result.get(0);
            assertThat(dto.getId()).isEqualTo(pendingRequest.getId());
            assertThat(dto.getUserId()).isEqualTo(testUser.getId());
            assertThat(dto.getUsername()).isEqualTo(testUser.getUsername());
            assertThat(dto.getRequestedRole()).isEqualTo(pendingRequest.getRequestedRole());
            assertThat(dto.getRequestMessage()).isEqualTo(pendingRequest.getRequestMessage());
            assertThat(dto.getStatus()).isEqualTo(pendingRequest.getStatus());
            assertThat(dto.getCreatedAt()).isEqualTo(pendingRequest.getCreatedAt());
            assertThat(dto.getUpdatedAt()).isEqualTo(pendingRequest.getUpdatedAt());
        }
    }
}
