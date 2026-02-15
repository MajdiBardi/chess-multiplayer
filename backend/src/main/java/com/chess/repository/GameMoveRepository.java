package com.chess.repository;

import com.chess.entity.GameMove;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameMoveRepository extends JpaRepository<GameMove, Long> {
    List<GameMove> findByGameIdOrderByMoveNumberAsc(Long gameId);
}
