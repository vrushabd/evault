package com.evault.auth.dto;

public record LoginResponse(String token, String walletAddress, String role) {}
