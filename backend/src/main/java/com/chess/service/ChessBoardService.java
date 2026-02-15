package com.chess.service;

import java.util.List;
import java.util.regex.Pattern;

/**
 * Minimal chess logic: FEN handling and basic move validation (Level 3).
 * Starting FEN: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
 */
public final class ChessBoardService {

    private static final String INITIAL_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    private static final Pattern SQUARE = Pattern.compile("^[a-h][1-8]$");

    public static String getInitialFen() {
        return INITIAL_FEN;
    }

    public static boolean isValidSquare(String sq) {
        return sq != null && SQUARE.matcher(sq).matches();
    }

    /**
     * Apply a move to FEN and return new FEN. Simple implementation: move piece from->to.
     * Does not handle en passant, castling, promotion fully (handles promotion piece only).
     */
    public static String applyMove(String fen, String from, String to, String promotion) {
        if (fen == null || from == null || to == null) return fen;
        String[] parts = fen.split(" ", 6);
        String board = parts[0];
        String toMove = parts.length > 1 ? parts[1] : "w";
        String castling = parts.length > 2 ? parts[2] : "KQkq";
        String enPassant = parts.length > 3 ? parts[3] : "-";
        String half = parts.length > 4 ? parts[4] : "0";
        String full = parts.length > 5 ? parts[5] : "1";

        char[][] grid = fenToGrid(board);
        int fromFile = from.charAt(0) - 'a';
        int fromRank = 8 - (from.charAt(1) - '0');
        int toFile = to.charAt(0) - 'a';
        int toRank = 8 - (to.charAt(1) - '0');

        char piece = grid[fromRank][fromFile];
        if (promotion != null && !promotion.isEmpty() && Character.toLowerCase(piece) == 'p') {
            piece = toMove.equals("w") ? promotion.charAt(0) : Character.toLowerCase(promotion.charAt(0));
        }
        grid[fromRank][fromFile] = '.';
        grid[toRank][toFile] = piece;

        String newBoard = gridToFen(grid);
        String nextToMove = "w".equals(toMove) ? "b" : "w";
        int halfMove = Integer.parseInt(half) + 1;
        int fullMove = "b".equals(nextToMove) ? Integer.parseInt(full) + 1 : Integer.parseInt(full);
        return newBoard + " " + nextToMove + " " + castling + " " + enPassant + " " + halfMove + " " + fullMove;
    }

    public static String applyMoves(String initialFen, List<String> fromSquares, List<String> toSquares, List<String> promotions) {
        String fen = initialFen;
        for (int i = 0; i < fromSquares.size(); i++) {
            String p = (promotions != null && i < promotions.size()) ? promotions.get(i) : null;
            fen = applyMove(fen, fromSquares.get(i), toSquares.get(i), p);
        }
        return fen;
    }

    private static char[][] fenToGrid(String board) {
        char[][] grid = new char[8][8];
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 8; c++) {
                grid[r][c] = '.';
            }
        }
        int row = 0, col = 0;
        for (char c : board.toCharArray()) {
            if (c == '/') {
                row++;
                col = 0;
            } else if (Character.isDigit(c)) {
                col += c - '0';
            } else {
                grid[row][col++] = c;
            }
        }
        return grid;
    }

    private static String gridToFen(char[][] grid) {
        StringBuilder sb = new StringBuilder();
        for (int r = 0; r < 8; r++) {
            int empty = 0;
            for (int c = 0; c < 8; c++) {
                if (grid[r][c] == '.') {
                    empty++;
                } else {
                    if (empty > 0) {
                        sb.append(empty);
                        empty = 0;
                    }
                    sb.append(grid[r][c]);
                }
            }
            if (empty > 0) sb.append(empty);
            if (r < 7) sb.append('/');
        }
        return sb.toString();
    }

    /**
     * Basic validation: from/to squares valid, piece at from, destination empty or capture.
     */
    public static boolean isMoveValid(String fen, String from, String to, boolean isWhite) {
        if (!isValidSquare(from) || !isValidSquare(to)) return false;
        char[][] grid = fenToGrid(fen.split(" ")[0]);
        int fromR = 8 - (from.charAt(1) - '0');
        int fromC = from.charAt(0) - 'a';
        int toR = 8 - (to.charAt(1) - '0');
        int toC = to.charAt(0) - 'a';
        char p = grid[fromR][fromC];
        if (p == '.') return false;
        boolean pieceWhite = Character.isUpperCase(p);
        if (pieceWhite != isWhite) return false;
        char target = grid[toR][toC];
        if (target != '.' && (Character.isUpperCase(target) == isWhite)) return false;
        return true;
    }
}
