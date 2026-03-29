package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.*;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.exception.*;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.security.JwtService;
import com.smartcampus.operations.service.AuthService;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final GoogleAuthenticator googleAuthenticator = new GoogleAuthenticator();

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new InvalidCredentialsException("Invalid credentials"));

        // Only ADMIN can use password login
        if (user.getRole() != Role.ADMIN) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        // Validate password
        if (user.getPassword() == null || !passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new InvalidCredentialsException("Invalid credentials");
        }

        // Check account status
        if (!user.getIsActive()) {
            throw new UserAccessDeniedException("Account is deactivated");
        }
        if (user.getIsLocked()) {
            throw new UserAccessDeniedException("Account is locked");
        }

        // Check if 2FA is enabled
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            if (user.getTwoFactorSecret() == null) {
                user.setTwoFactorSecret(googleAuthenticator.createCredentials().getKey());
                userRepository.save(user);
            }
            log.info("2FA required for admin: {}", user.getEmail());
            return AuthResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .requiresOtp(true)
                    .secretKey(user.getTwoFactorSecret())
                    .qrCodeUrl(String.format("otpauth://totp/MapleLink:%s?secret=%s&issuer=MapleLink", user.getEmail(), user.getTwoFactorSecret()))
                    .build();
        }

        // Generate tokens
        UserDetails userDetails = buildUserDetails(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        // Store refresh token
        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        log.info("Admin login successful for: {}", user.getEmail());

        return AuthResponse.builder()
                .id(user.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse oauthLogin(OAuthLoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserAccessDeniedException(
                        "Access Denied: You are not registered in the system"));

        // Check account status
        if (!user.getIsActive()) {
            throw new UserAccessDeniedException("Account is deactivated");
        }
        if (user.getIsLocked()) {
            throw new UserAccessDeniedException("Account is locked");
        }

        // Check if 2FA is enabled
        if (Boolean.TRUE.equals(user.getTwoFactorEnabled())) {
            // Generate secret if missing (first time)
            if (user.getTwoFactorSecret() == null) {
                user.setTwoFactorSecret(googleAuthenticator.createCredentials().getKey());
                userRepository.save(user);
                log.info("Generated new 2FA secret for user: {}", user.getEmail());
            }
            
            log.info("2FA required for user: {}", user.getEmail());
            return AuthResponse.builder()
                    .id(user.getId())
                    .email(user.getEmail())
                    .fullName(user.getFullName())
                    .role(user.getRole().name())
                    .requiresOtp(true)
                    .secretKey(user.getTwoFactorSecret())
                    .qrCodeUrl(String.format("otpauth://totp/MapleLink:%s?secret=%s&issuer=MapleLink", user.getEmail(), user.getTwoFactorSecret()))
                    .build();
        }

        // No 2FA — generate tokens directly
        UserDetails userDetails = buildUserDetails(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        log.info("OAuth login successful for: {}", user.getEmail());

        return AuthResponse.builder()
                .id(user.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse verifyOtp(OtpVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (user.getTwoFactorSecret() == null) {
            throw new OtpVerificationException("2FA is not configured for this user");
        }

        // Validate OTP
        int otp;
        try {
            otp = Integer.parseInt(request.getOtp());
        } catch (NumberFormatException e) {
            throw new OtpVerificationException("OTP verification failed: Invalid OTP format");
        }

        boolean isValid = googleAuthenticator.authorize(user.getTwoFactorSecret(), otp);
        if (!isValid) {
            throw new OtpVerificationException("OTP verification failed: Invalid or expired OTP");
        }

        // OTP valid — generate tokens
        UserDetails userDetails = buildUserDetails(user);
        String accessToken = jwtService.generateAccessToken(userDetails);
        String refreshToken = jwtService.generateRefreshToken(userDetails);

        user.setRefreshToken(refreshToken);
        user.setRefreshTokenExpiry(LocalDateTime.now().plusDays(7));
        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        log.info("OTP verified successfully for: {}", user.getEmail());

        return AuthResponse.builder()
                .id(user.getId())
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        String refreshToken = request.getRefreshToken();

        // Find user with this refresh token
        User user = userRepository.findAll().stream()
                .filter(u -> refreshToken.equals(u.getRefreshToken()))
                .findFirst()
                .orElseThrow(() -> new InvalidCredentialsException("Invalid refresh token"));

        // Check expiry
        if (user.getRefreshTokenExpiry() == null || user.getRefreshTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new InvalidCredentialsException("Refresh token expired");
        }

        // Generate new access token
        UserDetails userDetails = buildUserDetails(user);
        String newAccessToken = jwtService.generateAccessToken(userDetails);

        log.info("Token refreshed for: {}", user.getEmail());

        return AuthResponse.builder()
                .id(user.getId())
                .accessToken(newAccessToken)
                .refreshToken(refreshToken) // Return same refresh token
                .role(user.getRole().name())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .requiresOtp(false)
                .build();
    }

    @Override
    @Transactional
    public void logout(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        user.setRefreshToken(null);
        user.setRefreshTokenExpiry(null);
        userRepository.save(user);

        log.info("User logged out: {}", email);
    }

    private UserDetails buildUserDetails(User user) {
        return new org.springframework.security.core.userdetails.User(
                user.getEmail(),
                user.getPassword() != null ? user.getPassword() : "",
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }
}
