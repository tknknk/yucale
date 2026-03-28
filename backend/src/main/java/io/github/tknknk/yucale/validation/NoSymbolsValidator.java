package io.github.tknknk.yucale.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class NoSymbolsValidator implements ConstraintValidator<NoSymbols, String> {

    // フロントエンドと同じ記号パターン
    private static final Pattern SYMBOL_PATTERN = Pattern.compile(
            "[!\"#$%&'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~。、・「」『』【】〈〉《》（）！？＠＃＄％＆＊＋＝～｀]"
    );

    @Override
    public void initialize(NoSymbols constraintAnnotation) {
    }

    @Override
    public boolean isValid(String value, ConstraintValidatorContext context) {
        if (value == null || value.isEmpty()) {
            return true; // @NotBlankで別途チェック
        }
        return !SYMBOL_PATTERN.matcher(value).find();
    }
}
