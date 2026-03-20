package com.smartcampus.operations.security;

import com.smartcampus.operations.dto.AuthResponse;
import com.smartcampus.operations.dto.OAuthLoginRequest;
import com.smartcampus.operations.service.AuthService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Component
@RequiredArgsConstructor
@Slf4j
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final AuthService authService;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");
        String name = oAuth2User.getAttribute("name");

        log.info("OAuth2 login success for email: {}", email);

        try {
            // Reusing existing oauthLogin method directly from AuthService
            OAuthLoginRequest loginRequest = new OAuthLoginRequest();
            loginRequest.setEmail(email);
            loginRequest.setName(name);
            loginRequest.setGoogleToken("handled-by-spring-oauth2"); // Bypass frontend token
            
            AuthResponse authResponse = authService.oauthLogin(loginRequest);

            String targetUrl;
            if (authResponse.isRequiresOtp()) {
                targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/otp")
                        .queryParam("tempEmail", URLEncoder.encode(email, StandardCharsets.UTF_8))
                        .queryParam("secretKey", authResponse.getSecretKey())
                        .queryParam("qrCodeUrl", URLEncoder.encode(authResponse.getQrCodeUrl(), StandardCharsets.UTF_8))
                        .build().toUriString();
            } else {
                targetUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/oauth2/redirect")
                        .queryParam("token", authResponse.getAccessToken())
                        .queryParam("refreshToken", authResponse.getRefreshToken())
                        .queryParam("role", authResponse.getRole())
                        .queryParam("email", URLEncoder.encode(email, StandardCharsets.UTF_8))
                        .build().toUriString();
            }

            getRedirectStrategy().sendRedirect(request, response, targetUrl);

        } catch (Exception e) {
            log.error("OAuth error during processing: {}", e.getMessage());
            String errorUrl = UriComponentsBuilder.fromUriString("http://localhost:5173/login")
                    .queryParam("error", URLEncoder.encode(e.getMessage(), StandardCharsets.UTF_8))
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
        }
    }
}
