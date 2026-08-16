package com.evault.auth.dto;

import java.time.LocalDateTime;

public record UserResponse(
        String walletAddress,
        String name,
        String email,
        String role,
        String barNumber,
        String courtId,
        Boolean isActive,
        LocalDateTime createdAt
) {}
