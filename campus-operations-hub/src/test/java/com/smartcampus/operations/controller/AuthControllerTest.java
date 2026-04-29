package com.smartcampus.operations.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcampus.operations.dto.AuthResponse;
import com.smartcampus.operations.dto.LoginRequest;
import com.smartcampus.operations.service.AuthService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AuthService authService;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void login_shouldReturn200() throws Exception {
        LoginRequest request = new LoginRequest("admin@test.com", "12345678");

        AuthResponse response = AuthResponse.builder()
                .accessToken("token")
                .refreshToken("refresh")
                .role("ADMIN")
                .email("admin@test.com")
                .requiresOtp(false)
                .build();

        when(authService.login(org.mockito.ArgumentMatchers.any())).thenReturn(response);

        mockMvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("token"))
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }
}
