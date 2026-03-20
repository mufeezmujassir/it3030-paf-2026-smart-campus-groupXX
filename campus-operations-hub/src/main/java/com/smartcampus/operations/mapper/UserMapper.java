package com.smartcampus.operations.mapper;

import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.entity.AuthProvider;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {

    public User toEntity(UserCreateRequest request) {
        return User.builder()
                .fullName(request.getFullName())
                .email(request.getEmail())
                .role(Role.valueOf(request.getRole().toUpperCase()))
                .authProvider(AuthProvider.GOOGLE) // Non-admin users use Google OAuth
                .department(request.getDepartment())
                .qualification(request.getQualification())
                .designation(request.getDesignation())
                .studentId(request.getStudentId())
                .technicianSpecialization(request.getTechnicianSpecialization())
                .experienceYears(request.getExperienceYears())
                .isActive(true)
                .isLocked(false)
                .twoFactorEnabled(true)
                .build();
    }

    public UserResponse toResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .fullName(user.getFullName())
                .email(user.getEmail())
                .authProvider(user.getAuthProvider().name())
                .role(user.getRole().name())
                .department(user.getDepartment())
                .qualification(user.getQualification())
                .designation(user.getDesignation())
                .studentId(user.getStudentId())
                .technicianSpecialization(user.getTechnicianSpecialization())
                .experienceYears(user.getExperienceYears())
                .isActive(user.getIsActive())
                .isLocked(user.getIsLocked())
                .twoFactorEnabled(user.getTwoFactorEnabled())
                .lastLogin(user.getLastLogin())
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
