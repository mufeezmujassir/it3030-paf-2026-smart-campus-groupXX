package com.smartcampus.operations.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcampus.operations.dto.BulkUploadResponse;
import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.mapper.UserModelAssembler;
import com.smartcampus.operations.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.hateoas.EntityModel;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(AdminUserController.class)
class AdminUserControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UserService userService;

    @MockBean
    private UserModelAssembler userModelAssembler;

    @Autowired
    private ObjectMapper objectMapper;

    private UserDetails adminDetails() {
        return new User(
                "admin@test.com",
                "password",
                Collections.emptyList()
        );
    }

    @Test
    void createUser_shouldReturnCreatedUser() throws Exception {
        UserCreateRequest request = new UserCreateRequest();
        request.setFullName("John Doe");
        request.setEmail("john@test.com");
        request.setRole("STUDENT");

        UserResponse response = UserResponse.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@test.com")
                .role("STUDENT")
                .build();

        when(userService.createUser(any(UserCreateRequest.class), eq("admin@test.com")))
                .thenReturn(response);
        when(userModelAssembler.toModel(response)).thenReturn(EntityModel.of(response));

        mockMvc.perform(post("/api/admin/users")
                        .principal(adminDetails()::getUsername)
                        .contentType(APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fullName").value("John Doe"))
                .andExpect(jsonPath("$.role").value("STUDENT"));
    }

    @Test
    void getAllUsers_shouldReturnUsers() throws Exception {
        UserResponse user = UserResponse.builder()
                .id(UUID.randomUUID())
                .fullName("John Doe")
                .email("john@test.com")
                .role("STUDENT")
                .build();

        when(userService.getAllUsers()).thenReturn(List.of(user));
        when(userModelAssembler.toModel(user)).thenReturn(EntityModel.of(user));

        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isOk());
    }

    @Test
    void getUserById_shouldReturnUser() throws Exception {
        UUID id = UUID.randomUUID();

        UserResponse response = UserResponse.builder()
                .id(id)
                .fullName("John Doe")
                .email("john@test.com")
                .role("STUDENT")
                .build();

        when(userService.getUserById(id)).thenReturn(response);
        when(userModelAssembler.toModel(response)).thenReturn(EntityModel.of(response));

        mockMvc.perform(get("/api/admin/users/" + id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("john@test.com"));
    }

    @Test
    void deleteUser_shouldReturnSuccessMessage() throws Exception {
        UUID id = UUID.randomUUID();

        mockMvc.perform(delete("/api/admin/users/" + id)
                        .principal(adminDetails()::getUsername))
                .andExpect(status().isOk())
                .andExpect(content().string("User deleted successfully"));
    }

    @Test
    void bulkUploadUsers_shouldReturnBulkUploadResponse() throws Exception {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "users.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "dummy content".getBytes()
        );

        BulkUploadResponse response = BulkUploadResponse.builder()
                .totalRows(2)
                .successCount(2)
                .failedCount(0)
                .failedRecords(List.of())
                .build();

        when(userService.bulkCreateUsers(any(), eq("admin@test.com"))).thenReturn(response);

        mockMvc.perform(multipart("/api/admin/users/bulk-upload")
                        .file(file)
                        .principal(adminDetails()::getUsername))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalRows").value(2))
                .andExpect(jsonPath("$.successCount").value(2));
    }

    @Test
    void downloadTemplate_shouldReturnExcelFile() throws Exception {
        mockMvc.perform(get("/api/admin/users/bulk-upload/template"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/octet-stream"));
    }
}
