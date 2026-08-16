package com.evault.auth.repository;

import com.evault.auth.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    
    Optional<User> findByWalletAddress(String walletAddress);
    
    boolean existsByWalletAddress(String walletAddress);
}
