package io.github.tknknk.yucale.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.tknknk.yucale.dto.AuthRequestDto;
import io.github.tknknk.yucale.dto.UserDto;
import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;
import io.github.tknknk.yucale.exception.ResourceNotFoundException;
import io.github.tknknk.yucale.repository.AuthRequestRepository;
import io.github.tknknk.yucale.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AdminService {

    private final AuthRequestRepository authRequestRepository;
    private final UserRepository userRepository;
    private final DiscordNotificationService discordNotificationService;
    private final SessionService sessionService;

    public List<AuthRequestDto> getPendingRequests() {
        List<AuthRequest> requests = authRequestRepository.findByStatus(RequestStatus.PENDING);
        return requests.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    public List<AuthRequestDto> getAllRequests() {
        List<AuthRequest> requests = authRequestRepository.findAll();
        return requests.stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public AuthRequestDto approveRequest(Long requestId) {
        AuthRequest request = authRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("リクエストが見つかりません"));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("このリクエストは既に処理済みです");
        }

        // Update request status
        request.setStatus(RequestStatus.APPROVED);
        authRequestRepository.save(request);

        // Update user role
        User user = request.getUser();
        user.setRole(request.getRequestedRole());
        userRepository.save(user);

        log.info("Approved role request {} for user {} to role {}",
                requestId, user.getUsername(), request.getRequestedRole());

        // Invalidate user's sessions to force re-login with new role
        sessionService.invalidateUserSessions(user.getUsername());

        // Send Discord notification
        discordNotificationService.sendApprovalNotification(user.getUsername(), request.getRequestedRole().name());

        return toDto(request);
    }

    @Transactional
    public AuthRequestDto rejectRequest(Long requestId, String reason) {
        AuthRequest request = authRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("リクエストが見つかりません"));

        if (request.getStatus() != RequestStatus.PENDING) {
            throw new IllegalStateException("このリクエストは既に処理済みです");
        }

        // Update request status
        request.setStatus(RequestStatus.REJECTED);
        authRequestRepository.save(request);

        User user = request.getUser();
        log.info("Rejected role request {} for user {} (reason: {})",
                requestId, user.getUsername(), reason);

        // Send Discord notification
        discordNotificationService.sendRejectionNotification(user.getUsername(), request.getRequestedRole().name(), reason);

        return toDto(request);
    }

    public List<UserDto> getAllUsers() {
        List<User> users = userRepository.findAll();
        return users.stream()
                .map(this::toUserDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public void deleteUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("ユーザーが見つかりません"));

        if (user.getRole() == Role.ADMIN) {
            throw new IllegalArgumentException("管理者ユーザーは削除できません");
        }

        // Delete associated auth requests first
        authRequestRepository.deleteAll(authRequestRepository.findByUserId(userId));

        userRepository.delete(user);
        log.info("Deleted user: {} (id: {})", user.getUsername(), userId);
    }

    private AuthRequestDto toDto(AuthRequest request) {
        return AuthRequestDto.builder()
                .id(request.getId())
                .userId(request.getUser().getId())
                .username(request.getUser().getUsername())
                .requestedRole(request.getRequestedRole())
                .requestMessage(request.getRequestMessage())
                .status(request.getStatus())
                .createdAt(request.getCreatedAt())
                .updatedAt(request.getUpdatedAt())
                .build();
    }

    private UserDto toUserDto(User user) {
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
