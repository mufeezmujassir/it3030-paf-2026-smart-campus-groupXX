package com.smartcampus.operations.service;

import com.smartcampus.operations.dto.ProfileUpdateRequest;
import com.smartcampus.operations.dto.PasswordChangeRequest;
import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;

import java.util.List;
import java.util.UUID;

public interface UserService {

    UserResponse createUser(UserCreateRequest request, String adminEmail);

    List<UserResponse> getAllUsers();

    UserResponse getUserById(UUID id);

    void deleteUser(UUID id, String adminEmail);

    UserResponse getMe(String email);

    UserResponse updateProfile(String email, ProfileUpdateRequest request);

    void changePassword(String email, PasswordChangeRequest request);

    UserResponse toggleMfa(String email);
}
