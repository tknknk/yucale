package io.github.tknknk.yucale.dto;

import io.github.tknknk.yucale.validation.NoSymbols;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUsernameRequest {

    @NotBlank(message = "Username is required")
    @Size(min = 1, max = 20, message = "Username must be between 1 and 20 characters")
    @NoSymbols(message = "Username must not contain symbols")
    private String username;
}
