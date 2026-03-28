package io.github.tknknk.yucale.security;

import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.security.core.GrantedAuthority;

import java.io.*;
import java.time.LocalDateTime;
import java.util.Collection;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * CustomUserDetailsのユニットテスト
 */
class CustomUserDetailsTest {

    private User testUser;
    private CustomUserDetails customUserDetails;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedPassword123")
                .role(Role.VIEWER)
                .failedLoginAttempts(0)
                .build();
        customUserDetails = new CustomUserDetails(testUser);
    }

    @Nested
    @DisplayName("基本的なゲッターメソッドのテスト")
    class BasicGetterTest {

        @Test
        @DisplayName("getUser でUserオブジェクトを取得できる")
        void shouldReturnUser() {
            assertThat(customUserDetails.getUser()).isEqualTo(testUser);
        }

        @Test
        @DisplayName("getId でユーザーIDを取得できる")
        void shouldReturnId() {
            assertThat(customUserDetails.getId()).isEqualTo(1L);
        }

        @Test
        @DisplayName("getEmail でメールアドレスを取得できる")
        void shouldReturnEmail() {
            assertThat(customUserDetails.getEmail()).isEqualTo("test@example.com");
        }

        @Test
        @DisplayName("getUsername でユーザー名を取得できる")
        void shouldReturnUsername() {
            assertThat(customUserDetails.getUsername()).isEqualTo("testuser");
        }

        @Test
        @DisplayName("getPassword でパスワードハッシュを取得できる")
        void shouldReturnPasswordHash() {
            assertThat(customUserDetails.getPassword()).isEqualTo("hashedPassword123");
        }
    }

    @Nested
    @DisplayName("権限（Authority）のテスト")
    class AuthoritiesTest {

        @ParameterizedTest
        @EnumSource(Role.class)
        @DisplayName("各ロールに対して正しい権限が設定される")
        void shouldReturnCorrectAuthorityForEachRole(Role role) {
            // given
            User user = User.builder()
                    .id(1L)
                    .username("user")
                    .email("user@example.com")
                    .passwordHash("password")
                    .role(role)
                    .build();
            CustomUserDetails details = new CustomUserDetails(user);

            // when
            Collection<? extends GrantedAuthority> authorities = details.getAuthorities();

            // then
            assertThat(authorities).hasSize(1);
            assertThat(authorities)
                    .extracting("authority")
                    .containsExactly("ROLE_" + role.name());
        }

        @Test
        @DisplayName("NO_ROLEの場合はROLE_NO_ROLEが返される")
        void shouldReturnNoRoleAuthority() {
            // given
            User noRoleUser = User.builder()
                    .id(1L)
                    .username("noroleuser")
                    .email("norole@example.com")
                    .passwordHash("password")
                    .role(Role.NO_ROLE)
                    .build();
            CustomUserDetails details = new CustomUserDetails(noRoleUser);

            // when & then
            assertThat(details.getAuthorities())
                    .extracting("authority")
                    .containsExactly("ROLE_NO_ROLE");
        }

        @Test
        @DisplayName("ADMINの場合はROLE_ADMINが返される")
        void shouldReturnAdminAuthority() {
            // given
            User adminUser = User.builder()
                    .id(1L)
                    .username("adminuser")
                    .email("admin@example.com")
                    .passwordHash("password")
                    .role(Role.ADMIN)
                    .build();
            CustomUserDetails details = new CustomUserDetails(adminUser);

            // when & then
            assertThat(details.getAuthorities())
                    .extracting("authority")
                    .containsExactly("ROLE_ADMIN");
        }
    }

    @Nested
    @DisplayName("アカウント状態のテスト")
    class AccountStatusTest {

        @Test
        @DisplayName("isAccountNonExpired は常にtrueを返す")
        void shouldAlwaysReturnAccountNonExpired() {
            assertThat(customUserDetails.isAccountNonExpired()).isTrue();
        }

        @Test
        @DisplayName("isCredentialsNonExpired は常にtrueを返す")
        void shouldAlwaysReturnCredentialsNonExpired() {
            assertThat(customUserDetails.isCredentialsNonExpired()).isTrue();
        }

        @Test
        @DisplayName("isEnabled は常にtrueを返す")
        void shouldAlwaysReturnEnabled() {
            assertThat(customUserDetails.isEnabled()).isTrue();
        }

        @Test
        @DisplayName("ロックされていないアカウントの場合、isAccountNonLockedはtrueを返す")
        void shouldReturnAccountNonLockedWhenNotLocked() {
            // given - アカウントはロックされていない
            testUser.setLockedUntil(null);
            customUserDetails = new CustomUserDetails(testUser);

            // when & then
            assertThat(customUserDetails.isAccountNonLocked()).isTrue();
        }

        @Test
        @DisplayName("将来の日時までロックされているアカウントの場合、isAccountNonLockedはfalseを返す")
        void shouldReturnAccountLockedWhenLockedUntilFuture() {
            // given - 1時間後までロック
            testUser.setLockedUntil(LocalDateTime.now().plusHours(1));
            customUserDetails = new CustomUserDetails(testUser);

            // when & then
            assertThat(customUserDetails.isAccountNonLocked()).isFalse();
        }

        @Test
        @DisplayName("ロック期間が過ぎたアカウントの場合、isAccountNonLockedはtrueを返す")
        void shouldReturnAccountNonLockedWhenLockExpired() {
            // given - 1時間前にロック期限切れ
            testUser.setLockedUntil(LocalDateTime.now().minusHours(1));
            customUserDetails = new CustomUserDetails(testUser);

            // when & then
            assertThat(customUserDetails.isAccountNonLocked()).isTrue();
        }
    }

    @Nested
    @DisplayName("シリアライズ可能性のテスト")
    class SerializableTest {

        @Test
        @DisplayName("Serializableインターフェースを実装している")
        void shouldImplementSerializable() {
            assertThat(customUserDetails).isInstanceOf(Serializable.class);
        }

        @Test
        @DisplayName("シリアライズ・デシリアライズが正常に動作する")
        void shouldSerializeAndDeserialize() throws IOException, ClassNotFoundException {
            // given
            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ObjectOutputStream oos = new ObjectOutputStream(baos);

            // when - シリアライズ
            oos.writeObject(customUserDetails);
            oos.close();

            // デシリアライズ
            ByteArrayInputStream bais = new ByteArrayInputStream(baos.toByteArray());
            ObjectInputStream ois = new ObjectInputStream(bais);
            CustomUserDetails deserializedDetails = (CustomUserDetails) ois.readObject();
            ois.close();

            // then
            assertThat(deserializedDetails).isNotNull();
            assertThat(deserializedDetails.getId()).isEqualTo(customUserDetails.getId());
            assertThat(deserializedDetails.getUsername()).isEqualTo(customUserDetails.getUsername());
            assertThat(deserializedDetails.getEmail()).isEqualTo(customUserDetails.getEmail());
            assertThat(deserializedDetails.getPassword()).isEqualTo(customUserDetails.getPassword());
        }
    }

    @Nested
    @DisplayName("エッジケースのテスト")
    class EdgeCaseTest {

        @Test
        @DisplayName("failedLoginAttemptsが0のユーザーでも正常に動作する")
        void shouldWorkWithZeroFailedLoginAttempts() {
            // given
            testUser.setFailedLoginAttempts(0);
            customUserDetails = new CustomUserDetails(testUser);

            // when & then
            assertThat(customUserDetails.isAccountNonLocked()).isTrue();
        }

        @Test
        @DisplayName("failedLoginAttemptsがnullのユーザーでも正常に動作する")
        void shouldWorkWithNullFailedLoginAttempts() {
            // given
            testUser.setFailedLoginAttempts(null);
            customUserDetails = new CustomUserDetails(testUser);

            // when & then
            assertThat(customUserDetails.isAccountNonLocked()).isTrue();
        }
    }
}
