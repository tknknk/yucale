package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.dto.NoticeDto;
import io.github.tknknk.yucale.entity.Notice;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.NoticeRepository;
import io.github.tknknk.yucale.repository.UserRepository;
import io.github.tknknk.yucale.security.CustomUserDetails;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * NoticeService のユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class NoticeServiceTest {

    @Mock
    private NoticeRepository noticeRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private NoticeService noticeService;

    private User testUser;
    private CustomUserDetails testUserDetails;
    private Notice testNotice;
    private NoticeDto testNoticeDto;

    @BeforeEach
    void setUp() {
        // テスト用ユーザーの作成
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedpassword")
                .role(Role.EDITOR)
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        testUserDetails = new CustomUserDetails(testUser);

        // テスト用お知らせの作成
        testNotice = Notice.builder()
                .id(1L)
                .title("Test Notice")
                .content("This is a test notice content.")
                .createdBy(testUser)
                .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .build();

        // テスト用DTOの作成
        testNoticeDto = NoticeDto.builder()
                .title("Test Notice")
                .content("This is a test notice content.")
                .build();
    }

    /**
     * SecurityContextのモック設定
     */
    private void setupSecurityContext() {
        SecurityContextHolder.setContext(securityContext);
        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.getPrincipal()).thenReturn(testUserDetails);
    }

    @Nested
    @DisplayName("getLatestNotices - 最新のお知らせ3件取得")
    class GetLatestNoticesTests {

        @Test
        @DisplayName("正常系: 最新のお知らせ3件を取得できる")
        void getLatestNotices_success() {
            // Arrange
            Notice notice1 = Notice.builder()
                    .id(1L)
                    .title("Notice 1")
                    .content("Content 1")
                    .createdBy(testUser)
                    .createdAt(LocalDateTime.of(2024, 5, 3, 10, 0))
                    .updatedAt(LocalDateTime.of(2024, 5, 3, 10, 0))
                    .build();

            Notice notice2 = Notice.builder()
                    .id(2L)
                    .title("Notice 2")
                    .content("Content 2")
                    .createdBy(testUser)
                    .createdAt(LocalDateTime.of(2024, 5, 2, 10, 0))
                    .updatedAt(LocalDateTime.of(2024, 5, 2, 10, 0))
                    .build();

            Notice notice3 = Notice.builder()
                    .id(3L)
                    .title("Notice 3")
                    .content("Content 3")
                    .createdBy(testUser)
                    .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                    .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                    .build();

            when(noticeRepository.findTop3ByOrderByCreatedAtDesc())
                    .thenReturn(List.of(notice1, notice2, notice3));

            // Act
            List<NoticeDto> result = noticeService.getLatestNotices();

            // Assert
            assertThat(result).hasSize(3);
            assertThat(result.get(0).getTitle()).isEqualTo("Notice 1");
            assertThat(result.get(1).getTitle()).isEqualTo("Notice 2");
            assertThat(result.get(2).getTitle()).isEqualTo("Notice 3");
            verify(noticeRepository).findTop3ByOrderByCreatedAtDesc();
        }

        @Test
        @DisplayName("正常系: お知らせが3件未満の場合、存在するものだけ返す")
        void getLatestNotices_lessThan3() {
            // Arrange
            when(noticeRepository.findTop3ByOrderByCreatedAtDesc())
                    .thenReturn(List.of(testNotice));

            // Act
            List<NoticeDto> result = noticeService.getLatestNotices();

            // Assert
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("正常系: お知らせがない場合、空リストを返す")
        void getLatestNotices_empty() {
            // Arrange
            when(noticeRepository.findTop3ByOrderByCreatedAtDesc())
                    .thenReturn(List.of());

            // Act
            List<NoticeDto> result = noticeService.getLatestNotices();

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getAllNotices - ページネーション付きお知らせ一覧取得")
    class GetAllNoticesTests {

        @Test
        @DisplayName("正常系: お知らせ一覧を取得できる")
        void getAllNotices_success() {
            // Arrange
            Page<Notice> noticePage = new PageImpl<>(List.of(testNotice));
            when(noticeRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                    .thenReturn(noticePage);

            // Act
            Page<NoticeDto> result = noticeService.getAllNotices(0, 10);

            // Assert
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getTitle()).isEqualTo("Test Notice");
            verify(noticeRepository).findAllByOrderByCreatedAtDesc(any(Pageable.class));
        }

        @Test
        @DisplayName("正常系: 空のページを返す")
        void getAllNotices_emptyPage() {
            // Arrange
            Page<Notice> emptyPage = new PageImpl<>(List.of());
            when(noticeRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                    .thenReturn(emptyPage);

            // Act
            Page<NoticeDto> result = noticeService.getAllNotices(0, 10);

            // Assert
            assertThat(result.getContent()).isEmpty();
        }

        @Test
        @DisplayName("正常系: 複数ページのデータを取得できる")
        void getAllNotices_pagination() {
            // Arrange
            Page<Notice> noticePage = new PageImpl<>(
                    List.of(testNotice),
                    org.springframework.data.domain.PageRequest.of(1, 10),
                    25
            );
            when(noticeRepository.findAllByOrderByCreatedAtDesc(any(Pageable.class)))
                    .thenReturn(noticePage);

            // Act
            Page<NoticeDto> result = noticeService.getAllNotices(1, 10);

            // Assert
            assertThat(result.getTotalElements()).isEqualTo(25);
            assertThat(result.getTotalPages()).isEqualTo(3);
        }
    }

    @Nested
    @DisplayName("getNoticeById - ID指定お知らせ取得")
    class GetNoticeByIdTests {

        @Test
        @DisplayName("正常系: IDでお知らせを取得できる")
        void getNoticeById_success() {
            // Arrange
            when(noticeRepository.findById(1L)).thenReturn(Optional.of(testNotice));

            // Act
            NoticeDto result = noticeService.getNoticeById(1L);

            // Assert
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getTitle()).isEqualTo("Test Notice");
            assertThat(result.getContent()).isEqualTo("This is a test notice content.");
            assertThat(result.getCreatedByUserId()).isEqualTo(testUser.getId());
            assertThat(result.getCreatedByUsername()).isEqualTo(testUser.getUsername());
        }

        @Test
        @DisplayName("異常系: 存在しないIDでEntityNotFoundExceptionをスロー")
        void getNoticeById_notFound() {
            // Arrange
            when(noticeRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> noticeService.getNoticeById(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("お知らせが見つかりません");
        }
    }

    @Nested
    @DisplayName("createNotice - お知らせ作成")
    class CreateNoticeTests {

        @Test
        @DisplayName("正常系: お知らせを作成できる")
        void createNotice_success() {
            // Arrange
            setupSecurityContext();
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(noticeRepository.save(any(Notice.class))).thenReturn(testNotice);

            // Act
            NoticeDto result = noticeService.createNotice(testNoticeDto);

            // Assert
            assertThat(result.getTitle()).isEqualTo("Test Notice");
            assertThat(result.getContent()).isEqualTo("This is a test notice content.");
            verify(noticeRepository).save(any(Notice.class));
        }

        @Test
        @DisplayName("異常系: 認証されていない場合、IllegalStateExceptionをスロー")
        void createNotice_noAuthentication() {
            // Arrange
            SecurityContextHolder.setContext(securityContext);
            when(securityContext.getAuthentication()).thenReturn(null);

            // Act & Assert
            assertThatThrownBy(() -> noticeService.createNotice(testNoticeDto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("認証されたユーザーが見つかりません");
        }

        @Test
        @DisplayName("異常系: 認証プリンシパルがCustomUserDetailsでない場合")
        void createNotice_invalidPrincipal() {
            // Arrange
            SecurityContextHolder.setContext(securityContext);
            when(securityContext.getAuthentication()).thenReturn(authentication);
            when(authentication.getPrincipal()).thenReturn("anonymous");

            // Act & Assert
            assertThatThrownBy(() -> noticeService.createNotice(testNoticeDto))
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessageContaining("認証されたユーザーが見つかりません");
        }

        @Test
        @DisplayName("異常系: ユーザーがデータベースに存在しない場合")
        void createNotice_userNotFound() {
            // Arrange
            setupSecurityContext();
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> noticeService.createNotice(testNoticeDto))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("ユーザーが見つかりません");
        }

        @Test
        @DisplayName("正常系: 作成されたお知らせにユーザー情報が設定される")
        void createNotice_userInfoSet() {
            // Arrange
            setupSecurityContext();
            when(userRepository.findById(testUser.getId())).thenReturn(Optional.of(testUser));
            when(noticeRepository.save(any(Notice.class))).thenAnswer(invocation -> {
                Notice notice = invocation.getArgument(0);
                assertThat(notice.getCreatedBy()).isEqualTo(testUser);
                notice.setId(1L);
                notice.setCreatedAt(LocalDateTime.now());
                notice.setUpdatedAt(LocalDateTime.now());
                return notice;
            });

            // Act
            NoticeDto result = noticeService.createNotice(testNoticeDto);

            // Assert
            verify(noticeRepository).save(any(Notice.class));
        }
    }

    @Nested
    @DisplayName("updateNotice - お知らせ更新")
    class UpdateNoticeTests {

        @Test
        @DisplayName("正常系: お知らせを更新できる")
        void updateNotice_success() {
            // Arrange
            when(noticeRepository.findById(1L)).thenReturn(Optional.of(testNotice));
            when(noticeRepository.save(any(Notice.class))).thenReturn(testNotice);

            NoticeDto updateDto = NoticeDto.builder()
                    .title("Updated Title")
                    .content("Updated Content")
                    .build();

            // Act
            NoticeDto result = noticeService.updateNotice(1L, updateDto);

            // Assert
            assertThat(result).isNotNull();
            verify(noticeRepository).findById(1L);
            verify(noticeRepository).save(any(Notice.class));
        }

        @Test
        @DisplayName("正常系: タイトルとコンテンツが正しく更新される")
        void updateNotice_fieldsUpdated() {
            // Arrange
            when(noticeRepository.findById(1L)).thenReturn(Optional.of(testNotice));
            when(noticeRepository.save(any(Notice.class))).thenAnswer(invocation -> {
                Notice notice = invocation.getArgument(0);
                assertThat(notice.getTitle()).isEqualTo("Updated Title");
                assertThat(notice.getContent()).isEqualTo("Updated Content");
                return notice;
            });

            NoticeDto updateDto = NoticeDto.builder()
                    .title("Updated Title")
                    .content("Updated Content")
                    .build();

            // Act
            noticeService.updateNotice(1L, updateDto);

            // Assert
            verify(noticeRepository).save(any(Notice.class));
        }

        @Test
        @DisplayName("異常系: 存在しないIDで更新を試みるとEntityNotFoundExceptionをスロー")
        void updateNotice_notFound() {
            // Arrange
            when(noticeRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> noticeService.updateNotice(999L, testNoticeDto))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("お知らせが見つかりません");
        }
    }

    @Nested
    @DisplayName("deleteNotice - お知らせ削除")
    class DeleteNoticeTests {

        @Test
        @DisplayName("正常系: お知らせを削除できる")
        void deleteNotice_success() {
            // Arrange
            when(noticeRepository.existsById(1L)).thenReturn(true);
            doNothing().when(noticeRepository).deleteById(1L);

            // Act
            noticeService.deleteNotice(1L);

            // Assert
            verify(noticeRepository).existsById(1L);
            verify(noticeRepository).deleteById(1L);
        }

        @Test
        @DisplayName("異常系: 存在しないIDで削除を試みるとEntityNotFoundExceptionをスロー")
        void deleteNotice_notFound() {
            // Arrange
            when(noticeRepository.existsById(999L)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> noticeService.deleteNotice(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("お知らせが見つかりません");

            verify(noticeRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("toDto - エンティティからDTOへの変換")
    class ToDtoTests {

        @Test
        @DisplayName("正常系: 全フィールドが正しく変換される")
        void toDto_allFields() {
            // Arrange
            when(noticeRepository.findById(1L)).thenReturn(Optional.of(testNotice));

            // Act
            NoticeDto result = noticeService.getNoticeById(1L);

            // Assert
            assertThat(result.getId()).isEqualTo(testNotice.getId());
            assertThat(result.getTitle()).isEqualTo(testNotice.getTitle());
            assertThat(result.getContent()).isEqualTo(testNotice.getContent());
            assertThat(result.getCreatedByUserId()).isEqualTo(testNotice.getCreatedBy().getId());
            assertThat(result.getCreatedByUsername()).isEqualTo(testNotice.getCreatedBy().getUsername());
            assertThat(result.getCreatedAt()).isEqualTo(testNotice.getCreatedAt());
            assertThat(result.getUpdatedAt()).isEqualTo(testNotice.getUpdatedAt());
        }

        @Test
        @DisplayName("正常系: 複数のお知らせが正しく変換される")
        void toDto_multipleNotices() {
            // Arrange
            User anotherUser = User.builder()
                    .id(2L)
                    .username("anotheruser")
                    .email("another@example.com")
                    .passwordHash("hashedpassword")
                    .role(Role.ADMIN)
                    .build();

            Notice notice1 = Notice.builder()
                    .id(1L)
                    .title("Notice 1")
                    .content("Content 1")
                    .createdBy(testUser)
                    .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                    .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                    .build();

            Notice notice2 = Notice.builder()
                    .id(2L)
                    .title("Notice 2")
                    .content("Content 2")
                    .createdBy(anotherUser)
                    .createdAt(LocalDateTime.of(2024, 5, 2, 10, 0))
                    .updatedAt(LocalDateTime.of(2024, 5, 2, 10, 0))
                    .build();

            when(noticeRepository.findTop3ByOrderByCreatedAtDesc())
                    .thenReturn(List.of(notice2, notice1));

            // Act
            List<NoticeDto> result = noticeService.getLatestNotices();

            // Assert
            assertThat(result).hasSize(2);
            assertThat(result.get(0).getCreatedByUsername()).isEqualTo("anotheruser");
            assertThat(result.get(1).getCreatedByUsername()).isEqualTo("testuser");
        }
    }
}
