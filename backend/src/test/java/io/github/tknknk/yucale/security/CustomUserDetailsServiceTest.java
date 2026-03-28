package io.github.tknknk.yucale.security;

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
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * CustomUserDetailsServiceのユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    private User testUser;

    @BeforeEach
    void setUp() {
        // テスト用ユーザーの作成
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedPassword123")
                .role(Role.VIEWER)
                .build();
    }

    @Nested
    @DisplayName("loadUserByUsername メソッドのテスト")
    class LoadUserByUsernameTest {

        @Test
        @DisplayName("存在するメールアドレスでユーザーを取得できる")
        void shouldLoadUserByEmail() {
            // given
            String email = "test@example.com";
            when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);

            // then
            assertThat(userDetails).isNotNull();
            assertThat(userDetails.getUsername()).isEqualTo("testuser");
            assertThat(userDetails.getPassword()).isEqualTo("hashedPassword123");
            verify(userRepository).findByEmail(email);
        }

        @Test
        @DisplayName("CustomUserDetailsインスタンスを返す")
        void shouldReturnCustomUserDetailsInstance() {
            // given
            String email = "test@example.com";
            when(userRepository.findByEmail(email)).thenReturn(Optional.of(testUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(email);

            // then
            assertThat(userDetails).isInstanceOf(CustomUserDetails.class);
            CustomUserDetails customUserDetails = (CustomUserDetails) userDetails;
            assertThat(customUserDetails.getUser()).isEqualTo(testUser);
            assertThat(customUserDetails.getId()).isEqualTo(1L);
            assertThat(customUserDetails.getEmail()).isEqualTo("test@example.com");
        }

        @Test
        @DisplayName("存在しないメールアドレスの場合はUsernameNotFoundExceptionをスロー")
        void shouldThrowExceptionWhenEmailNotFound() {
            // given
            String nonExistentEmail = "nonexistent@example.com";
            when(userRepository.findByEmail(nonExistentEmail)).thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> customUserDetailsService.loadUserByUsername(nonExistentEmail))
                    .isInstanceOf(UsernameNotFoundException.class)
                    .hasMessageContaining("User not found with email: " + nonExistentEmail);
        }

        @Test
        @DisplayName("ADMINロールのユーザーを正しく取得できる")
        void shouldLoadAdminUser() {
            // given
            User adminUser = User.builder()
                    .id(2L)
                    .username("adminuser")
                    .email("admin@example.com")
                    .passwordHash("adminPassword")
                    .role(Role.ADMIN)
                    .build();
            when(userRepository.findByEmail("admin@example.com")).thenReturn(Optional.of(adminUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserByUsername("admin@example.com");

            // then
            assertThat(userDetails).isNotNull();
            assertThat(userDetails.getAuthorities())
                    .extracting("authority")
                    .containsExactly("ROLE_ADMIN");
        }
    }

    @Nested
    @DisplayName("loadUserById メソッドのテスト")
    class LoadUserByIdTest {

        @Test
        @DisplayName("存在するIDでユーザーを取得できる")
        void shouldLoadUserById() {
            // given
            Long userId = 1L;
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserById(userId);

            // then
            assertThat(userDetails).isNotNull();
            assertThat(userDetails.getUsername()).isEqualTo("testuser");
            verify(userRepository).findById(userId);
        }

        @Test
        @DisplayName("CustomUserDetailsインスタンスを返す")
        void shouldReturnCustomUserDetailsInstance() {
            // given
            Long userId = 1L;
            when(userRepository.findById(userId)).thenReturn(Optional.of(testUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserById(userId);

            // then
            assertThat(userDetails).isInstanceOf(CustomUserDetails.class);
            CustomUserDetails customUserDetails = (CustomUserDetails) userDetails;
            assertThat(customUserDetails.getId()).isEqualTo(userId);
        }

        @Test
        @DisplayName("存在しないIDの場合はUsernameNotFoundExceptionをスロー")
        void shouldThrowExceptionWhenIdNotFound() {
            // given
            Long nonExistentId = 999L;
            when(userRepository.findById(nonExistentId)).thenReturn(Optional.empty());

            // when & then
            assertThatThrownBy(() -> customUserDetailsService.loadUserById(nonExistentId))
                    .isInstanceOf(UsernameNotFoundException.class)
                    .hasMessageContaining("User not found with id: " + nonExistentId);
        }

        @Test
        @DisplayName("異なるロールのユーザーを正しく取得できる")
        void shouldLoadUsersWithDifferentRoles() {
            // given
            User editorUser = User.builder()
                    .id(3L)
                    .username("editoruser")
                    .email("editor@example.com")
                    .passwordHash("editorPassword")
                    .role(Role.EDITOR)
                    .build();
            when(userRepository.findById(3L)).thenReturn(Optional.of(editorUser));

            // when
            UserDetails userDetails = customUserDetailsService.loadUserById(3L);

            // then
            assertThat(userDetails.getAuthorities())
                    .extracting("authority")
                    .containsExactly("ROLE_EDITOR");
        }
    }
}
