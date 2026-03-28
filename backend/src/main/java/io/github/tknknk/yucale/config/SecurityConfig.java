package io.github.tknknk.yucale.config;

import com.fasterxml.jackson.databind.ObjectMapper;

import io.github.tknknk.yucale.dto.ApiResponse;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.authentication.logout.LogoutSuccessHandler;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import lombok.extern.slf4j.Slf4j;

import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@Slf4j
public class SecurityConfig {

    private final ObjectMapper objectMapper;
    private final RateLimitFilter rateLimitFilter;

    public SecurityConfig(ObjectMapper objectMapper, RateLimitFilter rateLimitFilter) {
        this.objectMapper = objectMapper;
        this.rateLimitFilter = rateLimitFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName("_csrf");

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(requestHandler)
                // Disable CSRF for:
                // 1. Public POST endpoints (users cannot obtain CSRF token before authentication)
                // 2. Auth endpoints after login/register (CSRF token may not be immediately available)
                // Note: These endpoints are still protected by session cookie with SameSite=Lax
                .ignoringRequestMatchers("/calendar.ics")
                .ignoringRequestMatchers("/api/auth/**")
                .ignoringRequestMatchers("/api/surveys/*/responses")
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/health").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/health/**").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/register").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                .requestMatchers(HttpMethod.GET, "/calendar.ics").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/csrf").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/public").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/upcoming").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/range").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/split").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/url/{urlId}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/schedules/{id}").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/surveys/defaults").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/surveys/{urlId}").permitAll()
                .requestMatchers(HttpMethod.POST, "/api/surveys/{urlId}/responses").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/notices/latest").hasAnyRole("VIEWER", "EDITOR", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/notices").hasAnyRole("VIEWER", "EDITOR", "ADMIN")
                .requestMatchers(HttpMethod.GET, "/api/notices/{id}").hasAnyRole("VIEWER", "EDITOR", "ADMIN")
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated()
            )
            .formLogin(form -> form
                .loginProcessingUrl("/api/auth/login")
                .usernameParameter("username")
                .passwordParameter("password")
                .successHandler(authenticationSuccessHandler())
                .failureHandler(authenticationFailureHandler())
                .permitAll()
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler(logoutSuccessHandler())
                .invalidateHttpSession(true)
                .deleteCookies("SESSION", "JSESSIONID")
                .permitAll()
            )
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json;charset=UTF-8");
                    ApiResponse<Void> apiResponse = ApiResponse.error("認証が必要です");
                    response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
                })
                .accessDeniedHandler((request, response, accessDeniedException) -> {
                    // Log access denied with details for security audit
                    var auth = org.springframework.security.core.context.SecurityContextHolder
                            .getContext().getAuthentication();
                    String user = auth != null ? auth.getName() : "anonymous";
                    String roles = auth != null
                            ? auth.getAuthorities().stream()
                                    .map(Object::toString)
                                    .collect(Collectors.joining(","))
                            : "none";
                    log.warn("Access denied | user={} | roles=[{}] | uri={} | reason={}",
                            user, roles, request.getRequestURI(), accessDeniedException.getMessage());

                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/json;charset=UTF-8");
                    ApiResponse<Void> apiResponse = ApiResponse.error("アクセスが拒否されました");
                    response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
                })
            )
            .sessionManagement(session -> session
                .maximumSessions(1)
                .maxSessionsPreventsLogin(false)
            )
            .addFilterBefore(rateLimitFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(List.of("http://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "X-XSRF-TOKEN"));
        configuration.setExposedHeaders(List.of("X-XSRF-TOKEN"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    private AuthenticationSuccessHandler authenticationSuccessHandler() {
        return (request, response, authentication) -> {
            response.setStatus(HttpStatus.OK.value());
            response.setContentType("application/json;charset=UTF-8");
            ApiResponse<String> apiResponse = ApiResponse.success("ログインしました", authentication.getName());
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        };
    }

    private AuthenticationFailureHandler authenticationFailureHandler() {
        return (request, response, exception) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType("application/json;charset=UTF-8");

            String errorMessage;
            if (exception instanceof LockedException) {
                errorMessage = "ログイン試行回数が多すぎるため、アカウントがロックされました。しばらくしてから再度お試しください。";
            } else {
                errorMessage = "メールアドレスまたはパスワードが正しくありません";
            }

            ApiResponse<Void> apiResponse = ApiResponse.error(errorMessage);
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        };
    }

    private LogoutSuccessHandler logoutSuccessHandler() {
        return (request, response, authentication) -> {
            response.setStatus(HttpStatus.OK.value());
            response.setContentType("application/json;charset=UTF-8");
            ApiResponse<Void> apiResponse = ApiResponse.success("ログアウトしました", null);
            response.getWriter().write(objectMapper.writeValueAsString(apiResponse));
        };
    }
}
