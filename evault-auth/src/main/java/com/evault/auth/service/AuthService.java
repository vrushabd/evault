package com.evault.auth.service;

import com.evault.auth.dto.LoginRequest;
import com.evault.auth.dto.LoginResponse;
import com.evault.auth.dto.RegisterRequest;
import com.evault.auth.dto.RoleAssignRequest;
import com.evault.auth.dto.UserResponse;
import com.evault.auth.exception.DuplicateWalletException;
import com.evault.auth.exception.SignatureVerificationException;
import com.evault.auth.exception.UserNotFoundException;
import com.evault.auth.model.Role;
import com.evault.auth.model.User;
import com.evault.auth.repository.UserRepository;

import org.springframework.stereotype.Service;

import org.web3j.crypto.Keys;
import org.web3j.crypto.Sign;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final NonceService nonceService;
    private final JwtService jwtService;

    public AuthService(
            UserRepository userRepository,
            NonceService nonceService,
            JwtService jwtService) {

        this.userRepository = userRepository;
        this.nonceService = nonceService;
        this.jwtService = jwtService;
    }

    // =========================================================
    // REGISTER
    // =========================================================

    public User register(RegisterRequest request) {

        if (userRepository.existsByWalletAddress(request.getWalletAddress())) {
            throw new DuplicateWalletException("Wallet address already exists");
        }

        User user = new User();

        user.setWalletAddress(request.getWalletAddress());
        user.setName(request.getName());
        user.setEmail(request.getEmail());

        user.setRole(
                request.getRole() != null
                        ? request.getRole()
                        : Role.CLIENT);

        user.setBarNumber(request.getBarNumber());
        user.setCourtId(request.getCourtId());
        user.setIsActive(true);
        user.setCreatedAt(LocalDateTime.now());

        return userRepository.save(user);
    }

    // =========================================================
    // LOGIN
    // =========================================================

    public LoginResponse login(LoginRequest request) {

        // -----------------------------------------------------
        // Step 1: Validate nonce
        // -----------------------------------------------------

        nonceService.validateAndInvalidate(
                request.getWalletAddress(),
                request.getNonce());

        // The message signed by MetaMask
        String message = request.getNonce();

        try {

            // -------------------------------------------------
            // Step 2: Parse MetaMask signature
            // -------------------------------------------------

            String sig = request.getSignature();

            byte[] signatureBytes = Numeric.hexStringToByteArray(sig);

            // MetaMask Ethereum signature should contain:
            // r = 32 bytes
            // s = 32 bytes
            // v = 1 byte
            // Total = 65 bytes

            if (signatureBytes.length != 65) {
                throw new SignatureVerificationException(
                        "Invalid signature length");
            }

            byte v = signatureBytes[64];

            // Ethereum normally uses v = 27 or 28.
            // Some signatures return 0 or 1.
            if (v < 27) {
                v += 27;
            }

            byte[] r = Arrays.copyOfRange(
                    signatureBytes,
                    0,
                    32);

            byte[] s = Arrays.copyOfRange(
                    signatureBytes,
                    32,
                    64);

            Sign.SignatureData signatureData = new Sign.SignatureData(v, r, s);

            // -------------------------------------------------
            // Step 3: Recover public key
            // -------------------------------------------------
            //
            // IMPORTANT:
            //
            // MetaMask personal_sign uses:
            //
            // "\x19Ethereum Signed Message:\n" + message
            //
            // Therefore we MUST use:
            //
            // signedPrefixedMessageToKey()
            //
            // and NOT:
            //
            // signedMessageToKey()
            // -------------------------------------------------

            BigInteger publicKey = Sign.signedPrefixedMessageToKey(
                    message.getBytes(StandardCharsets.UTF_8),
                    signatureData);

            // -------------------------------------------------
            // Step 4: Recover Ethereum wallet address
            // -------------------------------------------------

            String recoveredAddress = "0x" + Keys.getAddress(publicKey);

            // -------------------------------------------------
            // Step 5: Compare recovered address
            // with address supplied by client
            // -------------------------------------------------

            if (!recoveredAddress.equalsIgnoreCase(
                    request.getWalletAddress())) {

                throw new SignatureVerificationException(
                        "Signature does not match wallet address");
            }

        } catch (SignatureVerificationException e) {

            throw e;

        } catch (Exception e) {

            throw new SignatureVerificationException(
                    "Signature recovery failed: " + e.getMessage());
        }

        // -----------------------------------------------------
        // Step 6: Find registered user
        // -----------------------------------------------------

        Optional<User> optionalUser = userRepository.findByWalletAddress(
                request.getWalletAddress());

        if (optionalUser.isEmpty()) {

            throw new UserNotFoundException(
                    "User not found with wallet: "
                            + request.getWalletAddress());
        }

        User user = optionalUser.get();

        // -----------------------------------------------------
        // Step 7: Generate JWT
        // -----------------------------------------------------

        String token = jwtService.generateToken(user);

        // -----------------------------------------------------
        // Step 8: Return login response
        // -----------------------------------------------------

        return new LoginResponse(
                token,
                user.getWalletAddress(),
                user.getRole().name());
    }

    // =========================================================
    // GET CURRENT USER
    // =========================================================

    public UserResponse getCurrentUser(String walletAddress) {

        Optional<User> optionalUser = userRepository.findByWalletAddress(walletAddress);

        if (optionalUser.isEmpty()) {

            throw new UserNotFoundException(
                    "User not found with wallet: "
                            + walletAddress);
        }

        User user = optionalUser.get();

        return new UserResponse(
                user.getWalletAddress(),
                user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.getBarNumber(),
                user.getCourtId(),
                user.getIsActive(),
                user.getCreatedAt());
    }

    // =========================================================
    // ASSIGN ROLE
    // =========================================================

    public void assignRole(RoleAssignRequest request) {

        Optional<User> optionalUser = userRepository.findByWalletAddress(
                request.getWalletAddress());

        if (optionalUser.isEmpty()) {

            throw new UserNotFoundException(
                    "User not found with wallet: "
                            + request.getWalletAddress());
        }

        User user = optionalUser.get();

        user.setRole(request.getRole());

        userRepository.save(user);
    }

    // =========================================================
    // GET USER ROLE
    // =========================================================

    public String getUserRole(String walletAddress) {

        Optional<User> optionalUser = userRepository.findByWalletAddress(walletAddress);

        if (optionalUser.isEmpty()) {

            throw new UserNotFoundException(
                    "User not found with wallet: "
                            + walletAddress);
        }

        return optionalUser.get()
                .getRole()
                .name();
    }
}