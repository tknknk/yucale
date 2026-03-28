package io.github.tknknk.yucale.service;

import io.github.tknknk.yucale.entity.Schedule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

/**
 * IcsService のユニットテスト
 */
@ExtendWith(MockitoExtension.class)
class IcsServiceTest {

    @Mock
    private ScheduleService scheduleService;

    @InjectMocks
    private IcsService icsService;

    @TempDir
    Path tempDir;

    private Schedule testSchedule;
    private Schedule allDaySchedule;

    @BeforeEach
    void setUp() {
        // icsOutputPathとfrontendUrlのフィールドを設定
        ReflectionTestUtils.setField(icsService, "icsOutputPath", tempDir.resolve("calendar.ics").toString());
        ReflectionTestUtils.setField(icsService, "frontendUrl", "http://localhost:3000");

        // テスト用スケジュールの作成（時間指定イベント）
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
                .dtstamp(LocalDateTime.of(2024, 5, 1, 10, 0))
                .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .build();

        // テスト用スケジュールの作成（終日イベント）
        allDaySchedule = Schedule.builder()
                .id(2L)
                .urlId("def67890")
                .summary("All Day Event")
                .dtstart(LocalDateTime.of(2024, 6, 15, 0, 0))
                .dtend(LocalDateTime.of(2024, 6, 15, 23, 59))
                .allDay(true)
                .location("Osaka")
                .description("All Day Description")
                .dtstamp(LocalDateTime.of(2024, 5, 1, 10, 0))
                .createdAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .updatedAt(LocalDateTime.of(2024, 5, 1, 10, 0))
                .build();
    }

    @Nested
    @DisplayName("generateIcsContent - ICSコンテンツ生成")
    class GenerateIcsContentTests {

