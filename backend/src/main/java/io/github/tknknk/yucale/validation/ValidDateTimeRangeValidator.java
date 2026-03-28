package io.github.tknknk.yucale.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.lang.reflect.Field;
import java.time.LocalDateTime;

public class ValidDateTimeRangeValidator implements ConstraintValidator<ValidDateTimeRange, Object> {

    private String startField;
    private String endField;

    @Override
    public void initialize(ValidDateTimeRange constraintAnnotation) {
        this.startField = constraintAnnotation.startField();
        this.endField = constraintAnnotation.endField();
    }

    @Override
    public boolean isValid(Object value, ConstraintValidatorContext context) {
        if (value == null) {
            return true;
        }

        try {
            Field startFieldObj = value.getClass().getDeclaredField(startField);
            Field endFieldObj = value.getClass().getDeclaredField(endField);
            startFieldObj.setAccessible(true);
            endFieldObj.setAccessible(true);

            LocalDateTime startValue = (LocalDateTime) startFieldObj.get(value);
            LocalDateTime endValue = (LocalDateTime) endFieldObj.get(value);

            if (startValue == null || endValue == null) {
                return true; // @NotNullで別途チェック
            }

            return !endValue.isBefore(startValue);
        } catch (NoSuchFieldException | IllegalAccessException e) {
            return false;
        }
    }
}
