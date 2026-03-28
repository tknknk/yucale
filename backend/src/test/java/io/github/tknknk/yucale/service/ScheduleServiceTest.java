package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.dto.ScheduleDto;
import io.github.tknknk.yucale.entity.Schedule;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.repository.ScheduleRepository;
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
import org.springframework.data.domain.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * ScheduleService のユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class ScheduleServiceTest {

    @Mock
    private ScheduleRepository scheduleRepository;

    @Mock
    private SecurityContext securityContext;

    @Mock
    private Authentication authentication;

    @InjectMocks
    private ScheduleService scheduleService;

    private Schedule testSchedule;
    private ScheduleDto testScheduleDto;
    private User testUser;
    private CustomUserDetails testUserDetails;

    @BeforeEach
    void setUp() {
        // テスト用ユーザーの作成
        testUser = User.builder()
                .id(1L)
                .username("testuser")
                .email("test@example.com")
                .passwordHash("hashedpassword")
                .role(Role.EDITOR)
                .build();

        testUserDetails = new CustomUserDetails(testUser);

        // テスト用スケジュールの作成
        testSchedule = Schedule.builder()
                .id(1L)
                .urlId("abc12345")
                .summary("Test Event")
                .dtstart(LocalDateTime.of(2024, 6, 1, 10, 0))
                .dtend(LocalDateTime.of(2024, 6, 1, 12, 0))
                .allDay(false)
                .location("Tokyo")
                .description("Test Description")
                .song("Test Song")
                .recording("Test Recording")
                .attendees("attendee1, attendee2")
                .dtstamp(LocalDateTime.of(2024, 5, 1, 10, 0))
                .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .updatedBy("testuser")
                .build();

        // テスト用DTOの作成
        testScheduleDto = ScheduleDto.builder()
                .summary("Test Event")
                .dtstart(LocalDateTime.of(2024, 6, 1, 10, 0))
                .dtend(LocalDateTime.of(2024, 6, 1, 12, 0))
                .allDay(false)
                .location("Tokyo")
                .description("Test Description")
                .song("Test Song")
                .recording("Test Recording")
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
    @DisplayName("getAllSchedules - ページネーション付きスケジュール一覧取得")
    class GetAllSchedulesTests {

        @Test
        @DisplayName("正常系: スケジュール一覧を取得できる")
        void getAllSchedules_success() {
            // Arrange
            Page<Schedule> schedulePage = new PageImpl<>(List.of(testSchedule));
            when(scheduleRepository.findAll(any(Pageable.class))).thenReturn(schedulePage);

            // Act
            Page<ScheduleDto> result = scheduleService.getAllSchedules(0, 10);

            // Assert
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getContent().get(0).getSummary()).isEqualTo("Test Event");
            verify(scheduleRepository).findAll(any(Pageable.class));
        }

        @Test
        @DisplayName("正常系: 空のページを返す")
        void getAllSchedules_emptyPage() {
            // Arrange
            Page<Schedule> emptyPage = new PageImpl<>(List.of());
            when(scheduleRepository.findAll(any(Pageable.class))).thenReturn(emptyPage);

            // Act
            Page<ScheduleDto> result = scheduleService.getAllSchedules(0, 10);

            // Assert
            assertThat(result.getContent()).isEmpty();
        }
    }

    @Nested
    @DisplayName("getScheduleById - ID指定スケジュール取得")
    class GetScheduleByIdTests {

        @Test
        @DisplayName("正常系: IDでスケジュールを取得できる")
        void getScheduleById_success() {
            // Arrange
            when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));

            // Act
            ScheduleDto result = scheduleService.getScheduleById(1L);

            // Assert
            assertThat(result.getId()).isEqualTo(1L);
            assertThat(result.getSummary()).isEqualTo("Test Event");
            assertThat(result.getUrlId()).isEqualTo("abc12345");
        }

        @Test
        @DisplayName("異常系: 存在しないIDでEntityNotFoundExceptionをスロー")
        void getScheduleById_notFound() {
            // Arrange
            when(scheduleRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.getScheduleById(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("スケジュールが見つかりません");
        }
    }

    @Nested
    @DisplayName("getScheduleByUrlId - URL ID指定スケジュール取得")
    class GetScheduleByUrlIdTests {

        @Test
        @DisplayName("正常系: URL IDでスケジュールを取得できる")
        void getScheduleByUrlId_success() {
            // Arrange
            when(scheduleRepository.findByUrlId("abc12345")).thenReturn(Optional.of(testSchedule));

            // Act
            ScheduleDto result = scheduleService.getScheduleByUrlId("abc12345");

            // Assert
            assertThat(result.getUrlId()).isEqualTo("abc12345");
            assertThat(result.getSummary()).isEqualTo("Test Event");
        }

        @Test
        @DisplayName("異常系: 存在しないURL IDでEntityNotFoundExceptionをスロー")
        void getScheduleByUrlId_notFound() {
            // Arrange
            when(scheduleRepository.findByUrlId("notexist")).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.getScheduleByUrlId("notexist"))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("スケジュールが見つかりません");
        }
    }

    @Nested
    @DisplayName("createSchedule - スケジュール作成")
    class CreateScheduleTests {

        @Test
        @DisplayName("正常系: スケジュールを作成できる")
        void createSchedule_success() {
            // Arrange
            setupSecurityContext();
            when(scheduleRepository.save(any(Schedule.class))).thenReturn(testSchedule);

            // Act
            ScheduleDto result = scheduleService.createSchedule(testScheduleDto);

            // Assert
            assertThat(result.getSummary()).isEqualTo("Test Event");
            verify(scheduleRepository).save(any(Schedule.class));
        }

        @Test
        @DisplayName("正常系: allDayがnullの場合、falseがセットされる")
        void createSchedule_allDayNull() {
            // Arrange
            setupSecurityContext();
            testScheduleDto.setAllDay(null);
            when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> {
                Schedule saved = invocation.getArgument(0);
                assertThat(saved.getAllDay()).isFalse();
                return testSchedule;
            });

            // Act
            scheduleService.createSchedule(testScheduleDto);

            // Assert
            verify(scheduleRepository).save(any(Schedule.class));
        }

        @Test
        @DisplayName("異常系: 開始日がnullの場合、IllegalArgumentExceptionをスロー")
        void createSchedule_startDateNull() {
            // Arrange
            testScheduleDto.setDtstart(null);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.createSchedule(testScheduleDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日と終了日は必須です");
        }

        @Test
        @DisplayName("異常系: 終了日がnullの場合、IllegalArgumentExceptionをスロー")
        void createSchedule_endDateNull() {
            // Arrange
            testScheduleDto.setDtend(null);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.createSchedule(testScheduleDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日と終了日は必須です");
        }

        @Test
        @DisplayName("異常系: 開始日が終了日より後の場合、IllegalArgumentExceptionをスロー")
        void createSchedule_startAfterEnd() {
            // Arrange
            testScheduleDto.setDtstart(LocalDateTime.of(2024, 6, 2, 10, 0));
            testScheduleDto.setDtend(LocalDateTime.of(2024, 6, 1, 10, 0));

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.createSchedule(testScheduleDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日は終了日より前に設定してください");
        }

        @Test
        @DisplayName("正常系: 開始日と終了日が同じでも作成できる")
        void createSchedule_sameDates() {
            // Arrange
            setupSecurityContext();
            LocalDateTime sameDate = LocalDateTime.of(2024, 6, 1, 10, 0);
            testScheduleDto.setDtstart(sameDate);
            testScheduleDto.setDtend(sameDate);
            when(scheduleRepository.save(any(Schedule.class))).thenReturn(testSchedule);

            // Act
            ScheduleDto result = scheduleService.createSchedule(testScheduleDto);

            // Assert
            assertThat(result).isNotNull();
            verify(scheduleRepository).save(any(Schedule.class));
        }
    }

    @Nested
    @DisplayName("updateSchedule - スケジュール更新")
    class UpdateScheduleTests {

        @Test
        @DisplayName("正常系: スケジュールを更新できる")
        void updateSchedule_success() {
            // Arrange
            setupSecurityContext();
            when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
            when(scheduleRepository.save(any(Schedule.class))).thenReturn(testSchedule);

            ScheduleDto updateDto = ScheduleDto.builder()
                    .summary("Updated Event")
                    .dtstart(LocalDateTime.of(2024, 6, 2, 10, 0))
                    .dtend(LocalDateTime.of(2024, 6, 2, 12, 0))
                    .location("Osaka")
                    .build();

            // Act
            ScheduleDto result = scheduleService.updateSchedule(1L, updateDto);

            // Assert
            assertThat(result).isNotNull();
            verify(scheduleRepository).findById(1L);
            verify(scheduleRepository).save(any(Schedule.class));
        }

        @Test
        @DisplayName("異常系: 存在しないIDで更新を試みるとEntityNotFoundExceptionをスロー")
        void updateSchedule_notFound() {
            // Arrange
            when(scheduleRepository.findById(999L)).thenReturn(Optional.empty());

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.updateSchedule(999L, testScheduleDto))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("スケジュールが見つかりません");
        }

        @Test
        @DisplayName("異常系: 不正な日付範囲で更新を試みるとIllegalArgumentExceptionをスロー")
        void updateSchedule_invalidDateRange() {
            // Arrange
            when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));
            testScheduleDto.setDtstart(LocalDateTime.of(2024, 6, 2, 10, 0));
            testScheduleDto.setDtend(LocalDateTime.of(2024, 6, 1, 10, 0));

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.updateSchedule(1L, testScheduleDto))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日は終了日より前に設定してください");
        }
    }

    @Nested
    @DisplayName("deleteSchedule - スケジュール削除")
    class DeleteScheduleTests {

        @Test
        @DisplayName("正常系: スケジュールを削除できる")
        void deleteSchedule_success() {
            // Arrange
            when(scheduleRepository.existsById(1L)).thenReturn(true);
            doNothing().when(scheduleRepository).deleteById(1L);

            // Act
            scheduleService.deleteSchedule(1L);

            // Assert
            verify(scheduleRepository).existsById(1L);
            verify(scheduleRepository).deleteById(1L);
        }

        @Test
        @DisplayName("異常系: 存在しないIDで削除を試みるとEntityNotFoundExceptionをスロー")
        void deleteSchedule_notFound() {
            // Arrange
            when(scheduleRepository.existsById(999L)).thenReturn(false);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.deleteSchedule(999L))
                    .isInstanceOf(EntityNotFoundException.class)
                    .hasMessageContaining("スケジュールが見つかりません");

            verify(scheduleRepository, never()).deleteById(any());
        }
    }

    @Nested
    @DisplayName("getUpcomingSchedules - 今後のスケジュール取得")
    class GetUpcomingSchedulesTests {

        @Test
        @DisplayName("正常系: 今後のスケジュールを取得できる")
        void getUpcomingSchedules_success() {
            // Arrange
            Schedule futureSchedule1 = Schedule.builder()
                    .id(1L)
                    .urlId("url1")
                    .summary("Future Event 1")
                    .dtstart(LocalDateTime.now().plusDays(1))
                    .dtend(LocalDateTime.now().plusDays(1).plusHours(2))
                    .allDay(false)
                    .dtstamp(LocalDateTime.now())
                    .build();

            Schedule futureSchedule2 = Schedule.builder()
                    .id(2L)
                    .urlId("url2")
                    .summary("Future Event 2")
                    .dtstart(LocalDateTime.now().plusDays(2))
                    .dtend(LocalDateTime.now().plusDays(2).plusHours(2))
                    .allDay(false)
                    .dtstamp(LocalDateTime.now())
                    .build();

            when(scheduleRepository.findByDtstartGreaterThanEqual(any(LocalDateTime.class)))
                    .thenReturn(List.of(futureSchedule1, futureSchedule2));

            // Act
            List<ScheduleDto> result = scheduleService.getUpcomingSchedules(5);

            // Assert
            assertThat(result).hasSize(2);
        }

        @Test
        @DisplayName("正常系: 制限より少ないスケジュールを返す")
        void getUpcomingSchedules_limitApplied() {
            // Arrange
            Schedule futureSchedule = Schedule.builder()
                    .id(1L)
                    .urlId("url1")
                    .summary("Future Event")
                    .dtstart(LocalDateTime.now().plusDays(1))
                    .dtend(LocalDateTime.now().plusDays(1).plusHours(2))
                    .allDay(false)
                    .dtstamp(LocalDateTime.now())
                    .build();

            when(scheduleRepository.findByDtstartGreaterThanEqual(any(LocalDateTime.class)))
                    .thenReturn(List.of(futureSchedule));

            // Act
            List<ScheduleDto> result = scheduleService.getUpcomingSchedules(1);

            // Assert
            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("正常系: 今後のスケジュールがない場合、空リストを返す")
        void getUpcomingSchedules_empty() {
            // Arrange
            when(scheduleRepository.findByDtstartGreaterThanEqual(any(LocalDateTime.class)))
                    .thenReturn(List.of());

            // Act
            List<ScheduleDto> result = scheduleService.getUpcomingSchedules(5);

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getSchedulesBetween - 期間指定スケジュール取得")
    class GetSchedulesBetweenTests {

        @Test
        @DisplayName("正常系: 指定期間のスケジュールを取得できる")
        void getSchedulesBetween_success() {
            // Arrange
            LocalDateTime start = LocalDateTime.of(2024, 6, 1, 0, 0);
            LocalDateTime end = LocalDateTime.of(2024, 6, 30, 23, 59);
            when(scheduleRepository.findSchedulesInRange(start, end)).thenReturn(List.of(testSchedule));

            // Act
            List<ScheduleDto> result = scheduleService.getSchedulesBetween(start, end);

            // Assert
            assertThat(result).hasSize(1);
            assertThat(result.get(0).getSummary()).isEqualTo("Test Event");
        }

        @Test
        @DisplayName("異常系: 開始日がnullの場合、IllegalArgumentExceptionをスロー")
        void getSchedulesBetween_startNull() {
            // Arrange
            LocalDateTime end = LocalDateTime.of(2024, 6, 30, 23, 59);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.getSchedulesBetween(null, end))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日と終了日は必須です");
        }

        @Test
        @DisplayName("異常系: 終了日がnullの場合、IllegalArgumentExceptionをスロー")
        void getSchedulesBetween_endNull() {
            // Arrange
            LocalDateTime start = LocalDateTime.of(2024, 6, 1, 0, 0);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.getSchedulesBetween(start, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日と終了日は必須です");
        }

        @Test
        @DisplayName("異常系: 開始日が終了日より後の場合、IllegalArgumentExceptionをスロー")
        void getSchedulesBetween_startAfterEnd() {
            // Arrange
            LocalDateTime start = LocalDateTime.of(2024, 6, 30, 0, 0);
            LocalDateTime end = LocalDateTime.of(2024, 6, 1, 0, 0);

            // Act & Assert
            assertThatThrownBy(() -> scheduleService.getSchedulesBetween(start, end))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("開始日は終了日より前に設定してください");
        }
    }

    @Nested
    @DisplayName("getAllSchedulesForIcs - ICS用全スケジュール取得")
    class GetAllSchedulesForIcsTests {

        @Test
        @DisplayName("正常系: 全スケジュールをソート順で取得できる")
        void getAllSchedulesForIcs_success() {
            // Arrange
            when(scheduleRepository.findAll(any(Sort.class))).thenReturn(List.of(testSchedule));

            // Act
            List<Schedule> result = scheduleService.getAllSchedulesForIcs();

            // Assert
            assertThat(result).hasSize(1);
            verify(scheduleRepository).findAll(any(Sort.class));
        }

        @Test
        @DisplayName("正常系: スケジュールがない場合、空リストを返す")
        void getAllSchedulesForIcs_empty() {
            // Arrange
            when(scheduleRepository.findAll(any(Sort.class))).thenReturn(List.of());

            // Act
            List<Schedule> result = scheduleService.getAllSchedulesForIcs();

            // Assert
            assertThat(result).isEmpty();
        }
    }

    @Nested
    @DisplayName("getSchedulesSplit - 過去/未来スケジュール分割取得")
    class GetSchedulesSplitTests {

        @Test
        @DisplayName("正常系: 過去と未来のスケジュールを分割して取得できる")
        void getSchedulesSplit_success() {
            // Arrange
            when(scheduleRepository.countPastSchedules(any(), any())).thenReturn(5L);
            when(scheduleRepository.countFutureSchedules(any(), any())).thenReturn(10L);
            when(scheduleRepository.findPastSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));
            when(scheduleRepository.findFutureSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));

            // Act
            Map<String, Object> result = scheduleService.getSchedulesSplit(false, 10);

            // Assert
            assertThat(result).containsKey("pastSchedules");
            assertThat(result).containsKey("futureSchedules");
            assertThat(result).containsKey("totalPast");
            assertThat(result).containsKey("totalFuture");
            assertThat(result).containsKey("hiddenPastCount");
            assertThat(result).containsKey("hasMorePast");
            assertThat(result).containsKey("hasMoreFuture");
        }

        @Test
        @DisplayName("正常系: loadAllPastがtrueの場合、全過去スケジュールを取得")
        void getSchedulesSplit_loadAllPast() {
            // Arrange
            when(scheduleRepository.countPastSchedules(any(), any())).thenReturn(12L);
            when(scheduleRepository.countFutureSchedules(any(), any())).thenReturn(5L);
            when(scheduleRepository.findPastSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));
            when(scheduleRepository.findFutureSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));

            // Act
            Map<String, Object> result = scheduleService.getSchedulesSplit(true, 10);

            // Assert
            assertThat(result.get("hiddenPastCount")).isEqualTo(0L);
        }

        @Test
        @DisplayName("正常系: 6nルールで過去スケジュールを非表示にする")
        void getSchedulesSplit_6nRule() {
            // Arrange - 13個の過去スケジュール -> 12個(6*2)を非表示にし、1個を表示
            when(scheduleRepository.countPastSchedules(any(), any())).thenReturn(13L);
            when(scheduleRepository.countFutureSchedules(any(), any())).thenReturn(5L);
            when(scheduleRepository.findPastSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));
            when(scheduleRepository.findFutureSchedules(any(), any(), any())).thenReturn(List.of(testSchedule));

            // Act
            Map<String, Object> result = scheduleService.getSchedulesSplit(false, 10);

            // Assert
            assertThat(result.get("hiddenPastCount")).isEqualTo(12L);
            assertThat(result.get("hasMorePast")).isEqualTo(true);
        }

        @Test
        @DisplayName("正常系: スケジュールがない場合")
        void getSchedulesSplit_empty() {
            // Arrange
            when(scheduleRepository.countPastSchedules(any(), any())).thenReturn(0L);
            when(scheduleRepository.countFutureSchedules(any(), any())).thenReturn(0L);
            when(scheduleRepository.findFutureSchedules(any(), any(), any())).thenReturn(List.of());

            // Act
            Map<String, Object> result = scheduleService.getSchedulesSplit(false, 10);

            // Assert
            @SuppressWarnings("unchecked")
            List<ScheduleDto> pastSchedules = (List<ScheduleDto>) result.get("pastSchedules");
            @SuppressWarnings("unchecked")
            List<ScheduleDto> futureSchedules = (List<ScheduleDto>) result.get("futureSchedules");

            assertThat(pastSchedules).isEmpty();
            assertThat(futureSchedules).isEmpty();
            assertThat(result.get("hasMorePast")).isEqualTo(false);
            assertThat(result.get("hasMoreFuture")).isEqualTo(false);
        }
    }

    @Nested
    @DisplayName("toDto - エンティティからDTOへの変換")
    class ToDtoTests {

        @Test
        @DisplayName("正常系: 全フィールドが正しく変換される")
        void toDto_allFields() {
            // Arrange
            when(scheduleRepository.findById(1L)).thenReturn(Optional.of(testSchedule));

            // Act
            ScheduleDto result = scheduleService.getScheduleById(1L);

            // Assert
            assertThat(result.getId()).isEqualTo(testSchedule.getId());
            assertThat(result.getUrlId()).isEqualTo(testSchedule.getUrlId());
            assertThat(result.getSummary()).isEqualTo(testSchedule.getSummary());
            assertThat(result.getDtstart()).isEqualTo(testSchedule.getDtstart());
            assertThat(result.getDtend()).isEqualTo(testSchedule.getDtend());
            assertThat(result.getAllDay()).isEqualTo(testSchedule.getAllDay());
            assertThat(result.getLocation()).isEqualTo(testSchedule.getLocation());
            assertThat(result.getDescription()).isEqualTo(testSchedule.getDescription());
            assertThat(result.getSong()).isEqualTo(testSchedule.getSong());
            assertThat(result.getRecording()).isEqualTo(testSchedule.getRecording());
            assertThat(result.getAttendees()).isEqualTo(testSchedule.getAttendees());
            assertThat(result.getDtstamp()).isEqualTo(testSchedule.getDtstamp());
            assertThat(result.getCreatedAt()).isEqualTo(testSchedule.getCreatedAt());
            assertThat(result.getUpdatedAt()).isEqualTo(testSchedule.getUpdatedAt());
            assertThat(result.getUpdatedBy()).isEqualTo(testSchedule.getUpdatedBy());
        }
    }

    @Nested
    @DisplayName("getCurrentUsername - 現在のユーザー名取得")
    class GetCurrentUsernameTests {

        @Test
        @DisplayName("正常系: 認証済みユーザーのユーザー名を取得できる")
        void getCurrentUsername_authenticated() {
            // Arrange
            setupSecurityContext();
            when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> {
                Schedule schedule = invocation.getArgument(0);
                assertThat(schedule.getUpdatedBy()).isEqualTo("testuser");
                return testSchedule;
            });

            // Act
            scheduleService.createSchedule(testScheduleDto);

            // Assert
            verify(scheduleRepository).save(any(Schedule.class));
        }

        @Test
        @DisplayName("正常系: 認証がnullの場合、nullを返す")
        void getCurrentUsername_nullAuth() {
            // Arrange
            SecurityContextHolder.setContext(securityContext);
            when(securityContext.getAuthentication()).thenReturn(null);
            when(scheduleRepository.save(any(Schedule.class))).thenAnswer(invocation -> {
                Schedule schedule = invocation.getArgument(0);
                assertThat(schedule.getUpdatedBy()).isNull();
                return testSchedule;
            });

            // Act
            scheduleService.createSchedule(testScheduleDto);

            // Assert
            verify(scheduleRepository).save(any(Schedule.class));
        }
    }
}
