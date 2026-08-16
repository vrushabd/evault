package com.evault.auth.repository;

import com.evault.auth.model.AuthNonce;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface AuthNonceRepository extends JpaRepository<AuthNonce, Long> {
    
    Optional<AuthNonce> findByWalletAddress(String walletAddress);
    
    void deleteByWalletAddress(String walletAddress);
    
    @Modifying
    @Query("DELETE FROM AuthNonce a WHERE a.createdAt < :cutoff")
    void deleteByCreatedAtBefore(LocalDateTime cutoff);
}
