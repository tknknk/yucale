package io.github.tknknk.yucale.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.session.FindByIndexNameSessionRepository;
import org.springframework.session.Session;
import org.springframework.stereotype.Service;

import java.util.Map;

/**
 * Service for managing user sessions.
 * Used to invalidate sessions when user roles change.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SessionService {

    private final FindByIndexNameSessionRepository<? extends Session> sessionRepository;

    /**
     * Invalidate all sessions for a given user.
     * This forces the user to re-login and get updated role information.
     *
     * @param username the username (principal name) whose sessions should be invalidated
     */
    public void invalidateUserSessions(String username) {
        Map<String, ? extends Session> sessions = sessionRepository
                .findByPrincipalName(username);

        if (sessions.isEmpty()) {
            log.debug("No active sessions found for user: {}", username);
            return;
        }

        sessions.keySet().forEach(sessionRepository::deleteById);

        log.info("Invalidated {} session(s) for user={} | sessionIds={}",
                sessions.size(), username, sessions.keySet());
    }
}
