package io.github.tknknk.yucale.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

/**
 * ValidDateTimeRangeValidatorのユニットテスト
 *
 * このバリデータは開始日時と終了日時の範囲を検証し、
 * 終了日時が開始日時より前でないことを確認する
 */
@ExtendWith(MockitoExtension.class)
class ValidDateTimeRangeValidatorTest {

    private ValidDateTimeRangeValidator validator;

    @Mock
    private ConstraintValidatorContext context;

    @Mock
    private ValidDateTimeRange constraintAnnotation;

    @BeforeEach
    void setUp() {
        validator = new ValidDateTimeRangeValidator();
    }

    /**
     * テスト用のDTOクラス（デフォルトフィールド名: dtstart, dtend）
     */
    static class DefaultFieldsDto {
        private LocalDateTime dtstart;
        private LocalDateTime dtend;

        public DefaultFieldsDto(LocalDateTime dtstart, LocalDateTime dtend) {
            this.dtstart = dtstart;
            this.dtend = dtend;
        }
    }

    /**
     * テスト用のDTOクラス（カスタムフィールド名: startTime, endTime）
     */
    static class CustomFieldsDto {
        private LocalDateTime startTime;
        private LocalDateTime endTime;

        public CustomFieldsDto(LocalDateTime startTime, LocalDateTime endTime) {
            this.startTime = startTime;
            this.endTime = endTime;
        }
    }

    /**
     * テスト用のDTOクラス（存在しないフィールド名）
     */
    static class MissingFieldDto {
        private LocalDateTime someField;

        public MissingFieldDto(LocalDateTime someField) {
            this.someField = someField;
        }
    }

    @Nested
    @DisplayName("デフォルトフィールド名（dtstart, dtend）でのテスト")
    class DefaultFieldsTest {

        @BeforeEach
        void setUp() {
            when(constraintAnnotation.startField()).thenReturn("dtstart");
            when(constraintAnnotation.endField()).thenReturn("dtend");
            validator.initialize(constraintAnnotation);
        }

        @Test
        @DisplayName("終了日時が開始日時より後の場合は有効")
        void shouldReturnTrueWhenEndIsAfterStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 10, 0);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 12, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("終了日時が開始日時と同じ場合は有効")
        void shouldReturnTrueWhenEndEqualsStart() {
            // given
            LocalDateTime dateTime = LocalDateTime.of(2024, 1, 1, 10, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(dateTime, dateTime);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("終了日時が開始日時より前の場合は無効")
        void shouldReturnFalseWhenEndIsBeforeStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 12, 0);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 10, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }

        @Test
        @DisplayName("バリデーション対象がnullの場合は有効")
        void shouldReturnTrueWhenObjectIsNull() {
            assertThat(validator.isValid(null, context)).isTrue();
        }

        @Test
        @DisplayName("開始日時がnullの場合は有効（@NotNullで別途検証）")
        void shouldReturnTrueWhenStartIsNull() {
            // given
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 12, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(null, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("終了日時がnullの場合は有効（@NotNullで別途検証）")
        void shouldReturnTrueWhenEndIsNull() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 10, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, null);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("両方の日時がnullの場合は有効")
        void shouldReturnTrueWhenBothAreNull() {
            // given
            DefaultFieldsDto dto = new DefaultFieldsDto(null, null);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }
    }

    @Nested
    @DisplayName("カスタムフィールド名でのテスト")
    class CustomFieldsTest {

        @BeforeEach
        void setUp() {
            when(constraintAnnotation.startField()).thenReturn("startTime");
            when(constraintAnnotation.endField()).thenReturn("endTime");
            validator.initialize(constraintAnnotation);
        }

