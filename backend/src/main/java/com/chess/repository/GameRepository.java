package com.chess.repository;

import com.chess.entity.Game;
import com.chess.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GameRepository extends JpaRepository<Game, Long> {

    List<Game> findByWhitePlayerOrBlackPlayerAndStatus(User white, User black, Game.GameStatus status);

    @Query("SELECT g FROM Game g WHERE (g.whitePlayer = :user OR g.blackPlayer = :user) AND g.status = 'ACTIVE' ORDER BY g.createdAt DESC")
    List<Game> findActiveGamesByUser(User user);

    @Query("SELECT g FROM Game g WHERE (g.whitePlayer = :user OR g.blackPlayer = :user) AND g.status = 'FINISHED' ORDER BY g.createdAt DESC")
    List<Game> findFinishedGamesByUser(User user);

    Optional<Game> findByIdAndStatus(Long id, Game.GameStatus status);

    List<Game> findByStatus(Game.GameStatus status);
}
