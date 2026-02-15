package com.chess.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Adds missing columns to GAMES table when upgrading from an older schema
 * (e.g. before timer and resign were added). Safe to run multiple times.
 * Uses H2 "ADD COLUMN IF NOT EXISTS" so existing DBs get the new columns.
 */
@Component
@Order(1)
@RequiredArgsConstructor
@Slf4j
public class DbMigrationRunner implements ApplicationRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(ApplicationArguments args) {
        try {
            addColumnIfNotExists("GAMES", "WINNER_USERNAME", "VARCHAR(255)");
            addColumnIfNotExists("GAMES", "WHITE_REMAINING_SECONDS", "INTEGER DEFAULT 600 NOT NULL");
            addColumnIfNotExists("GAMES", "BLACK_REMAINING_SECONDS", "INTEGER DEFAULT 600 NOT NULL");
            addColumnIfNotExists("GAMES", "TURN_STARTED_AT", "TIMESTAMP");
            log.info("Schema migration completed");
        } catch (Exception e1) {
            try {
                addColumnIfNotExists("\"games\"", "WINNER_USERNAME", "VARCHAR(255)");
                addColumnIfNotExists("\"games\"", "WHITE_REMAINING_SECONDS", "INTEGER DEFAULT 600 NOT NULL");
                addColumnIfNotExists("\"games\"", "BLACK_REMAINING_SECONDS", "INTEGER DEFAULT 600 NOT NULL");
                addColumnIfNotExists("\"games\"", "TURN_STARTED_AT", "TIMESTAMP");
                log.info("Schema migration completed (quoted table)");
            } catch (Exception e2) {
                log.warn("Schema migration failed. If you see 'column not found' errors, delete the folder backend/data and restart the backend.");
            }
        }
    }

    private void addColumnIfNotExists(String table, String column, String type) {
        jdbcTemplate.execute("ALTER TABLE " + table + " ADD COLUMN IF NOT EXISTS " + column + " " + type);
    }
}
