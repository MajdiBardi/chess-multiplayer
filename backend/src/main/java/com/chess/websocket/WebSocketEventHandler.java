package com.chess.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventHandler {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = accessor.getSessionId();
        presenceService.unregister(sessionId);
        broadcastConnectedUsers();
    }

    public void broadcastConnectedUsers() {
        List<String> users = presenceService.getConnectedUsernames();
        messagingTemplate.convertAndSend("/topic/lobby/users", Map.of("usernames", users));
    }

    /** Resync lobby list for all clients every 2s so no one misses an update (e.g. when another user joins). */
    @Scheduled(fixedRate = 2000)
    public void broadcastLobbyPeriodically() {
        if (!presenceService.getConnectedUsernames().isEmpty()) {
            broadcastConnectedUsers();
        }
    }
}
