package com.smartcampus.operations.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String authProvider;
    private String role;
    private String department;
    private String qualification;
    private String designation;
    private String studentId;
    private String technicianSpecialization;
    private Integer experienceYears;
    private Boolean isActive;
    private Boolean isLocked;
    private Boolean twoFactorEnabled;
    private LocalDateTime lastLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
