package io.github.tknknk.yucale.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = NoSymbolsValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER})
@Retention(RetentionPolicy.RUNTIME)
public @interface NoSymbols {
    String message() default "Symbols are not allowed";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
