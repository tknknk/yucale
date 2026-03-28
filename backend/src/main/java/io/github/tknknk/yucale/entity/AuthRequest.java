package io.github.tknknk.yucale.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import io.github.tknknk.yucale.enums.RequestStatus;
import io.github.tknknk.yucale.enums.Role;

import java.time.LocalDateTime;

@Entity
@Table(name = "auth_requests")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotNull(message = "User is required")
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @NotNull(message = "Requested role is required")
    @Enumerated(EnumType.STRING)
    @Column(name = "requested_role", nullable = false)
    private Role requestedRole;

    @Size(max = 500, message = "Request message must not exceed 500 characters")
    @Column(name = "request_message", length = 500)
    private String requestMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private RequestStatus status = RequestStatus.PENDING;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
