package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * LoginAttemptServiceのユニットテスト
 * ログイン試行回数の管理とアカウントロック機能をテスト
 */
@ExtendWith(MockitoExtension.class)
class LoginAttemptServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private LoginAttemptService loginAttemptService;

    private User testUser;
    private static final String TEST_EMAIL = "test@example.com";
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_DURATION_MINUTES = 15;

    @BeforeEach
    void setUp() {
        // デフォルト設定値を注入
        ReflectionTestUtils.setField(loginAttemptService, "maxFailedAttempts", MAX_FAILED_ATTEMPTS);
        ReflectionTestUtils.setField(loginAttemptService, "lockDurationMinutes", LOCK_DURATION_MINUTES);

        // テストユーザーの初期化
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email(TEST_EMAIL)
                .passwordHash("hashedPassword")
                .role(Role.VIEWER)
                .failedLoginAttempts(0)
                .lockedUntil(null)
                .build();
    }

    @Nested
    @DisplayName("onLoginSuccess - ログイン成功時の処理")
    class OnLoginSuccessTests {

        @Test
        @DisplayName("ログイン失敗回数がある場合、リセットされる")
        void shouldResetFailedAttemptsWhenUserHasFailures() {
            // 準備: 失敗回数が設定されているユーザー
            testUser.setFailedLoginAttempts(3);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // 実行
            loginAttemptService.onLoginSuccess(TEST_EMAIL);

            // 検証
            verify(userRepository).save(testUser);
            assertThat(testUser.getFailedLoginAttempts()).isZero();
            assertThat(testUser.getLockedUntil()).isNull();
        }

        @Test
        @DisplayName("ロックされている場合、ロックが解除される")
        void shouldUnlockAccountWhenLocked() {
            // 準備: ロックされているユーザー
            testUser.setFailedLoginAttempts(5);
            testUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // 実行
            loginAttemptService.onLoginSuccess(TEST_EMAIL);

            // 検証
            verify(userRepository).save(testUser);
            assertThat(testUser.getLockedUntil()).isNull();
        }

        @Test
        @DisplayName("失敗回数が0でロックもない場合、保存しない")
        void shouldNotSaveWhenNoFailuresAndNotLocked() {
            // 準備: 正常状態のユーザー
            testUser.setFailedLoginAttempts(0);
            testUser.setLockedUntil(null);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            loginAttemptService.onLoginSuccess(TEST_EMAIL);

            // 検証
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ユーザーが見つからない場合、何もしない")
        void shouldDoNothingWhenUserNotFound() {
            // 準備
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

            // 実行
            loginAttemptService.onLoginSuccess(TEST_EMAIL);

            // 検証
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("onLoginFailure - ログイン失敗時の処理")
    class OnLoginFailureTests {

        @Test
        @DisplayName("初回失敗時、失敗回数が1になる")
        void shouldIncrementFailedAttemptsOnFirstFailure() {
            // 準備
            testUser.setFailedLoginAttempts(0);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // 実行
            loginAttemptService.onLoginFailure(TEST_EMAIL);

            // 検証
            verify(userRepository).save(testUser);
            assertThat(testUser.getFailedLoginAttempts()).isEqualTo(1);
            assertThat(testUser.getLockedUntil()).isNull();
        }

        @Test
        @DisplayName("最大回数未満の失敗時、ロックされない")
        void shouldNotLockBeforeMaxAttempts() {
            // 準備: 4回失敗（最大5回）
            testUser.setFailedLoginAttempts(3);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // 実行
            loginAttemptService.onLoginFailure(TEST_EMAIL);

            // 検証
            assertThat(testUser.getFailedLoginAttempts()).isEqualTo(4);
            assertThat(testUser.getLockedUntil()).isNull();
        }

        @Test
        @DisplayName("最大回数に達した場合、アカウントがロックされる")
        void shouldLockAccountWhenMaxAttemptsReached() {
            // 準備: 4回失敗済み（次で5回目）
            testUser.setFailedLoginAttempts(4);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));
            when(userRepository.save(any(User.class))).thenReturn(testUser);

            // 実行
            loginAttemptService.onLoginFailure(TEST_EMAIL);

            // 検証
            assertThat(testUser.getFailedLoginAttempts()).isEqualTo(5);
            assertThat(testUser.getLockedUntil()).isNotNull();
            assertThat(testUser.getLockedUntil()).isAfter(LocalDateTime.now());
        }

        @Test
        @DisplayName("既にロックされている場合、処理をスキップ")
        void shouldSkipWhenAlreadyLocked() {
            // 準備: 既にロックされているユーザー
            testUser.setFailedLoginAttempts(5);
            testUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            loginAttemptService.onLoginFailure(TEST_EMAIL);

            // 検証
            verify(userRepository, never()).save(any());
        }

        @Test
        @DisplayName("ユーザーが見つからない場合、何もしない")
        void shouldDoNothingWhenUserNotFound() {
            // 準備
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

            // 実行
            loginAttemptService.onLoginFailure(TEST_EMAIL);

            // 検証
            verify(userRepository, never()).save(any());
        }
    }

    @Nested
    @DisplayName("isAccountLocked - アカウントロック状態の確認")
    class IsAccountLockedTests {

        @Test
        @DisplayName("ロックされている場合、trueを返す")
        void shouldReturnTrueWhenLocked() {
            // 準備
            testUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            boolean result = loginAttemptService.isAccountLocked(TEST_EMAIL);

            // 検証
            assertThat(result).isTrue();
        }

        @Test
        @DisplayName("ロックされていない場合、falseを返す")
        void shouldReturnFalseWhenNotLocked() {
            // 準備
            testUser.setLockedUntil(null);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            boolean result = loginAttemptService.isAccountLocked(TEST_EMAIL);

            // 検証
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("ロック期限が過ぎている場合、falseを返す")
        void shouldReturnFalseWhenLockExpired() {
            // 準備: ロック期限切れ
            testUser.setLockedUntil(LocalDateTime.now().minusMinutes(1));
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            boolean result = loginAttemptService.isAccountLocked(TEST_EMAIL);

            // 検証
            assertThat(result).isFalse();
        }

        @Test
        @DisplayName("ユーザーが見つからない場合、falseを返す")
        void shouldReturnFalseWhenUserNotFound() {
            // 準備
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

            // 実行
            boolean result = loginAttemptService.isAccountLocked(TEST_EMAIL);

            // 検証
            assertThat(result).isFalse();
        }
    }

    @Nested
    @DisplayName("getRemainingAttempts - 残り試行回数の取得")
    class GetRemainingAttemptsTests {

        @Test
        @DisplayName("失敗なしの場合、最大回数を返す")
        void shouldReturnMaxAttemptsWhenNoFailures() {
            // 準備
            testUser.setFailedLoginAttempts(0);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            int result = loginAttemptService.getRemainingAttempts(TEST_EMAIL);

            // 検証
            assertThat(result).isEqualTo(MAX_FAILED_ATTEMPTS);
        }

        @Test
        @DisplayName("失敗回数がある場合、残り回数を正しく計算")
        void shouldCalculateRemainingAttemptsCorrectly() {
            // 準備
            testUser.setFailedLoginAttempts(3);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            int result = loginAttemptService.getRemainingAttempts(TEST_EMAIL);

            // 検証
            assertThat(result).isEqualTo(2);
        }

        @Test
        @DisplayName("最大回数を超えている場合、0を返す")
        void shouldReturnZeroWhenExceedsMaxAttempts() {
            // 準備
            testUser.setFailedLoginAttempts(10);
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.of(testUser));

            // 実行
            int result = loginAttemptService.getRemainingAttempts(TEST_EMAIL);

            // 検証
            assertThat(result).isZero();
        }

        @Test
        @DisplayName("ユーザーが見つからない場合、最大回数を返す")
        void shouldReturnMaxAttemptsWhenUserNotFound() {
            // 準備
            when(userRepository.findByEmail(TEST_EMAIL)).thenReturn(Optional.empty());

            // 実行
            int result = loginAttemptService.getRemainingAttempts(TEST_EMAIL);

            // 検証
            assertThat(result).isEqualTo(MAX_FAILED_ATTEMPTS);
        }
    }
}
