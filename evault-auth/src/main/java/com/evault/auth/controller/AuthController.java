package com.evault.auth.controller;

import com.evault.auth.dto.*;
import com.evault.auth.model.User;
import com.evault.auth.service.AuthService;
import com.evault.auth.service.NonceService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final NonceService nonceService;

    public AuthController(AuthService authService, NonceService nonceService) {
        this.authService = authService;
        this.nonceService = nonceService;
    }

    @GetMapping("/nonce/{walletAddress}")
    public ResponseEntity<NonceResponse> getNonce(@PathVariable String walletAddress) {
        String nonce = nonceService.generateNonce(walletAddress);
        return ResponseEntity.ok(new NonceResponse(nonce));
    }

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request);
        UserResponse response = new UserResponse(
                user.getWalletAddress(), user.getName(), user.getEmail(),
                user.getRole().name(), user.getBarNumber(), user.getCourtId(),
                user.getIsActive(), user.getCreatedAt()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping("/roles/assign")
    public ResponseEntity<Void> assignRole(@Valid @RequestBody RoleAssignRequest request) {
        authService.assignRole(request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/roles/{address}")
    public ResponseEntity<Map<String, String>> getRole(@PathVariable String address) {
        String role = authService.getUserRole(address);
        return ResponseEntity.ok(Map.of("walletAddress", address, "role", role));
    }

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser(Authentication authentication) {
        String walletAddress = authentication.getName();
        UserResponse response = authService.getCurrentUser(walletAddress);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "evault-auth"
        ));
    }
}
