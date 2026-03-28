package io.github.tknknk.yucale.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

import io.github.tknknk.yucale.dto.ApiResponse;
import io.github.tknknk.yucale.dto.AuthRequestDto;
import io.github.tknknk.yucale.dto.RegisterRequest;
import io.github.tknknk.yucale.dto.RoleRequestDto;
import io.github.tknknk.yucale.dto.UpdateUsernameRequest;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.security.CustomUserDetailsService;
import io.github.tknknk.yucale.service.AuthService;

@RestController
@RequestMapping("/api/auth")
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final CustomUserDetailsService customUserDetailsService;

    public AuthController(AuthService authService, CustomUserDetailsService customUserDetailsService) {
        this.authService = authService;
        this.customUserDetailsService = customUserDetailsService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpServletRequest) {
        try {
            UserDto user = authService.register(request);

            // Auto-login after registration: create session
            UserDetails userDetails = customUserDetailsService.loadUserByUsername(user.getEmail());
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(authentication);
            SecurityContextHolder.setContext(securityContext);

            // Save security context to session
            HttpSession session = httpServletRequest.getSession(true);
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);

            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("登録が完了しました", user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(HttpServletRequest request) {
        try {
            UserDto user = authService.getCurrentUserAndRefreshSession(request);
            return ResponseEntity.ok(ApiResponse.success("ユーザー情報を取得しました", user));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/request-role")
    public ResponseEntity<ApiResponse<AuthRequestDto>> requestRole(@Valid @RequestBody RoleRequestDto roleRequestDto) {
        try {
            AuthRequest authRequest = authService.requestRole(roleRequestDto);
            AuthRequestDto dto = mapToAuthRequestDto(authRequest);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success("権限リクエストを送信しました", dto));
        } catch (IllegalArgumentException | IllegalStateException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<UserDto>> refreshSession() {
        try {
            // Session-based auth: validate current session and return user info
            UserDto user = authService.getCurrentUser();
            return ResponseEntity.ok(ApiResponse.success("セッションを更新しました", user));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ApiResponse.error("セッションが切れました"));
        }
    }

    @GetMapping("/csrf")
    public ResponseEntity<ApiResponse<CsrfTokenDto>> getCsrfToken(HttpServletRequest request) {
        CsrfToken csrfToken = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        if (csrfToken != null) {
            CsrfTokenDto dto = new CsrfTokenDto(
                    csrfToken.getToken(),
                    csrfToken.getHeaderName(),
                    csrfToken.getParameterName()
            );
            return ResponseEntity.ok(ApiResponse.success("CSRFトークンを取得しました", dto));
        }
        return ResponseEntity.ok(ApiResponse.success("CSRFトークンがありません", null));
    }

    @PutMapping("/username")
    public ResponseEntity<ApiResponse<UserDto>> updateUsername(
            @Valid @RequestBody UpdateUsernameRequest request) {
        try {
            UserDto user = authService.updateUsername(request.getUsername());
            return ResponseEntity.ok(ApiResponse.success("ユーザー名を更新しました", user));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error(e.getMessage()));
        }
    }

    private AuthRequestDto mapToAuthRequestDto(AuthRequest authRequest) {
        return AuthRequestDto.builder()
                .id(authRequest.getId())
                .userId(authRequest.getUser().getId())
                .username(authRequest.getUser().getUsername())
                .requestedRole(authRequest.getRequestedRole())
                .requestMessage(authRequest.getRequestMessage())
                .status(authRequest.getStatus())
                .createdAt(authRequest.getCreatedAt())
                .updatedAt(authRequest.getUpdatedAt())
                .build();
    }

    // Inner class for CSRF token response
    public record CsrfTokenDto(String token, String headerName, String parameterName) {}
}
