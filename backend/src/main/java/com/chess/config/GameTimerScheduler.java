package com.chess.config;

import com.chess.service.GameService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class GameTimerScheduler {

    private final GameService gameService;

    @Scheduled(fixedRate = 1000)
    public void checkExpiredTimers() {
        gameService.checkAndFinishExpiredGames();
    }
}
