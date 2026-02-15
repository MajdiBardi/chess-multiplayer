package com.chess.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "game_moves")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GameMove {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(nullable = false)
    private int moveNumber;

    @Column(nullable = false, length = 2)
    private String fromSquare;

    @Column(nullable = false, length = 2)
    private String toSquare;

    @Column(length = 1)
    private String piece; // P, N, B, R, Q, K

    @Column(length = 1)
    private String promotion; // Q, R, B, N if promotion
}
