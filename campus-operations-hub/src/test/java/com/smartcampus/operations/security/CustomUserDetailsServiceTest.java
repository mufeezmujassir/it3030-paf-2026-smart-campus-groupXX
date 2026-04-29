package com.smartcampus.operations.security;

import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomUserDetailsServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private CustomUserDetailsService customUserDetailsService;

    @Test
    void loadUserByUsername_shouldReturnUserDetails_whenUserExists() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("admin@test.com")
                .password("encoded-password")
                .role(Role.ADMIN)
                .isActive(true)
                .isLocked(false)
                .build();

        when(userRepository.findByEmail("admin@test.com")).thenReturn(Optional.of(user));

        UserDetails result = customUserDetailsService.loadUserByUsername("admin@test.com");

        assertEquals("admin@test.com", result.getUsername());
        assertEquals("encoded-password", result.getPassword());
        assertTrue(result.isEnabled());
        assertTrue(result.isAccountNonLocked());
        assertTrue(result.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
    }

    @Test
    void loadUserByUsername_shouldThrowException_whenUserNotFound() {
        when(userRepository.findByEmail("missing@test.com")).thenReturn(Optional.empty());

        assertThrows(
                UsernameNotFoundException.class,
                () -> customUserDetailsService.loadUserByUsername("missing@test.com")
        );
    }

    @Test
    void loadUserByUsername_shouldReturnLockedUser_whenUserIsLocked() {
        User user = User.builder()
                .id(UUID.randomUUID())
                .email("locked@test.com")
                .password("pass")
                .role(Role.STUDENT)
                .isActive(true)
                .isLocked(true)
                .build();

        when(userRepository.findByEmail("locked@test.com")).thenReturn(Optional.of(user));

        UserDetails result = customUserDetailsService.loadUserByUsername("locked@test.com");

        assertFalse(result.isAccountNonLocked());
    }
}
