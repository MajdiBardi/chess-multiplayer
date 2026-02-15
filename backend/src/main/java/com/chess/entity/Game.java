package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "games")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "white_player_id", nullable = false)
    private User whitePlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "black_player_id", nullable = false)
    private User blackPlayer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private GameStatus status = GameStatus.ACTIVE;

    /** Username of the winner when status is FINISHED (null if draw or not finished) */
    @Column(name = "winner_username")
    private String winnerUsername;

    @Column(name = "white_remaining_seconds", nullable = false)
    @Builder.Default
    private Integer whiteRemainingSeconds = 600;

    @Column(name = "black_remaining_seconds", nullable = false)
    @Builder.Default
    private Integer blackRemainingSeconds = 600;

    @Column(name = "turn_started_at")
    private Instant turnStartedAt;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("moveNumber ASC")
    @Builder.Default
    private List<GameMove> moves = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
        if (turnStartedAt == null) turnStartedAt = Instant.now();
    }

    public enum GameStatus {
        ACTIVE,
        FINISHED
    }
}
