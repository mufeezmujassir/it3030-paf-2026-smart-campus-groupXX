package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.entity.AuthProvider;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.mapper.UserMapper;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class UserServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private UserMapper userMapper;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void createUser_shouldSaveUser_whenEmailDoesNotExist() {
        UserCreateRequest request = new UserCreateRequest();
        request.setFullName("John Doe");
        request.setEmail("john@test.com");
        request.setRole("STUDENT");

        User mappedUser = User.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@test.com")
                .role(Role.STUDENT)
                .authProvider(AuthProvider.GOOGLE)
                .build();

        User admin = User.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .fullName("Admin")
                .role(Role.ADMIN)
                .build();

        UserResponse response = UserResponse.builder()
                .id(mappedUser.getId())
                .fullName(mappedUser.getFullName())
                .email(mappedUser.getEmail())
                .role("STUDENT")
                .build();

        when(userRepository.existsByEmail("john@test.com")).thenReturn(false);
        when(userMapper.toEntity(request)).thenReturn(mappedUser);
        when(userRepository.save(mappedUser)).thenReturn(mappedUser);
        when(userMapper.toResponse(mappedUser)).thenReturn(response);
        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(admin));

        UserResponse result = userService.createUser(request, "admin@test.com");

        assertNotNull(result);
        assertEquals("john@test.com", result.getEmail());

        verify(notificationService).sendNotification(
                eq(admin.getId()),
                eq("User Added"),
                contains("added successfully"),
                eq("USER_CREATED")
        );
    }

    @Test
    void createUser_shouldThrowException_whenEmailAlreadyExists() {
        UserCreateRequest request = new UserCreateRequest();
        request.setEmail("john@test.com");

        when(userRepository.existsByEmail("john@test.com")).thenReturn(true);

        assertThrows(IllegalArgumentException.class, () -> userService.createUser(request, "admin@test.com"));
    }
}
