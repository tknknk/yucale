package io.github.tknknk.yucale.validation;

import jakarta.validation.ConstraintValidatorContext;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * NoSymbolsValidatorのユニットテスト
 *
 * このバリデータはフロントエンドと同じ記号パターンを使用し、
 * 記号を含む文字列を拒否する
 */
@ExtendWith(MockitoExtension.class)
class NoSymbolsValidatorTest {

    private NoSymbolsValidator validator;

    @Mock
    private ConstraintValidatorContext context;

    @Mock
    private NoSymbols constraintAnnotation;

    @BeforeEach
    void setUp() {
        validator = new NoSymbolsValidator();
        validator.initialize(constraintAnnotation);
    }

    @Nested
    @DisplayName("有効な入力値のテスト（記号を含まない）")
    class ValidInputTest {

        @ParameterizedTest
        @NullAndEmptySource
        @DisplayName("nullまたは空文字列はtrue（他のバリデータで検証）")
        void shouldReturnTrueForNullOrEmpty(String value) {
            assertThat(validator.isValid(value, context)).isTrue();
        }

        @Test
        @DisplayName("英字のみの文字列は有効")
        void shouldReturnTrueForAlphabetOnly() {
            assertThat(validator.isValid("testuser", context)).isTrue();
            assertThat(validator.isValid("TestUser", context)).isTrue();
            assertThat(validator.isValid("ADMIN", context)).isTrue();
        }

        @Test
        @DisplayName("英字と数字の組み合わせは有効")
        void shouldReturnTrueForAlphanumeric() {
            assertThat(validator.isValid("user123", context)).isTrue();
            assertThat(validator.isValid("123user", context)).isTrue();
            assertThat(validator.isValid("User1Name2", context)).isTrue();
        }

        @Test
        @DisplayName("ひらがなは有効")
        void shouldReturnTrueForHiragana() {
            assertThat(validator.isValid("ゆうた", context)).isTrue();
            assertThat(validator.isValid("たろう", context)).isTrue();
        }

        @Test
        @DisplayName("カタカナは有効")
        void shouldReturnTrueForKatakana() {
            assertThat(validator.isValid("ユウタ", context)).isTrue();
            assertThat(validator.isValid("タロウ", context)).isTrue();
        }

        @Test
        @DisplayName("漢字は有効")
        void shouldReturnTrueForKanji() {
            assertThat(validator.isValid("山田太郎", context)).isTrue();
            assertThat(validator.isValid("田中花子", context)).isTrue();
        }

        @Test
        @DisplayName("日本語と英数字の組み合わせは有効")
        void shouldReturnTrueForMixedJapaneseAndAlphanumeric() {
            assertThat(validator.isValid("山田user123", context)).isTrue();
            assertThat(validator.isValid("User山田", context)).isTrue();
        }

        @Test
        @DisplayName("スペースは有効")
        void shouldReturnTrueForSpaces() {
            assertThat(validator.isValid("John Doe", context)).isTrue();
            assertThat(validator.isValid("山田 太郎", context)).isTrue();
        }
    }

    @Nested
    @DisplayName("無効な入力値のテスト（記号を含む）")
    class InvalidInputTest {

        @ParameterizedTest
        @ValueSource(strings = {"!", "\"", "#", "$", "%", "&", "'", "(", ")", "*", "+", ",", "-", ".", "/",
                ":", ";", "<", "=", ">", "?", "@", "[", "\\", "]", "^", "_", "`", "{", "|", "}", "~"})
        @DisplayName("ASCII記号は無効")
        void shouldReturnFalseForAsciiSymbols(String symbol) {
            assertThat(validator.isValid("test" + symbol + "user", context)).isFalse();
            assertThat(validator.isValid(symbol + "user", context)).isFalse();
            assertThat(validator.isValid("user" + symbol, context)).isFalse();
        }

