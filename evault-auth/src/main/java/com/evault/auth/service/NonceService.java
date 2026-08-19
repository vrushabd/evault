package com.evault.auth.service;

import com.evault.auth.exception.InvalidNonceException;
import com.evault.auth.exception.NonceExpiredException;
import com.evault.auth.model.AuthNonce;
import com.evault.auth.repository.AuthNonceRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class NonceService {

    private final AuthNonceRepository authNonceRepository;
    private final int nonceTtlMinutes;

    public NonceService(AuthNonceRepository authNonceRepository,
                        @Value("${app.nonce.ttl-minutes}") int nonceTtlMinutes) {
        this.authNonceRepository = authNonceRepository;
        this.nonceTtlMinutes = nonceTtlMinutes;
    }

    @Transactional
    public String generateNonce(String walletAddress) {
        String nonce = UUID.randomUUID().toString();
        
        Optional<AuthNonce> existing = authNonceRepository.findByWalletAddress(walletAddress);
        AuthNonce authNonce;
        if (existing.isPresent()) {
            authNonce = existing.get();
        } else {
            authNonce = new AuthNonce();
            authNonce.setWalletAddress(walletAddress);
        }
        
        authNonce.setNonce(nonce);
        authNonce.setCreatedAt(LocalDateTime.now());
        
        authNonceRepository.save(authNonce);
        return nonce;
    }

    @Transactional
    public void validateAndInvalidate(String walletAddress, String nonce) {
        Optional<AuthNonce> optionalAuthNonce = authNonceRepository.findByWalletAddress(walletAddress);
        if (optionalAuthNonce.isEmpty()) {
            throw new InvalidNonceException("Nonce not found for the given wallet address");
        }

        AuthNonce authNonce = optionalAuthNonce.get();

        if (authNonce.getCreatedAt().plusMinutes(nonceTtlMinutes).isBefore(LocalDateTime.now())) {
            authNonceRepository.deleteByWalletAddress(walletAddress);
            throw new NonceExpiredException("Nonce has expired");
        }

        if (!authNonce.getNonce().equals(nonce)) {
            throw new InvalidNonceException("Invalid nonce value");
        }

        // Single-use for replay prevention
        authNonceRepository.deleteByWalletAddress(walletAddress);
    }

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void cleanupExpiredNonces() {
        authNonceRepository.deleteByCreatedAtBefore(LocalDateTime.now().minusMinutes(nonceTtlMinutes));
    }
}
