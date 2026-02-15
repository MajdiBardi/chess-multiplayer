package com.chess.websocket;

import com.chess.dto.MoveDto;
import com.chess.entity.GameMove;
import com.chess.service.GameService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.util.Map;

@Controller("websocketGameController")
@RequiredArgsConstructor
@Slf4j
public class GameController {

    private final GameService gameService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/game/{gameId}/move")
    public void move(@DestinationVariable Long gameId, @Payload Map<String, Object> payload, Principal principal) {
        if (principal == null) return;
        String username = principal.getName();
        String from = (String) payload.get("fromSquare");
        String to = (String) payload.get("toSquare");
        String piece = payload.containsKey("piece") ? (String) payload.get("piece") : "P";
        String promotion = payload.containsKey("promotion") ? (String) payload.get("promotion") : null;
        Integer moveNum = payload.get("moveNumber") != null ? ((Number) payload.get("moveNumber")).intValue() : null;
        if (from == null || to == null || moveNum == null) return;
        try {
            GameMove move = gameService.recordMove(gameId, username, moveNum, from, to, piece, promotion);
            MoveDto dto = MoveDto.fromEntity(move);
            messagingTemplate.convertAndSend("/topic/game/" + gameId, Map.of(
                    "type", "MOVE",
                    "move", dto
            ));
        } catch (Exception e) {
            messagingTemplate.convertAndSendToUser(principal.getName(), "/queue/errors",
                    Map.of("message", e.getMessage(), "gameId", gameId));
        }
    }
}
