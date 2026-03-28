package io.github.tknknk.yucale.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import io.github.tknknk.yucale.entity.User;
import io.github.tknknk.yucale.repository.UserRepository;

import java.util.Optional;

@Service
@Slf4j
public class LoginAttemptService {

    private final UserRepository userRepository;

    @Value("${app.security.login.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${app.security.login.lock-duration-minutes:15}")
    private int lockDurationMinutes;

    public LoginAttemptService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /**
     * ログイン成功時の処理
     * 失敗回数をリセットし、ロックを解除する
     */
    @Transactional
    public void onLoginSuccess(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (user.getFailedLoginAttempts() > 0 || user.getLockedUntil() != null) {
                user.resetLoginAttempts();
                userRepository.save(user);
                log.info("Reset login attempts for user: {}", email);
            }
        }
    }

    /**
     * ログイン失敗時の処理
     * 失敗回数をインクリメントし、閾値を超えたらロックする
     */
    @Transactional
    public void onLoginFailure(String email) {
        Optional<User> userOpt = userRepository.findByEmail(email);
        if (userOpt.isPresent()) {
            User user = userOpt.get();

            // 既にロックされている場合はスキップ
            if (user.isAccountLocked()) {
                log.debug("Account already locked for user: {}", email);
                return;
            }

            user.incrementFailedLoginAttempts();

            if (user.getFailedLoginAttempts() >= maxFailedAttempts) {
                user.lockAccount(lockDurationMinutes);
                log.warn("Account locked for user: {} due to {} failed attempts. Locked until: {}",
                        email, user.getFailedLoginAttempts(), user.getLockedUntil());
            } else {
                log.info("Failed login attempt {} of {} for user: {}",
                        user.getFailedLoginAttempts(), maxFailedAttempts, email);
            }

            userRepository.save(user);
        }
    }

    /**
     * ユーザーがロックされているかどうかを返す
     */
    @Transactional(readOnly = true)
    public boolean isAccountLocked(String email) {
        return userRepository.findByEmail(email)
                .map(User::isAccountLocked)
                .orElse(false);
    }

    /**
     * 残りの試行回数を返す
     */
    @Transactional(readOnly = true)
    public int getRemainingAttempts(String email) {
        return userRepository.findByEmail(email)
                .map(user -> Math.max(0, maxFailedAttempts - user.getFailedLoginAttempts()))
                .orElse(maxFailedAttempts);
    }
}
