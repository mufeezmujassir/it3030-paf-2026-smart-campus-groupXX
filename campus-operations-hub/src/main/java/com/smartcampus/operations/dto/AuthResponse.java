package com.smartcampus.operations.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private UUID id;
    private String accessToken;
    private String refreshToken;
    private String role;
    private String fullName;
    private String email;
    private boolean requiresOtp;
    private String qrCodeUrl;
    private String secretKey;
}
