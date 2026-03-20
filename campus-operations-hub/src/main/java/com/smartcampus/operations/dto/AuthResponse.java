package com.smartcampus.operations.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {

    private String accessToken;
    private String refreshToken;
    private String role;
    private String fullName;
    private String email;
    private boolean requiresOtp;
    private String qrCodeUrl;
    private String secretKey;
}
