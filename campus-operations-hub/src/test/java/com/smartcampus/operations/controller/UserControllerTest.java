package com.smartcampus.operations.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcampus.operations.dto.PasswordChangeRequest;
import com.smartcampus.operations.dto.ProfileUpdateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.mapper.UserModelAssembler;
import com.smartcampus.operations.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.security.Principal;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(UserController.class)
class UserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private UserModelAssembler userModelAssembler;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void getMe_shouldReturnCurrentUser() throws Exception {
        Principal principal = () -> "student@test.com";

        UserResponse response = UserResponse.builder()
                .id(UUID.randomUUID())
                .fullName("Student User")
                .email("student@test.com")
                .role("STUDENT")
                .build();

        when(userService.getMe("student@test.com")).thenReturn(response);
        when(userModelAssembler.toModel(response)).thenReturn(EntityModel.of(response));

        mockMvc.perform(get("/api/users/me")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Student User"))
                .andExpect(jsonPath("$.email").value("student@test.com"));
    }

    @Test
    void updateProfile_shouldReturnUpdatedUser() throws Exception {
        Principal principal = () -> "student@test.com";

        ProfileUpdateRequest request = new ProfileUpdateRequest();
        request.setFirstName("Updated");
        request.setLastName("Student");
        request.setDepartment("IT");
        request.setStudentId("IT001");

        UserResponse response = UserResponse.builder()
                .id(UUID.randomUUID())
                .fullName("Updated Student")
                .email("student@test.com")
                .role("STUDENT")
                .department("IT")
                .studentId("IT001")
                .build();

        when(userService.updateProfile(eq("student@test.com"), any(ProfileUpdateRequest.class)))
                .thenReturn(response);
        when(userModelAssembler.toModel(response)).thenReturn(EntityModel.of(response));

        mockMvc.perform(put("/api/users/me/profile")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Student"));
    }

    @Test
    void changePassword_shouldReturnSuccessMessage() throws Exception {
        Principal principal = () -> "admin@test.com";

        PasswordChangeRequest request = new PasswordChangeRequest(
                "oldPassword123",
                "newPassword123"
        );

        mockMvc.perform(put("/api/users/me/password")
                        .principal(principal)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(content().string("Password updated successfully"));

        verify(userService).changePassword(eq("admin@test.com"), any(PasswordChangeRequest.class));
    }

    @Test
    void toggleMfa_shouldReturnUpdatedUser() throws Exception {
        Principal principal = () -> "student@test.com";

        UserResponse response = UserResponse.builder()
                .id(UUID.randomUUID())
                .email("student@test.com")
                .fullName("Student User")
                .role("STUDENT")
                .twoFactorEnabled(true)
                .build();

        when(userService.toggleMfa("student@test.com")).thenReturn(response);
        when(userModelAssembler.toModel(response)).thenReturn(EntityModel.of(response));

        mockMvc.perform(post("/api/users/me/mfa/toggle")
                        .principal(principal))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.twoFactorEnabled").value(true));
    }
}
