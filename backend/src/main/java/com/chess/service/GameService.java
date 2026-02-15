package com.chess.service;

import com.chess.dto.GameDto;
import com.chess.dto.MoveDto;
import com.chess.entity.Game;
import com.chess.entity.GameMove;
import com.chess.entity.User;
import com.chess.repository.GameMoveRepository;
import com.chess.repository.GameRepository;
import com.chess.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;
    private final GameMoveRepository moveRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public Game createGame(String whiteUsername, String blackUsername) {
        User white = userRepository.findByUsername(whiteUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + whiteUsername));
        User black = userRepository.findByUsername(blackUsername)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + blackUsername));
        Game game = Game.builder()
                .whitePlayer(white)
                .blackPlayer(black)
                .status(Game.GameStatus.ACTIVE)
                .whiteRemainingSeconds(600)
                .blackRemainingSeconds(600)
                .turnStartedAt(Instant.now())
                .build();
        return gameRepository.save(game);
    }

    public GameDto getGame(Long gameId, String username) {
        Game game = gameRepository.findById(gameId)
                .orElseThrow(() -> new IllegalArgumentException("Game not found"));
        List<GameMove> moves = moveRepository.findByGameIdOrderByMoveNumberAsc(gameId);
        List<MoveDto> moveDtos = moves.stream().map(MoveDto::fromEntity).collect(Collectors.toList());
        List<String> fromList = moves.stream().map(GameMove::getFromSquare).collect(Collectors.toList());
        List<String> toList = moves.stream().map(GameMove::getToSquare).collect(Collectors.toList());
        List<String> promos = moves.stream().map(GameMove::getPromotion).collect(Collectors.toList());
        String fen = ChessBoardService.applyMoves(ChessBoardService.getInitialFen(), fromList, toList, promos);
        GameDto dto = GameDto.fromEntity(game, moveDtos, fen);
        if (game.getStatus() == Game.GameStatus.ACTIVE && game.getTurnStartedAt() != null) {
            int moveCount = moves.size();
            boolean whiteToMove = moveCount % 2 == 0;
            long elapsedSec = Instant.now().getEpochSecond() - game.getTurnStartedAt().getEpochSecond();
            int whiteRem = Math.max(0, game.getWhiteRemainingSeconds() - (whiteToMove ? (int) elapsedSec : 0));
            int blackRem = Math.max(0, game.getBlackRemainingSeconds() - (!whiteToMove ? (int) elapsedSec : 0));
            dto.setWhiteRemainingSeconds(whiteRem);
            dto.setBlackRemainingSeconds(blackRem);
        }
        return dto;
    }

    public List<GameDto> getActiveGamesForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Game> games = gameRepository.findActiveGamesByUser(user);
        List<GameDto> result = new ArrayList<>();
        for (Game g : games) {
            result.add(getGame(g.getId(), username));
        }
        return result;
    }

    public List<GameDto> getFinishedGamesForUser(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        List<Game> games = gameRepository.findFinishedGamesByUser(user);
        List<GameDto> result = new ArrayList<>();
        for (Game g : games) {
            result.add(getGame(g.getId(), username));
        }
        return result;
    }

    @Transactional
    public GameMove recordMove(Long gameId, String username, int moveNumber, String from, String to, String piece, String promotion) {
        Game game = gameRepository.findByIdAndStatus(gameId, Game.GameStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Game not found or finished"));
        List<GameMove> existing = moveRepository.findByGameIdOrderByMoveNumberAsc(gameId);
        if (existing.size() != moveNumber) {
            throw new IllegalArgumentException("Invalid move number");
        }
        boolean isWhite = game.getWhitePlayer().getUsername().equals(username);
        String currentFen = ChessBoardService.getInitialFen();
        List<String> fromList = existing.stream().map(GameMove::getFromSquare).collect(Collectors.toList());
        List<String> toList = existing.stream().map(GameMove::getToSquare).collect(Collectors.toList());
        List<String> promos = existing.stream().map(GameMove::getPromotion).collect(Collectors.toList());
        currentFen = ChessBoardService.applyMoves(currentFen, fromList, toList, promos);
        if (!ChessBoardService.isMoveValid(currentFen, from, to, isWhite)) {
            throw new IllegalArgumentException("Invalid move");
        }
        Instant now = Instant.now();
        if (game.getTurnStartedAt() == null) game.setTurnStartedAt(now);
        {
            long elapsedSec = now.getEpochSecond() - game.getTurnStartedAt().getEpochSecond();
            if (isWhite) {
                int newRemaining = game.getWhiteRemainingSeconds() - (int) elapsedSec;
                if (newRemaining <= 0) throw new IllegalArgumentException("Temps écoulé");
                game.setWhiteRemainingSeconds(newRemaining);
            } else {
                int newRemaining = game.getBlackRemainingSeconds() - (int) elapsedSec;
                if (newRemaining <= 0) throw new IllegalArgumentException("Temps écoulé");
                game.setBlackRemainingSeconds(newRemaining);
            }
        }
        game.setTurnStartedAt(now);
        gameRepository.save(game);

        GameMove move = GameMove.builder()
                .game(game)
                .moveNumber(moveNumber + 1)
                .fromSquare(from)
                .toSquare(to)
                .piece(piece != null ? piece : "P")
                .promotion(promotion)
                .build();
        move = moveRepository.save(move);
        return move;
    }

    @Transactional
    public void resign(Long gameId, String username) {
        Game game = gameRepository.findByIdAndStatus(gameId, Game.GameStatus.ACTIVE)
                .orElseThrow(() -> new IllegalArgumentException("Game not found or finished"));
        boolean isWhite = game.getWhitePlayer().getUsername().equals(username);
        game.setStatus(Game.GameStatus.FINISHED);
        game.setWinnerUsername(isWhite ? game.getBlackPlayer().getUsername() : game.getWhitePlayer().getUsername());
        gameRepository.save(game);
        broadcastGameOver(gameId, game.getWinnerUsername());
    }

    @Transactional
    public void checkAndFinishExpiredGames() {
        List<Game> active = gameRepository.findByStatus(Game.GameStatus.ACTIVE);
        Instant now = Instant.now();
        for (Game game : active) {
            if (game.getTurnStartedAt() == null) continue;
            int moveCount = moveRepository.findByGameIdOrderByMoveNumberAsc(game.getId()).size();
            boolean whiteToMove = moveCount % 2 == 0;
            long elapsedSec = now.getEpochSecond() - game.getTurnStartedAt().getEpochSecond();
            int remaining = whiteToMove
                    ? game.getWhiteRemainingSeconds() - (int) elapsedSec
                    : game.getBlackRemainingSeconds() - (int) elapsedSec;
            if (remaining <= 0) {
                game.setStatus(Game.GameStatus.FINISHED);
                game.setWinnerUsername(whiteToMove ? game.getBlackPlayer().getUsername() : game.getWhitePlayer().getUsername());
                gameRepository.save(game);
                broadcastGameOver(game.getId(), game.getWinnerUsername());
            }
        }
    }

    private void broadcastGameOver(Long gameId, String winnerUsername) {
        messagingTemplate.convertAndSend("/topic/game/" + gameId, Map.of(
                "type", "GAME_OVER",
                "winnerUsername", winnerUsername != null ? winnerUsername : ""
        ));
    }
}
