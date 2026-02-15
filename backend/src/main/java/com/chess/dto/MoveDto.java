package com.chess.dto;

import com.chess.entity.GameMove;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MoveDto {
    private int moveNumber;
    private String fromSquare;
    private String toSquare;
    private String piece;
    private String promotion;

    public static MoveDto fromEntity(GameMove m) {
        return new MoveDto(m.getMoveNumber(), m.getFromSquare(), m.getToSquare(), m.getPiece(), m.getPromotion());
    }
}
