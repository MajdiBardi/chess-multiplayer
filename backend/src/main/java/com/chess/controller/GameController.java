package com.chess.controller;

import com.chess.dto.GameDto;
import com.chess.service.GameService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController("restGameController")
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @GetMapping("/active")
    public ResponseEntity<List<GameDto>> getActiveGames(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(gameService.getActiveGamesForUser(username));
    }

    @GetMapping("/history")
    public ResponseEntity<List<GameDto>> getGameHistory(Authentication auth) {
        String username = auth.getName();
        return ResponseEntity.ok(gameService.getFinishedGamesForUser(username));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameDto> getGame(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(gameService.getGame(id, auth.getName()));
    }

    @PostMapping("/{id}/resign")
    public ResponseEntity<Void> resign(@PathVariable Long id, Authentication auth) {
        gameService.resign(id, auth.getName());
        return ResponseEntity.ok().build();
    }
}
