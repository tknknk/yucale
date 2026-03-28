package io.github.tknknk.yucale.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.tknknk.yucale.dto.RegisterRequest;
import io.github.tknknk.yucale.dto.RoleRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.exception.ConflictException;
import io.github.tknknk.yucale.exception.ResourceNotFoundException;
import io.github.tknknk.yucale.repository.AuthRequestRepository;
import io.github.tknknk.yucale.repository.SurveyResponseRepository;
import io.github.tknknk.yucale.repository.UserRepository;
import io.github.tknknk.yucale.security.CustomUserDetails;

@Service
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final AuthRequestRepository authRequestRepository;
    private final SurveyResponseRepository surveyResponseRepository;
    private final PasswordEncoder passwordEncoder;
    private final DiscordNotificationService discordNotificationService;

    @Value("${app.admin.email:}")
    private String adminEmail;

    public AuthService(UserRepository userRepository,
                       AuthRequestRepository authRequestRepository,
                       SurveyResponseRepository surveyResponseRepository,
                       PasswordEncoder passwordEncoder,
                       DiscordNotificationService discordNotificationService) {
        this.userRepository = userRepository;
        this.authRequestRepository = authRequestRepository;
        this.surveyResponseRepository = surveyResponseRepository;
        this.passwordEncoder = passwordEncoder;
        this.discordNotificationService = discordNotificationService;
    }

    @Transactional
    public UserDto register(RegisterRequest request) {
        log.info("User registration started | email={}", request.getEmail());

        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            log.warn("Registration failed | email={} | reason=Username already taken", request.getEmail());
            throw new ConflictException("このユーザー名は既に使用されています");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            log.warn("Registration failed | email={} | reason=Email already in use", request.getEmail());
            throw new ConflictException("このメールアドレスは既に登録されています");
        }

        // Determine role: ADMIN if email matches ADMIN_EMAIL, otherwise NO_ROLE
        Role userRole = Role.NO_ROLE;
        if (adminEmail != null && !adminEmail.isBlank() && adminEmail.equalsIgnoreCase(request.getEmail())) {
            userRole = Role.ADMIN;
        }

        // Create new user with hashed password
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .role(userRole)
                .build();

        User savedUser = userRepository.save(user);

        log.info("User registered | userId={} | role={}", savedUser.getId(), userRole);
        return mapToUserDto(savedUser);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUser() {
        User user = getAuthenticatedUser();
        return mapToUserDto(user);
    }

    @Transactional(readOnly = true)
    public UserDto getCurrentUserAndRefreshSession(HttpServletRequest request) {
        User user = getAuthenticatedUser();

        // Refresh the SecurityContext with updated user data
        CustomUserDetails updatedUserDetails = new CustomUserDetails(user);
        UsernamePasswordAuthenticationToken newAuth =
                new UsernamePasswordAuthenticationToken(updatedUserDetails, null, updatedUserDetails.getAuthorities());

        SecurityContext securityContext = SecurityContextHolder.getContext();
        securityContext.setAuthentication(newAuth);

        // Update session with refreshed security context
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, securityContext);
        }

        return mapToUserDto(user);
    }

    @Transactional
    public AuthRequest requestRole(RoleRequestDto roleRequestDto) {
        User user = getAuthenticatedUser();

        // Check if user already has a pending request
        if (authRequestRepository.existsByUserIdAndStatus(user.getId(), RequestStatus.PENDING)) {
            log.warn("Role request failed | userId={} | reason=Pending request exists", user.getId());
            throw new IllegalStateException("申請中のリクエストがあります");
        }

        // Validate requested role
        Role requestedRole = roleRequestDto.getRequestedRole();
        if (requestedRole == null) {
            throw new IllegalArgumentException("リクエストするロールを指定してください");
        }

        if (requestedRole == Role.NO_ROLE) {
            throw new IllegalArgumentException("NO_ROLEはリクエストできません");
        }

        // Check if user already has this role or higher
        if (user.getRole().ordinal() >= requestedRole.ordinal()) {
            throw new IllegalArgumentException("既にこのロール以上の権限を持っています");
        }

        // Create auth request
        AuthRequest authRequest = AuthRequest.builder()
                .user(user)
                .requestedRole(requestedRole)
                .requestMessage(roleRequestDto.getMessage())
                .status(RequestStatus.PENDING)
                .build();

        AuthRequest savedRequest = authRequestRepository.save(authRequest);

        log.info("Role requested | userId={} | requestedRole={}", user.getId(), requestedRole);

        // Send Discord notification
        discordNotificationService.sendNewRequestNotification(
                user.getUsername(),
                requestedRole.name(),
                roleRequestDto.getMessage()
        );

        return savedRequest;
    }

    @Transactional
    public UserDto updateUsername(String newUsername) {
        User user = getAuthenticatedUser();
        String oldUsername = user.getUsername();

        // Check if new username is same as current
        if (oldUsername.equals(newUsername)) {
            throw new IllegalArgumentException("新しいユーザー名が現在と同じです");
        }

        // Check if username is already taken by another user
        if (userRepository.existsByUsername(newUsername)) {
            log.warn("Username update failed | userId={} | reason=Username already taken", user.getId());
            throw new ConflictException("このユーザー名は既に使用されています");
        }

        // Update username in survey responses
        surveyResponseRepository.updateUserName(oldUsername, newUsername);

        user.setUsername(newUsername);
        User savedUser = userRepository.save(user);

        log.info("Username updated | userId={} | oldUsername={} | newUsername={}", user.getId(), oldUsername, newUsername);
        return mapToUserDto(savedUser);
    }

    public User getAuthenticatedUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new IllegalStateException("認証されたユーザーが見つかりません");
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails customUserDetails) {
            // Always fetch fresh user data from DB to get updated role
            Long userId = customUserDetails.getUser().getId();
            return userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));
        }

        // Fallback: try to load user by username
        String username = authentication.getName();
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));
    }

    private UserDto mapToUserDto(User user) {
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
