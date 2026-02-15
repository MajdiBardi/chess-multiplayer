package com.chess.websocket;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class PresenceService {

    // sessionId -> username
    private final Map<String, String> sessionToUser = new ConcurrentHashMap<>();
    // username -> sessionId (single session per user for simplicity)
    private final Map<String, String> userToSession = new ConcurrentHashMap<>();

    public void register(String sessionId, String username) {
        String oldSession = userToSession.get(username);
        if (oldSession != null) {
            sessionToUser.remove(oldSession);
        }
        sessionToUser.put(sessionId, username);
        userToSession.put(username, sessionId);
    }

    public void unregister(String sessionId) {
        String username = sessionToUser.remove(sessionId);
        if (username != null && userToSession.get(username) != null && userToSession.get(username).equals(sessionId)) {
            userToSession.remove(username);
        }
    }

    public String getUsername(String sessionId) {
        return sessionToUser.get(sessionId);
    }

    public String getSessionId(String username) {
        return userToSession.get(username);
    }

    public List<String> getConnectedUsernames() {
        return new ArrayList<>(userToSession.keySet());
    }

    public boolean isConnected(String username) {
        return userToSession.containsKey(username);
    }

    /**
     * Resolve the exact username used when registering (principal name) so that
     * convertAndSendToUser targets the right session (Spring matches by principal name).
     */
    public Optional<String> resolveConnectedUsername(String username) {
        if (username == null || username.isBlank()) return Optional.empty();
        if (userToSession.containsKey(username)) return Optional.of(username);
        return userToSession.keySet().stream()
                .filter(u -> u.equalsIgnoreCase(username))
                .findFirst();
    }
}
