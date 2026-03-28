package io.github.tknknk.yucale.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import io.github.tknknk.yucale.entity.AuthRequest;
import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.enums.RequestStatus;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuthRequestRepository extends JpaRepository<AuthRequest, Long> {

    List<AuthRequest> findByUser(User user);

    List<AuthRequest> findByUserId(Long userId);

    List<AuthRequest> findByStatus(RequestStatus status);

    List<AuthRequest> findByUserAndStatus(User user, RequestStatus status);

    Optional<AuthRequest> findByUserIdAndStatus(Long userId, RequestStatus status);

    boolean existsByUserIdAndStatus(Long userId, RequestStatus status);
}
