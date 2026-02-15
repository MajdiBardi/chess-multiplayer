package com.chess.controller;

import com.chess.websocket.InvitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/invitations")
@RequiredArgsConstructor
public class InvitationController {

    private final InvitationService invitationService;

    /**
     * Poll endpoint: returns the pending invitation for the current user (fallback when WebSocket does not deliver).
     * Returns 200 with empty body when no invitation, to avoid 404 noise in the console.
     */
    @GetMapping("/pending")
    public ResponseEntity<Map<String, String>> getPending(Authentication auth) {
        if (auth == null) return ResponseEntity.status(401).build();
        String username = auth.getName();
        InvitationService.Invitation inv = invitationService.getPendingFor(username);
        if (inv == null) return ResponseEntity.ok(Map.of());
        return ResponseEntity.ok(Map.of("fromUsername", inv.getFromUsername()));
    }
}
