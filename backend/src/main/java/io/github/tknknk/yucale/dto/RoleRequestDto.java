package io.github.tknknk.yucale.dto;

import io.github.tknknk.yucale.enums.Role;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoleRequestDto {

    @NotNull(message = "Requested role is required")
    private Role requestedRole;

    private String message;
}
