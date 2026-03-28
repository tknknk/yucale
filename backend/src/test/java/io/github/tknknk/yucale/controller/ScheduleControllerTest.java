package io.github.tknknk.yucale.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.tknknk.yucale.config.SecurityConfig;
import io.github.tknknk.yucale.config.TestSecurityConfig;
import io.github.tknknk.yucale.dto.ScheduleDto;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import io.github.tknknk.yucale.service.ScheduleService;
import jakarta.persistence.EntityNotFoundException;
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
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * ScheduleControllerのユニットテスト
 * スケジュール関連のエンドポイントをテストする
 */
@WebMvcTest(ScheduleController.class)
@Import({SecurityConfig.class, TestSecurityConfig.class})
class ScheduleControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private ScheduleService scheduleService;

    @MockBean
    private CustomUserDetailsService customUserDetailsService;

    // テスト用のScheduleDtoを作成
    private ScheduleDto createTestScheduleDto(Long id) {
        return ScheduleDto.builder()
                .id(id)
                .urlId("url-" + id)
                .summary("Test Event " + id)
                .dtstart(LocalDateTime.of(2026, 3, 15, 10, 0))
                .dtend(LocalDateTime.of(2026, 3, 15, 12, 0))
                .allDay(false)
                .location("Test Location")
                .description("Test Description")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Nested
    @DisplayName("GET /api/schedules - 全スケジュール取得（ページネーション）")
    class GetAllSchedulesTests {

        @Test
        @DisplayName("認証なしでスケジュール一覧を取得（パブリックアクセス）")
        void getAllSchedules_publicAccess() throws Exception {
            // Arrange
            List<ScheduleDto> schedules = Arrays.asList(
                    createTestScheduleDto(1L),
                    createTestScheduleDto(2L)
            );
            Page<ScheduleDto> page = new PageImpl<>(schedules, PageRequest.of(0, 20), 2);
            when(scheduleService.getAllSchedules(0, 20)).thenReturn(page);

            // Act & Assert
            mockMvc.perform(get("/api/schedules"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.content").isArray())
                    .andExpect(jsonPath("$.data.content.length()").value(2))
                    .andExpect(jsonPath("$.data.totalItems").value(2))
                    .andExpect(jsonPath("$.data.currentPage").value(0));
        }

        @Test
        @DisplayName("ページネーションパラメータを指定")
        void getAllSchedules_withPagination() throws Exception {
            // Arrange - page 1, size 10, total 25 items -> hasNext=true, hasPrevious=true
            List<ScheduleDto> schedules = Arrays.asList(
                    createTestScheduleDto(11L), createTestScheduleDto(12L), createTestScheduleDto(13L),
                    createTestScheduleDto(14L), createTestScheduleDto(15L), createTestScheduleDto(16L),
                    createTestScheduleDto(17L), createTestScheduleDto(18L), createTestScheduleDto(19L),
                    createTestScheduleDto(20L)
            );
            Page<ScheduleDto> page = new PageImpl<>(schedules, PageRequest.of(1, 10), 25);
            when(scheduleService.getAllSchedules(1, 10)).thenReturn(page);

            // Act & Assert
            mockMvc.perform(get("/api/schedules")
                            .param("page", "1")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.currentPage").value(1))
                    .andExpect(jsonPath("$.data.size").value(10))
                    .andExpect(jsonPath("$.data.hasNext").value(true))
                    .andExpect(jsonPath("$.data.hasPrevious").value(true));
        }
    }

    @Nested
    @DisplayName("GET /api/schedules/{id} - ID指定でスケジュール取得")
    class GetScheduleByIdTests {

        @Test
        @DisplayName("存在するスケジュールを取得")
        void getScheduleById_found() throws Exception {
            // Arrange
            ScheduleDto schedule = createTestScheduleDto(1L);
            when(scheduleService.getScheduleById(1L)).thenReturn(schedule);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.summary").value("Test Event 1"));
        }

        @Test
        @DisplayName("存在しないスケジュールは404エラー")
        void getScheduleById_notFound() throws Exception {
            // Arrange
            when(scheduleService.getScheduleById(999L))
                    .thenThrow(new EntityNotFoundException("Schedule not found with id: 999"));

            // Act & Assert
            mockMvc.perform(get("/api/schedules/999"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Schedule not found with id: 999"));
        }
    }

    @Nested
    @DisplayName("GET /api/schedules/url/{urlId} - URLId指定でスケジュール取得")
    class GetScheduleByUrlIdTests {

        @Test
        @DisplayName("存在するスケジュールをURLIdで取得")
        void getScheduleByUrlId_found() throws Exception {
            // Arrange
            ScheduleDto schedule = createTestScheduleDto(1L);
            when(scheduleService.getScheduleByUrlId("url-1")).thenReturn(schedule);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/url/url-1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.urlId").value("url-1"));
        }

        @Test
        @DisplayName("存在しないURLIdは404エラー")
        void getScheduleByUrlId_notFound() throws Exception {
            // Arrange
            when(scheduleService.getScheduleByUrlId("invalid-url"))
                    .thenThrow(new EntityNotFoundException("Schedule not found with urlId: invalid-url"));

            // Act & Assert
            mockMvc.perform(get("/api/schedules/url/invalid-url"))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Schedule not found with urlId: invalid-url"));
        }
    }

    @Nested
    @DisplayName("POST /api/schedules - スケジュール作成")
    class CreateScheduleTests {

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーがスケジュールを作成")
        void createSchedule_asEditor() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("New Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .location("New Location")
                    .build();

            ScheduleDto created = ScheduleDto.builder()
                    .id(1L)
                    .urlId("new-url-id")
                    .summary("New Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .location("New Location")
                    .createdAt(LocalDateTime.now())
                    .build();

            when(scheduleService.createSchedule(any(ScheduleDto.class))).thenReturn(created);

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("スケジュールを作成しました"))
                    .andExpect(jsonPath("$.data.id").value(1))
                    .andExpect(jsonPath("$.data.summary").value("New Event"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーがスケジュールを作成")
        void createSchedule_asAdmin() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Admin Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            ScheduleDto created = ScheduleDto.builder()
                    .id(1L)
                    .summary("Admin Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            when(scheduleService.createSchedule(any(ScheduleDto.class))).thenReturn(created);

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはスケジュール作成不可（403）")
        void createSchedule_asViewer() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーはスケジュール作成不可（401）")
        void createSchedule_unauthenticated() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("バリデーションエラー：サマリーが空")
        void createSchedule_emptySummary() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("バリデーションエラー：開始日時がnull")
        void createSchedule_nullDtstart() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(null)
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("無効な日付範囲（終了日 < 開始日）は400エラー")
        void createSchedule_invalidDateRange() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 14, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 10, 0))  // 終了が開始より前
                    .build();

            when(scheduleService.createSchedule(any(ScheduleDto.class)))
                    .thenThrow(new IllegalArgumentException("Start date must be before or equal to end date"));

            // Act & Assert
            mockMvc.perform(post("/api/schedules")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("PUT /api/schedules/{id} - スケジュール更新")
    class UpdateScheduleTests {

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーがスケジュールを更新")
        void updateSchedule_asEditor() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Updated Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 14, 0))
                    .location("Updated Location")
                    .build();

            ScheduleDto updated = ScheduleDto.builder()
                    .id(1L)
                    .summary("Updated Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 14, 0))
                    .location("Updated Location")
                    .updatedAt(LocalDateTime.now())
                    .build();

            when(scheduleService.updateSchedule(eq(1L), any(ScheduleDto.class))).thenReturn(updated);

            // Act & Assert
            mockMvc.perform(put("/api/schedules/1")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("スケジュールを更新しました"))
                    .andExpect(jsonPath("$.data.summary").value("Updated Event"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーがスケジュールを更新")
        void updateSchedule_asAdmin() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Admin Updated")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            ScheduleDto updated = ScheduleDto.builder()
                    .id(1L)
                    .summary("Admin Updated")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            when(scheduleService.updateSchedule(eq(1L), any(ScheduleDto.class))).thenReturn(updated);

            // Act & Assert
            mockMvc.perform(put("/api/schedules/1")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("存在しないスケジュールの更新は404エラー")
        void updateSchedule_notFound() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Updated Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            when(scheduleService.updateSchedule(eq(999L), any(ScheduleDto.class)))
                    .thenThrow(new EntityNotFoundException("Schedule not found with id: 999"));

            // Act & Assert
            mockMvc.perform(put("/api/schedules/999")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Schedule not found with id: 999"));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはスケジュール更新不可（403）")
        void updateSchedule_asViewer() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(put("/api/schedules/1")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーはスケジュール更新不可（401）")
        void updateSchedule_unauthenticated() throws Exception {
            // Arrange
            ScheduleDto request = ScheduleDto.builder()
                    .summary("Test Event")
                    .dtstart(LocalDateTime.of(2026, 4, 1, 10, 0))
                    .dtend(LocalDateTime.of(2026, 4, 1, 12, 0))
                    .build();

            // Act & Assert
            mockMvc.perform(put("/api/schedules/1")
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("DELETE /api/schedules/{id} - スケジュール削除")
    class DeleteScheduleTests {

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("EDITORユーザーがスケジュールを削除")
        void deleteSchedule_asEditor() throws Exception {
            // Arrange
            doNothing().when(scheduleService).deleteSchedule(1L);

            // Act & Assert
            mockMvc.perform(delete("/api/schedules/1").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.message").value("スケジュールを削除しました"));
        }

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("ADMINユーザーがスケジュールを削除")
        void deleteSchedule_asAdmin() throws Exception {
            // Arrange
            doNothing().when(scheduleService).deleteSchedule(1L);

            // Act & Assert
            mockMvc.perform(delete("/api/schedules/1").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true));
        }

        @Test
        @WithMockUser(roles = "EDITOR")
        @DisplayName("存在しないスケジュールの削除は404エラー")
        void deleteSchedule_notFound() throws Exception {
            // Arrange
            doThrow(new EntityNotFoundException("Schedule not found with id: 999"))
                    .when(scheduleService).deleteSchedule(999L);

            // Act & Assert
            mockMvc.perform(delete("/api/schedules/999").with(csrf()))
                    .andExpect(status().isNotFound())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Schedule not found with id: 999"));
        }

        @Test
        @WithMockUser(roles = "VIEWER")
        @DisplayName("VIEWERユーザーはスケジュール削除不可（403）")
        void deleteSchedule_asViewer() throws Exception {
            // Act & Assert
            mockMvc.perform(delete("/api/schedules/1").with(csrf()))
                    .andExpect(status().isForbidden());
        }

        @Test
        @DisplayName("未認証ユーザーはスケジュール削除不可（401）")
        void deleteSchedule_unauthenticated() throws Exception {
            // Act & Assert
            mockMvc.perform(delete("/api/schedules/1").with(csrf()))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/schedules/upcoming - 今後のスケジュール取得")
    class GetUpcomingSchedulesTests {

        @Test
        @DisplayName("今後のスケジュールを取得（パブリックアクセス）")
        void getUpcomingSchedules_publicAccess() throws Exception {
            // Arrange
            List<ScheduleDto> schedules = Arrays.asList(
                    createTestScheduleDto(1L),
                    createTestScheduleDto(2L)
            );
            when(scheduleService.getUpcomingSchedules(10)).thenReturn(schedules);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/upcoming"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @DisplayName("limitパラメータを指定")
        void getUpcomingSchedules_withLimit() throws Exception {
            // Arrange
            List<ScheduleDto> schedules = Arrays.asList(createTestScheduleDto(1L));
            when(scheduleService.getUpcomingSchedules(5)).thenReturn(schedules);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/upcoming")
                            .param("limit", "5"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data").isArray());
        }

        @Test
        @DisplayName("limitが範囲外の場合は400エラー（0以下）")
        void getUpcomingSchedules_invalidLimitTooLow() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/schedules/upcoming")
                            .param("limit", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("limitは1から100の間で指定してください"));
        }

        @Test
        @DisplayName("limitが範囲外の場合は400エラー（101以上）")
        void getUpcomingSchedules_invalidLimitTooHigh() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/schedules/upcoming")
                            .param("limit", "101"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("limitは1から100の間で指定してください"));
        }
    }

    @Nested
    @DisplayName("GET /api/schedules/range - 日付範囲でスケジュール取得")
    class GetSchedulesBetweenTests {

        @Test
        @DisplayName("日付範囲でスケジュールを取得（パブリックアクセス）")
        void getSchedulesBetween_publicAccess() throws Exception {
            // Arrange
            LocalDateTime start = LocalDateTime.of(2026, 3, 1, 0, 0);
            LocalDateTime end = LocalDateTime.of(2026, 3, 31, 23, 59);
            List<ScheduleDto> schedules = Arrays.asList(
                    createTestScheduleDto(1L),
                    createTestScheduleDto(2L)
            );
            when(scheduleService.getSchedulesBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenReturn(schedules);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/range")
                            .param("start", "2026-03-01T00:00:00")
                            .param("end", "2026-03-31T23:59:59"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data").isArray())
                    .andExpect(jsonPath("$.data.length()").value(2));
        }

        @Test
        @DisplayName("日付範囲が不正な場合は400エラー（開始 > 終了）")
        void getSchedulesBetween_invalidDateRange() throws Exception {
            // Arrange
            when(scheduleService.getSchedulesBetween(any(LocalDateTime.class), any(LocalDateTime.class)))
                    .thenThrow(new IllegalArgumentException("Start date must be before end date"));

            // Act & Assert
            mockMvc.perform(get("/api/schedules/range")
                            .param("start", "2026-03-31T00:00:00")
                            .param("end", "2026-03-01T00:00:00"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("Start date must be before end date"));
        }
    }

    @Nested
    @DisplayName("GET /api/schedules/split - 過去/未来分割でスケジュール取得")
    class GetSchedulesSplitTests {

        @Test
        @DisplayName("過去/未来分割でスケジュールを取得（パブリックアクセス）")
        void getSchedulesSplit_publicAccess() throws Exception {
            // Arrange
            Map<String, Object> result = new HashMap<>();
            result.put("pastSchedules", Arrays.asList(createTestScheduleDto(1L)));
            result.put("futureSchedules", Arrays.asList(createTestScheduleDto(2L)));
            result.put("totalPast", 1L);
            result.put("totalFuture", 1L);
            result.put("hiddenPastCount", 0L);
            result.put("hasMorePast", false);
            result.put("hasMoreFuture", false);

            when(scheduleService.getSchedulesSplit(false, 100)).thenReturn(result);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/split"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success").value(true))
                    .andExpect(jsonPath("$.data.pastSchedules").isArray())
                    .andExpect(jsonPath("$.data.futureSchedules").isArray())
                    .andExpect(jsonPath("$.data.totalPast").value(1))
                    .andExpect(jsonPath("$.data.totalFuture").value(1));
        }

        @Test
        @DisplayName("loadAllPast=trueで全ての過去スケジュールを取得")
        void getSchedulesSplit_loadAllPast() throws Exception {
            // Arrange
            Map<String, Object> result = new HashMap<>();
            result.put("pastSchedules", Arrays.asList(createTestScheduleDto(1L), createTestScheduleDto(2L)));
            result.put("futureSchedules", Arrays.asList(createTestScheduleDto(3L)));
            result.put("totalPast", 2L);
            result.put("totalFuture", 1L);
            result.put("hiddenPastCount", 0L);
            result.put("hasMorePast", false);
            result.put("hasMoreFuture", false);

            when(scheduleService.getSchedulesSplit(true, 100)).thenReturn(result);

            // Act & Assert
            mockMvc.perform(get("/api/schedules/split")
                            .param("loadAllPast", "true"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.data.pastSchedules.length()").value(2));
        }

        @Test
        @DisplayName("futureSizeが範囲外の場合は400エラー（0以下）")
        void getSchedulesSplit_invalidFutureSizeTooLow() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/schedules/split")
                            .param("futureSize", "0"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("futureSizeは1から1000の間で指定してください"));
        }

        @Test
        @DisplayName("futureSizeが範囲外の場合は400エラー（1001以上）")
        void getSchedulesSplit_invalidFutureSizeTooHigh() throws Exception {
            // Act & Assert
            mockMvc.perform(get("/api/schedules/split")
                            .param("futureSize", "1001"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.success").value(false))
                    .andExpect(jsonPath("$.message").value("futureSizeは1から1000の間で指定してください"));
        }
    }
}
