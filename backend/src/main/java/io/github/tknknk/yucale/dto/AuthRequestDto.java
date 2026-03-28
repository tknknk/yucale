package io.github.tknknk.yucale.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequestDto {

    private Long id;

    private Long userId;
    private String username;

    @NotNull(message = "Requested role is required")
    private Role requestedRole;

    @Size(max = 500, message = "Request message must not exceed 500 characters")
    private String requestMessage;

    private RequestStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
