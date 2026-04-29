package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.LoginRequest;
import com.smartcampus.operations.dto.AuthResponse;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.exception.InvalidCredentialsException;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.security.JwtService;
import com.smartcampus.operations.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private AuthServiceImpl authService;

    private User adminUser;

    @BeforeEach
    void setUp() {
        adminUser = User.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .fullName("Admin User")
                .role(Role.ADMIN)
                .password("encoded-password")
                .isActive(true)
                .isLocked(false)
                .twoFactorEnabled(false)
                .build();
    }

    @Test
    void login_shouldReturnTokens_whenValidAdminCredentials() {
        LoginRequest request = new LoginRequest("admin@test.com", "password123");

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);
        when(jwtService.generateAccessToken(any())).thenReturn("access-token");
        when(jwtService.generateRefreshToken(any())).thenReturn("refresh-token");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        AuthResponse response = authService.login(request);

        assertNotNull(response);
        assertEquals("access-token", response.getAccessToken());
        assertEquals("refresh-token", response.getRefreshToken());
        assertEquals("ADMIN", response.getRole());

        verify(notificationService).sendNotification(
                eq(adminUser.getId()),
                eq("Welcome Back"),
                contains("logged in successfully"),
                eq("LOGIN_SUCCESS")
        );
    }

    @Test
    void login_shouldThrowException_whenPasswordIsInvalid() {
        LoginRequest request = new LoginRequest("admin@test.com", "wrong");

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));
        when(passwordEncoder.matches("wrong", "encoded-password")).thenReturn(false);

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }

    @Test
    void login_shouldThrowException_whenUserIsNotAdmin() {
        adminUser.setRole(Role.STUDENT);
        LoginRequest request = new LoginRequest("admin@test.com", "password123");

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(adminUser));

        assertThrows(InvalidCredentialsException.class, () -> authService.login(request));
    }
}
