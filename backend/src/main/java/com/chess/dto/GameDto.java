package com.chess.dto;

import com.chess.entity.Game;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.stream.Collectors;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameDto {
    private Long id;
    private String whiteUsername;
    private String blackUsername;
    private String status;
    private String winnerUsername;
    private List<MoveDto> moves;
    private String fen;
    private Integer whiteRemainingSeconds;
    private Integer blackRemainingSeconds;
    private Long turnStartedAtEpochMs;

    public static GameDto fromEntity(Game game, List<MoveDto> moves, String fen) {
        return GameDto.builder()
                .id(game.getId())
                .whiteUsername(game.getWhitePlayer().getUsername())
                .blackUsername(game.getBlackPlayer().getUsername())
                .status(game.getStatus().name())
                .winnerUsername(game.getWinnerUsername())
                .moves(moves)
                .fen(fen)
                .whiteRemainingSeconds(game.getWhiteRemainingSeconds())
                .blackRemainingSeconds(game.getBlackRemainingSeconds())
                .turnStartedAtEpochMs(game.getTurnStartedAt() != null ? game.getTurnStartedAt().toEpochMilli() : null)
                .build();
    }
}
