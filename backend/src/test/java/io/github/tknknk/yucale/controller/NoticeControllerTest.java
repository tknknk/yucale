package io.github.tknknk.yucale.controller;

import io.github.tknknk.yucale.config.SecurityConfig;
import io.github.tknknk.yucale.config.TestSecurityConfig;
import io.github.tknknk.yucale.dto.NoticeDto;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import io.github.tknknk.yucale.service.NoticeService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * NoticeControllerのユニットテスト
 * ページネーションパラメータの境界値をテストする
 */
@WebMvcTest(NoticeController.class)
@Import({SecurityConfig.class, TestSecurityConfig.class})
class NoticeControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private NoticeService noticeService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    private NoticeDto createTestNoticeDto(Long id) {
        return NoticeDto.builder()
                .id(id)
                .title("Test Notice " + id)
                .content("Test Content " + id)
                .createdByUserId(1L)
                .createdByUsername("tester")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("GET /api/notices - お知らせ一覧取得（ページネーション）")
    class GetAllNoticesTests {

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("デフォルトのページネーションでお知らせを取得")
        void getAllNotices_default() throws Exception {
            // Arrange
            Page<NoticeDto> page = new PageImpl<>(
                    List.of(createTestNoticeDto(1L)), PageRequest.of(0, 10), 1);
            when(noticeService.getAllNotices(0, 10)).thenReturn(page);

            // Act & Assert
            mockMvc.perform(get("/api/notices"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andExpect(jsonPath("$.data.currentPage").value(0))
                    .andExpect(jsonPath("$.data.size").value(10));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("sizeが範囲外の場合は400エラー（0以下）")
        void getAllNotices_invalidSizeTooLow() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/notices")
                            .param("size", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("sizeは1から100の間で指定してください"));

            verify(noticeService, never()).getAllNotices(anyInt(), anyInt());
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("sizeが範囲外の場合は400エラー（101以上）- 全件取得によるDoSを防ぐ")
        void getAllNotices_invalidSizeTooHigh() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/notices")
                            .param("size", "1000000"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("sizeは1から100の間で指定してください"));

            verify(noticeService, never()).getAllNotices(anyInt(), anyInt());
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("sizeが上限ちょうど（100）の場合は取得できる")
        void getAllNotices_sizeAtUpperBound() throws Exception {
            // Arrange
            Page<NoticeDto> page = new PageImpl<>(
                    List.of(createTestNoticeDto(1L)), PageRequest.of(0, 100), 1);
            when(noticeService.getAllNotices(0, 100)).thenReturn(page);

            // Act & Assert
            mockMvc.perform(get("/api/notices")
                            .param("size", "100"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.size").value(100));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("pageが負の場合は400エラー")
        void getAllNotices_negativePage() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/notices")
                            .param("page", "-1"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("pageは0以上で指定してください"));

            verify(noticeService, never()).getAllNotices(anyInt(), anyInt());
        }

        @Test
        @DisplayName("未認証の場合は401エラー（sizeの検証より前に認可が働く）")
        void getAllNotices_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/notices")
                            .param("size", "1000000"))
                    .andExpect(status().isUnauthorized());

            verify(noticeService, never()).getAllNotices(anyInt(), anyInt());
        }
    }
}
