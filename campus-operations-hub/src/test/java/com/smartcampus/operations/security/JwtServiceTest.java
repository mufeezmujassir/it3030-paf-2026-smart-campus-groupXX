package com.smartcampus.operations.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Collections;

import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {

    private JwtService jwtService;
    private UserDetails userDetails;

    @BeforeEach
    void setUp() {
        jwtService = new JwtService();

        ReflectionTestUtils.setField(
                jwtService,
                "secretKey",
                "dGhpc2lzYXZlcnlzZWN1cmVqd3RzZWNyZXRrZXlmb3J0ZXN0aW5nMTIzNA=="
        );

        ReflectionTestUtils.setField(jwtService, "accessTokenExpiration", 1000 * 60 * 60L);
        ReflectionTestUtils.setField(jwtService, "refreshTokenExpiration", 1000 * 60 * 60 * 24L);

        userDetails = new User(
                "admin@test.com",
                "password",
                Collections.emptyList()
        );
    }

    @Test
    void generateAccessToken_shouldCreateValidToken() {
        String token = jwtService.generateAccessToken(userDetails);

        assertNotNull(token);
        assertEquals("admin@test.com", jwtService.extractEmail(token));
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void generateRefreshToken_shouldCreateValidToken() {
        String token = jwtService.generateRefreshToken(userDetails);

        assertNotNull(token);
        assertEquals("admin@test.com", jwtService.extractEmail(token));
        assertTrue(jwtService.isTokenValid(token, userDetails));
    }

    @Test
    void isTokenValid_shouldReturnFalseForDifferentUser() {
        String token = jwtService.generateAccessToken(userDetails);

        UserDetails anotherUser = new User(
                "student@test.com",
                "password",
                Collections.emptyList()
        );

        assertFalse(jwtService.isTokenValid(token, anotherUser));
    }
}
