package com.chess.websocket;

import com.chess.entity.Game;
import com.chess.service.GameService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller
@RequiredArgsConstructor
@Slf4j
public class LobbyController {

    private final PresenceService presenceService;
    private final SimpMessagingTemplate messagingTemplate;
    private final WebSocketEventHandler eventHandler;
    private final InvitationService invitationService;
    private final GameService gameService;

    @MessageMapping("/lobby/join")
    public void joinLobby(SimpMessageHeaderAccessor accessor, Principal principal) {
        if (principal == null) return;
        String sessionId = accessor.getSessionId();
        String username = principal.getName();
        presenceService.register(sessionId, username);
        eventHandler.broadcastConnectedUsers();
        // Send current list directly to this user so they always get it (avoids missed broadcast)
        messagingTemplate.convertAndSendToUser(username, "/queue/lobby/users",
                Map.of("usernames", presenceService.getConnectedUsernames()));
    }

    @MessageMapping("/lobby/invite")
    public void invite(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) return;
        String fromUsername = principal.getName();
        String toUsername = payload.get("toUsername");
        if (toUsername == null || toUsername.isBlank()) return;
        if (fromUsername.equalsIgnoreCase(toUsername)) return;
        String targetUser = presenceService.resolveConnectedUsername(toUsername).orElse(null);
        if (targetUser == null) return;
        InvitationService.Invitation inv = invitationService.create(fromUsername, targetUser);
        if (inv == null) return;
        messagingTemplate.convertAndSendToUser(targetUser, "/queue/invitations",
                Map.of("fromUsername", fromUsername, "type", "INVITATION"));
        log.debug("Invitation sent from {} to {}", fromUsername, targetUser);
    }

    @MessageMapping("/lobby/accept")
    public void acceptInvitation(@Payload Map<String, Object> payload, Principal principal) {
        if (principal == null) return;
        String toUsername = principal.getName();
        String fromUsername = (String) payload.get("fromUsername");
        if (fromUsername == null) return;
        InvitationService.Invitation inv = invitationService.getPendingFor(toUsername);
        if (inv == null || !inv.getFromUsername().equalsIgnoreCase(fromUsername)) return;
        String fromPrincipal = presenceService.resolveConnectedUsername(fromUsername).orElse(inv.getFromUsername());
        Game game = gameService.createGame(inv.getFromUsername(), toUsername);
        Long gameId = game.getId();
        invitationService.accept(toUsername, gameId);
        invitationService.remove(toUsername);
        Map<String, Object> msg = Map.of("type", "ACCEPTED", "toUsername", toUsername, "gameId", gameId,
                "whiteUsername", inv.getFromUsername(), "blackUsername", toUsername);
        messagingTemplate.convertAndSendToUser(fromPrincipal, "/queue/invitations", msg);
        messagingTemplate.convertAndSendToUser(toUsername, "/queue/invitations", msg);
    }

    @MessageMapping("/lobby/decline")
    public void declineInvitation(@Payload Map<String, String> payload, Principal principal) {
        if (principal == null) return;
        String toUsername = principal.getName();
        String fromUsername = payload.get("fromUsername");
        if (fromUsername == null) return;
        InvitationService.Invitation inv = invitationService.getPendingFor(toUsername);
        if (inv != null && inv.getFromUsername().equalsIgnoreCase(fromUsername)) {
            invitationService.decline(toUsername);
            String fromPrincipal = presenceService.resolveConnectedUsername(fromUsername).orElse(fromUsername);
            messagingTemplate.convertAndSendToUser(fromPrincipal, "/queue/invitations",
                    Map.of("type", "DECLINED", "toUsername", toUsername));
        }
    }
}