        @Test
        @DisplayName("カスタムフィールド名でも終了日時が開始日時より後なら有効")
        void shouldReturnTrueWithCustomFieldsWhenEndIsAfterStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 6, 15, 9, 0);
            LocalDateTime end = LocalDateTime.of(2024, 6, 15, 17, 0);
            CustomFieldsDto dto = new CustomFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("カスタムフィールド名でも終了日時が開始日時より前なら無効")
        void shouldReturnFalseWithCustomFieldsWhenEndIsBeforeStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 6, 15, 17, 0);
            LocalDateTime end = LocalDateTime.of(2024, 6, 15, 9, 0);
            CustomFieldsDto dto = new CustomFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }
    }

    @Nested
    @DisplayName("境界値・エッジケースのテスト")
    class EdgeCaseTest {

        @BeforeEach
        void setUp() {
            when(constraintAnnotation.startField()).thenReturn("dtstart");
            when(constraintAnnotation.endField()).thenReturn("dtend");
            validator.initialize(constraintAnnotation);
        }

        @Test
        @DisplayName("1秒だけ後の場合は有効")
        void shouldReturnTrueWhenEndIsOneSecondAfterStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 10, 0, 0);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 10, 0, 1);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("1ナノ秒だけ後の場合は有効")
        void shouldReturnTrueWhenEndIsOneNanosecondAfterStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 10, 0, 0, 0);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 10, 0, 0, 1);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("1秒だけ前の場合は無効")
        void shouldReturnFalseWhenEndIsOneSecondBeforeStart() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 10, 0, 1);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 10, 0, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }

        @Test
        @DisplayName("日をまたぐ範囲は有効")
        void shouldReturnTrueWhenRangeSpansMultipleDays() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 23, 0);
            LocalDateTime end = LocalDateTime.of(2024, 1, 2, 1, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("年をまたぐ範囲は有効")
        void shouldReturnTrueWhenRangeSpansYears() {
            // given
            LocalDateTime start = LocalDateTime.of(2023, 12, 31, 23, 59);
            LocalDateTime end = LocalDateTime.of(2024, 1, 1, 0, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("非常に長い期間（1年間）の範囲は有効")
        void shouldReturnTrueWhenRangeIsOneYear() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 1, 1, 0, 0);
            LocalDateTime end = LocalDateTime.of(2025, 1, 1, 0, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("閏年の日付を含む範囲は有効")
        void shouldHandleLeapYearDates() {
            // given - 2024年は閏年
            LocalDateTime start = LocalDateTime.of(2024, 2, 29, 10, 0);
            LocalDateTime end = LocalDateTime.of(2024, 3, 1, 10, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }
    }

    @Nested
    @DisplayName("エラーケースのテスト")
    class ErrorCaseTest {

        @Test
        @DisplayName("存在しないフィールド名の場合は無効を返す")
        void shouldReturnFalseWhenFieldNotFound() {
            // given
            when(constraintAnnotation.startField()).thenReturn("nonExistentStart");
            when(constraintAnnotation.endField()).thenReturn("nonExistentEnd");
            validator.initialize(constraintAnnotation);

            MissingFieldDto dto = new MissingFieldDto(LocalDateTime.now());

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }

        @Test
        @DisplayName("開始フィールドのみ存在しない場合は無効を返す")
        void shouldReturnFalseWhenOnlyStartFieldNotFound() {
            // given
            when(constraintAnnotation.startField()).thenReturn("nonExistent");
            when(constraintAnnotation.endField()).thenReturn("dtend");
            validator.initialize(constraintAnnotation);

            DefaultFieldsDto dto = new DefaultFieldsDto(
                    LocalDateTime.of(2024, 1, 1, 10, 0),
                    LocalDateTime.of(2024, 1, 1, 12, 0)
            );

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }

        @Test
        @DisplayName("終了フィールドのみ存在しない場合は無効を返す")
        void shouldReturnFalseWhenOnlyEndFieldNotFound() {
            // given
            when(constraintAnnotation.startField()).thenReturn("dtstart");
            when(constraintAnnotation.endField()).thenReturn("nonExistent");
            validator.initialize(constraintAnnotation);

            DefaultFieldsDto dto = new DefaultFieldsDto(
                    LocalDateTime.of(2024, 1, 1, 10, 0),
                    LocalDateTime.of(2024, 1, 1, 12, 0)
            );

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }
    }

    @Nested
    @DisplayName("実際のユースケースのテスト")
    class RealWorldUseCaseTest {

        @BeforeEach
        void setUp() {
            when(constraintAnnotation.startField()).thenReturn("dtstart");
            when(constraintAnnotation.endField()).thenReturn("dtend");
            validator.initialize(constraintAnnotation);
        }

        @Test
        @DisplayName("1時間のミーティングは有効")
        void shouldValidateOneHourMeeting() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 3, 15, 14, 0);
            LocalDateTime end = LocalDateTime.of(2024, 3, 15, 15, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("終日イベント（00:00から23:59）は有効")
        void shouldValidateAllDayEvent() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 3, 15, 0, 0);
            LocalDateTime end = LocalDateTime.of(2024, 3, 15, 23, 59);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("複数日のイベントは有効")
        void shouldValidateMultiDayEvent() {
            // given
            LocalDateTime start = LocalDateTime.of(2024, 3, 15, 9, 0);
            LocalDateTime end = LocalDateTime.of(2024, 3, 18, 18, 0);
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isTrue();
        }

        @Test
        @DisplayName("ユーザーが誤って終了を開始より前に設定した場合は無効")
        void shouldRejectUserMistakeWithSwappedTimes() {
            // given - ユーザーが誤って時間を逆に入力
            LocalDateTime start = LocalDateTime.of(2024, 3, 15, 18, 0); // 18:00
            LocalDateTime end = LocalDateTime.of(2024, 3, 15, 9, 0);    // 09:00
            DefaultFieldsDto dto = new DefaultFieldsDto(start, end);

            // when & then
            assertThat(validator.isValid(dto, context)).isFalse();
        }
    }
}
