package io.github.tknknk.yucale.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ValidDateTimeRangeValidator.class)
@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidDateTimeRange {
    String message() default "End date/time must be after or equal to start date/time";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
    String startField() default "dtstart";
    String endField() default "dtend";
}