        @ParameterizedTest
        @ValueSource(strings = {"。", "、", "・", "「", "」", "『", "』", "【", "】", "〈", "〉", "《", "》",
                "（", "）", "！", "？", "＠", "＃", "＄", "％", "＆", "＊", "＋", "＝", "～", "｀"})
        @DisplayName("全角記号は無効")
        void shouldReturnFalseForFullWidthSymbols(String symbol) {
            assertThat(validator.isValid("テスト" + symbol + "ユーザー", context)).isFalse();
            assertThat(validator.isValid(symbol + "ユーザー", context)).isFalse();
            assertThat(validator.isValid("ユーザー" + symbol, context)).isFalse();
        }

        @Test
        @DisplayName("複数の記号を含む場合も無効")
        void shouldReturnFalseForMultipleSymbols() {
            assertThat(validator.isValid("test@user.com", context)).isFalse();
            assertThat(validator.isValid("user#123!", context)).isFalse();
            assertThat(validator.isValid("【管理者】", context)).isFalse();
        }

        @Test
        @DisplayName("記号のみの文字列は無効")
        void shouldReturnFalseForSymbolsOnly() {
            assertThat(validator.isValid("@#$%", context)).isFalse();
            assertThat(validator.isValid("！？", context)).isFalse();
            assertThat(validator.isValid("---", context)).isFalse();
        }

        @Test
        @DisplayName("ハイフンを含む文字列は無効")
        void shouldReturnFalseForHyphen() {
            assertThat(validator.isValid("test-user", context)).isFalse();
            assertThat(validator.isValid("first-name-last", context)).isFalse();
        }

        @Test
        @DisplayName("アンダースコアを含む文字列は無効")
        void shouldReturnFalseForUnderscore() {
            assertThat(validator.isValid("test_user", context)).isFalse();
            assertThat(validator.isValid("first_name_last", context)).isFalse();
        }

        @Test
        @DisplayName("ドットを含む文字列は無効")
        void shouldReturnFalseForDot() {
            assertThat(validator.isValid("user.name", context)).isFalse();
            assertThat(validator.isValid(".hidden", context)).isFalse();
        }

        @Test
        @DisplayName("コロンを含む文字列は無効")
        void shouldReturnFalseForColon() {
            assertThat(validator.isValid("user:admin", context)).isFalse();
            assertThat(validator.isValid("a:b:c", context)).isFalse();
        }
    }

    @Nested
    @DisplayName("境界値・エッジケースのテスト")
    class EdgeCaseTest {

        @Test
        @DisplayName("単一文字の英字は有効")
        void shouldReturnTrueForSingleAlphabetCharacter() {
            assertThat(validator.isValid("a", context)).isTrue();
            assertThat(validator.isValid("Z", context)).isTrue();
        }

        @Test
        @DisplayName("単一の数字は有効")
        void shouldReturnTrueForSingleDigit() {
            assertThat(validator.isValid("0", context)).isTrue();
            assertThat(validator.isValid("9", context)).isTrue();
        }

        @Test
        @DisplayName("単一の記号は無効")
        void shouldReturnFalseForSingleSymbol() {
            assertThat(validator.isValid("@", context)).isFalse();
            assertThat(validator.isValid("！", context)).isFalse();
        }

        @Test
        @DisplayName("長い文字列でも正常に検証できる")
        void shouldWorkWithLongString() {
            // 100文字の英数字
            String longValidString = "a".repeat(100);
            assertThat(validator.isValid(longValidString, context)).isTrue();

            // 100文字の中に記号が1つ
            String longInvalidString = "a".repeat(50) + "@" + "a".repeat(49);
            assertThat(validator.isValid(longInvalidString, context)).isFalse();
        }

        @Test
        @DisplayName("Unicodeの絵文字は有効（パターンに含まれていない）")
        void shouldReturnTrueForEmoji() {
            // 絵文字はパターンに含まれていないため有効
            assertThat(validator.isValid("user😀", context)).isTrue();
            assertThat(validator.isValid("🎉test", context)).isTrue();
        }

        @Test
        @DisplayName("スペースのみの文字列は有効")
        void shouldReturnTrueForSpacesOnly() {
            assertThat(validator.isValid("   ", context)).isTrue();
        }
    }
}