        @Test
        @DisplayName("正常系: ICSコンテンツを生成できる")
        void generateIcsContent_success() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).isNotEmpty();
            assertThat(result).contains("BEGIN:VCALENDAR");
            assertThat(result).contains("VERSION:2.0");
            assertThat(result).contains("PRODID:-//Yucale//EN");
            assertThat(result).contains("CALSCALE:GREGORIAN");
            assertThat(result).contains("METHOD:PUBLISH");
            assertThat(result).contains("X-WR-CALNAME:Yucale");
            assertThat(result).contains("END:VCALENDAR");
        }

        @Test
        @DisplayName("正常系: イベント情報が含まれる")
        void generateIcsContent_containsEvent() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("BEGIN:VEVENT");
            assertThat(result).contains("END:VEVENT");
            assertThat(result).contains("UID:schedule-1@Yucale");
            assertThat(result).contains("SUMMARY:Test Event");
            assertThat(result).contains("LOCATION:Tokyo");
        }

        @Test
        @DisplayName("正常系: スケジュールがない場合でも有効なICSを生成")
        void generateIcsContent_empty() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of());

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("BEGIN:VCALENDAR");
            assertThat(result).contains("END:VCALENDAR");
            assertThat(result).doesNotContain("BEGIN:VEVENT");
        }

        @Test
        @DisplayName("正常系: 複数イベントを含むICSを生成")
        void generateIcsContent_multipleEvents() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule, allDaySchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            // 2つのVEVENTが含まれることを確認
            int beginCount = result.split("BEGIN:VEVENT").length - 1;
            int endCount = result.split("END:VEVENT").length - 1;
            assertThat(beginCount).isEqualTo(2);
            assertThat(endCount).isEqualTo(2);
        }

        @Test
        @DisplayName("正常系: 終日イベントはDATE形式を使用")
        void generateIcsContent_allDayEvent() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(allDaySchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("DTSTART;VALUE=DATE:20240615");
            assertThat(result).contains("DTEND;VALUE=DATE:20240616"); // 終日イベントは翌日
        }

        @Test
        @DisplayName("正常系: 時間指定イベントはDATETIME形式を使用")
        void generateIcsContent_timedEvent() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("DTSTART:");
            assertThat(result).contains("DTEND:");
            // UTC形式であることを確認
            assertThat(result).containsPattern("DTSTART:\\d{8}T\\d{6}Z");
            assertThat(result).containsPattern("DTEND:\\d{8}T\\d{6}Z");
        }

        @Test
        @DisplayName("正常系: DESCRIPTIONにsong, description, recording, URLが含まれる")
        void generateIcsContent_descriptionContent() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("DESCRIPTION:");
            // エスケープされた内容を確認
            assertThat(result).contains("Test Song");
            assertThat(result).contains("Test Description");
            assertThat(result).contains("Test Recording");
            assertThat(result).contains("http://localhost:3000/schedule/abc12345");
        }

        @Test
        @DisplayName("正常系: CRLFで行が区切られる")
        void generateIcsContent_crlfLineEnding() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("\r\n");
        }
    }

    @Nested
    @DisplayName("generateAndSaveIcsFile - ICSファイル生成・保存")
    class GenerateAndSaveIcsFileTests {

        @Test
        @DisplayName("正常系: ICSファイルを生成・保存できる")
        void generateAndSaveIcsFile_success() throws IOException {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));
            Path icsPath = tempDir.resolve("calendar.ics");

            // Act
            icsService.generateAndSaveIcsFile();

            // Assert
            assertThat(Files.exists(icsPath)).isTrue();
            String content = Files.readString(icsPath);
            assertThat(content).contains("BEGIN:VCALENDAR");
            assertThat(content).contains("END:VCALENDAR");
        }

        @Test
        @DisplayName("正常系: 親ディレクトリが存在しない場合、作成される")
        void generateAndSaveIcsFile_createParentDir() throws IOException {
            // Arrange
            Path subDir = tempDir.resolve("subdir");
            Path icsPath = subDir.resolve("calendar.ics");
            ReflectionTestUtils.setField(icsService, "icsOutputPath", icsPath.toString());
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            icsService.generateAndSaveIcsFile();

            // Assert
            assertThat(Files.exists(icsPath)).isTrue();
        }

        @Test
        @DisplayName("正常系: 既存ファイルを上書きできる")
        void generateAndSaveIcsFile_overwrite() throws IOException {
            // Arrange
            Path icsPath = tempDir.resolve("calendar.ics");
            Files.writeString(icsPath, "OLD CONTENT");
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            icsService.generateAndSaveIcsFile();

            // Assert
            String content = Files.readString(icsPath);
            assertThat(content).doesNotContain("OLD CONTENT");
            assertThat(content).contains("BEGIN:VCALENDAR");
        }
    }

    @Nested
    @DisplayName("formatDateTimeUtc - UTC日時フォーマット")
    class FormatDateTimeUtcTests {

        @Test
        @DisplayName("正常系: LocalDateTimeをUTC形式にフォーマット")
        void formatDateTimeUtc_success() {
            // Arrange
            LocalDateTime dateTime = LocalDateTime.of(2024, 6, 1, 10, 30, 45);

            // Act
            String result = icsService.formatDateTimeUtc(dateTime);

            // Assert
            // UTC変換されるため、システムタイムゾーンによって結果が異なる
            assertThat(result).matches("\\d{8}T\\d{6}Z");
        }

        @Test
        @DisplayName("正常系: nullの場合、現在時刻を使用")
        void formatDateTimeUtc_null() {
            // Act
            String result = icsService.formatDateTimeUtc(null);

            // Assert
            assertThat(result).matches("\\d{8}T\\d{6}Z");
        }

        @Test
        @DisplayName("正常系: UTCタイムゾーンで正しくフォーマットされる")
        void formatDateTimeUtc_correctUtcConversion() {
            // Arrange - 特定の日時を設定
            LocalDateTime dateTime = LocalDateTime.of(2024, 1, 1, 0, 0, 0);

            // Act
            String result = icsService.formatDateTimeUtc(dateTime);

            // Assert - 形式が正しいことを確認（UTC変換の結果は環境依存）
            assertThat(result).endsWith("Z");
        }
    }

    @Nested
    @DisplayName("formatDate - 日付フォーマット（終日イベント用）")
    class FormatDateTests {

        @Test
        @DisplayName("正常系: LocalDateTimeを日付形式にフォーマット")
        void formatDate_success() {
            // Arrange
            LocalDateTime dateTime = LocalDateTime.of(2024, 6, 15, 10, 30);

            // Act
            String result = icsService.formatDate(dateTime);

            // Assert
            assertThat(result).isEqualTo("20240615");
        }

        @Test
        @DisplayName("正常系: nullの場合、現在日付を使用")
        void formatDate_null() {
            // Act
            String result = icsService.formatDate(null);

            // Assert
            assertThat(result).matches("\\d{8}");
        }

        @Test
        @DisplayName("正常系: 月と日が1桁の場合、ゼロ埋め")
        void formatDate_zeroPadding() {
            // Arrange
            LocalDateTime dateTime = LocalDateTime.of(2024, 1, 5, 0, 0);

            // Act
            String result = icsService.formatDate(dateTime);

            // Assert
            assertThat(result).isEqualTo("20240105");
        }
    }

    @Nested
    @DisplayName("escapeIcsText - ICSテキストエスケープ")
    class EscapeIcsTextTests {

        @Test
        @DisplayName("正常系: バックスラッシュをエスケープ")
        void escapeIcsText_backslash() {
            // Act
            String result = icsService.escapeIcsText("path\\to\\file");

            // Assert
            assertThat(result).isEqualTo("path\\\\to\\\\file");
        }

        @Test
        @DisplayName("正常系: セミコロンをエスケープ")
        void escapeIcsText_semicolon() {
            // Act
            String result = icsService.escapeIcsText("item1;item2");

            // Assert
            assertThat(result).isEqualTo("item1\\;item2");
        }

        @Test
        @DisplayName("正常系: カンマをエスケープ")
        void escapeIcsText_comma() {
            // Act
            String result = icsService.escapeIcsText("item1,item2");

            // Assert
            assertThat(result).isEqualTo("item1\\,item2");
        }

        @Test
        @DisplayName("正常系: 改行（LF）をエスケープ")
        void escapeIcsText_newline() {
            // Act
            String result = icsService.escapeIcsText("line1\nline2");

            // Assert
            assertThat(result).isEqualTo("line1\\nline2");
        }

        @Test
        @DisplayName("正常系: 改行（CRLF）をエスケープ")
        void escapeIcsText_crlf() {
            // Act
            String result = icsService.escapeIcsText("line1\r\nline2");

            // Assert
            assertThat(result).isEqualTo("line1\\nline2");
        }

        @Test
        @DisplayName("正常系: 改行（CR）をエスケープ")
        void escapeIcsText_cr() {
            // Act
            String result = icsService.escapeIcsText("line1\rline2");

            // Assert
            assertThat(result).isEqualTo("line1\\nline2");
        }

        @Test
        @DisplayName("正常系: nullの場合、空文字を返す")
        void escapeIcsText_null() {
            // Act
            String result = icsService.escapeIcsText(null);

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("正常系: 複合的なエスケープ")
        void escapeIcsText_combined() {
            // Act
            String result = icsService.escapeIcsText("item1,item2;path\\to\\file\nline2");

            // Assert
            assertThat(result).isEqualTo("item1\\,item2\\;path\\\\to\\\\file\\nline2");
        }

        @Test
        @DisplayName("正常系: 空文字の場合、空文字を返す")
        void escapeIcsText_empty() {
            // Act
            String result = icsService.escapeIcsText("");

            // Assert
            assertThat(result).isEmpty();
        }

        @Test
        @DisplayName("正常系: エスケープ不要な文字はそのまま")
        void escapeIcsText_noEscape() {
            // Act
            String result = icsService.escapeIcsText("Hello World 123");

            // Assert
            assertThat(result).isEqualTo("Hello World 123");
        }
    }

    @Nested
    @DisplayName("appendEvent - イベント追加")
    class AppendEventTests {

        @Test
        @DisplayName("正常系: locationがnullの場合、LOCATIONフィールドを含まない")
        void appendEvent_noLocation() {
            // Arrange
            testSchedule.setLocation(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("LOCATION:");
        }

        @Test
        @DisplayName("正常系: locationが空文字の場合、LOCATIONフィールドを含まない")
        void appendEvent_emptyLocation() {
            // Arrange
            testSchedule.setLocation("");
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("LOCATION:");
        }

        @Test
        @DisplayName("正常系: CREATEDとLAST-MODIFIEDが含まれる")
        void appendEvent_timestamps() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("CREATED:");
            assertThat(result).contains("LAST-MODIFIED:");
        }

        @Test
        @DisplayName("正常系: createdAtがnullの場合、CREATEDフィールドを含まない")
        void appendEvent_noCreatedAt() {
            // Arrange
            testSchedule.setCreatedAt(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("CREATED:");
        }

        @Test
        @DisplayName("正常系: updatedAtがnullの場合、LAST-MODIFIEDフィールドを含まない")
        void appendEvent_noUpdatedAt() {
            // Arrange
            testSchedule.setUpdatedAt(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("LAST-MODIFIED:");
        }
    }

    @Nested
    @DisplayName("buildDescription - DESCRIPTION構築")
    class BuildDescriptionTests {

        @Test
        @DisplayName("正常系: songのみの場合")
        void buildDescription_songOnly() {
            // Arrange
            testSchedule.setDescription(null);
            testSchedule.setRecording(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("Test Song");
        }

        @Test
        @DisplayName("正常系: descriptionのみの場合")
        void buildDescription_descriptionOnly() {
            // Arrange
            testSchedule.setSong(null);
            testSchedule.setRecording(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("Test Description");
        }

        @Test
        @DisplayName("正常系: recordingのみの場合")
        void buildDescription_recordingOnly() {
            // Arrange
            testSchedule.setSong(null);
            testSchedule.setDescription(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("Test Recording");
        }

        @Test
        @DisplayName("正常系: 全てnullの場合、URLのみ")
        void buildDescription_allNull() {
            // Arrange
            testSchedule.setSong(null);
            testSchedule.setDescription(null);
            testSchedule.setRecording(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("http://localhost:3000/schedule/abc12345");
        }

        @Test
        @DisplayName("正常系: urlIdがnullの場合、URLを含まない")
        void buildDescription_noUrlId() {
            // Arrange
            testSchedule.setSong(null);
            testSchedule.setDescription(null);
            testSchedule.setRecording(null);
            testSchedule.setUrlId(null);
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("http://localhost:3000/schedule/");
        }

        @Test
        @DisplayName("正常系: urlIdが空文字の場合、URLを含まない")
        void buildDescription_emptyUrlId() {
            // Arrange
            testSchedule.setSong(null);
            testSchedule.setDescription(null);
            testSchedule.setRecording(null);
            testSchedule.setUrlId("");
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).doesNotContain("http://localhost:3000/schedule/");
        }

        @Test
        @DisplayName("正常系: 全て設定されている場合")
        void buildDescription_allSet() {
            // Arrange
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act
            String result = icsService.generateIcsContent();

            // Assert
            assertThat(result).contains("Test Song");
            assertThat(result).contains("Test Description");
            assertThat(result).contains("Test Recording");
            assertThat(result).contains("http://localhost:3000/schedule/abc12345");
        }
    }

    @Nested
    @DisplayName("エラーハンドリング")
    class ErrorHandlingTests {

        @Test
        @DisplayName("正常系: 不正なパスでもエラーをキャッチしてログ出力")
        void generateAndSaveIcsFile_invalidPath() {
            // Arrange
            // 不正なパスを設定（存在しないドライブなど）
            ReflectionTestUtils.setField(icsService, "icsOutputPath", "/invalid/path/that/does/not/exist/calendar.ics");
            when(scheduleService.getAllSchedulesForIcs()).thenReturn(List.of(testSchedule));

            // Act & Assert - 例外がスローされないことを確認
            // IOExceptionはキャッチされてログに出力される
            icsService.generateAndSaveIcsFile();
            // メソッドが例外をスローせずに完了することを確認
        }
    }
}
