package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.*;

public interface AuthService {

    AuthResponse login(LoginRequest request);

    AuthResponse oauthLogin(OAuthLoginRequest request);

    AuthResponse verifyOtp(OtpVerificationRequest request);

    AuthResponse refreshToken(RefreshTokenRequest request);

    void logout(String email);
}
