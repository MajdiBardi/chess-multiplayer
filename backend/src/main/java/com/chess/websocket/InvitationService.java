package com.chess.websocket;

import lombok.Data;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class InvitationService {

    @Data
    public static class Invitation {
        private final String fromUsername;
        private final String toUsername;
        private final long createdAt = System.currentTimeMillis();
        private volatile boolean accepted;
        private volatile boolean declined;
        private Long gameId;
    }

    private final Map<String, Invitation> pendingByTo = new ConcurrentHashMap<>(); // toUsername -> invitation

    public Invitation create(String fromUsername, String toUsername) {
        if (pendingByTo.containsKey(toUsername)) {
            return null; // already has pending
        }
        Invitation inv = new Invitation(fromUsername, toUsername);
        pendingByTo.put(toUsername, inv);
        return inv;
    }

    public Invitation getPendingFor(String toUsername) {
        return pendingByTo.get(toUsername);
    }

    public void accept(String toUsername, Long gameId) {
        Invitation inv = pendingByTo.get(toUsername);
        if (inv != null) {
            inv.setAccepted(true);
            inv.setGameId(gameId);
        }
    }

    public void decline(String toUsername) {
        Invitation inv = pendingByTo.remove(toUsername);
        if (inv != null) {
            inv.setDeclined(true);
        }
    }

    public void remove(String toUsername) {
        pendingByTo.remove(toUsername);
    }
}
