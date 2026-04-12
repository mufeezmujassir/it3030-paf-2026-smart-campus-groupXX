package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.dto.ProfileUpdateRequest;
import com.smartcampus.operations.dto.PasswordChangeRequest;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.exception.UserNotFoundException;
import com.smartcampus.operations.mapper.UserMapper;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.NotificationService;
import com.smartcampus.operations.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public UserResponse createUser(UserCreateRequest request, String adminEmail) {
        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("User with email " + request.getEmail() + " already exists");
        }

        User user = userMapper.toEntity(request);
        User savedUser = userRepository.save(user);

        log.info("User created: {} with role {}", savedUser.getEmail(), savedUser.getRole());

        // Send notification to admin who created the user
        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        if (admin != null) {
            notificationService.sendNotification(
                    admin.getId(),
                    "User Added",
                    String.format("User '%s' added successfully with role %s", savedUser.getFullName(), savedUser.getRole()),
                    "USER_CREATED"
            );
        }

        return userMapper.toResponse(savedUser);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(userMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getUserById(UUID id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public void deleteUser(UUID id, String adminEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UserNotFoundException("User not found with id: " + id));
        
        String deletedUserName = user.getFullName();
        userRepository.deleteById(id);
        log.info("User deleted with id: {}", id);

        // Send notification to admin who deleted the user
        User admin = userRepository.findByEmail(adminEmail).orElse(null);
        if (admin != null) {
            notificationService.sendNotification(
                    admin.getId(),
                    "User Removed",
                    String.format("User '%s' removed from the system", deletedUserName),
                    "USER_DELETED"
            );
        }
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getMe(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));
        return userMapper.toResponse(user);
    }

    @Override
    @Transactional
    public UserResponse updateProfile(String email, ProfileUpdateRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));

        user.setFullName(request.getFirstName() + " " + request.getLastName());
        user.setDepartment(request.getDepartment());
        user.setStudentId(request.getStudentId());
        user.setQualification(request.getQualification());
        user.setDesignation(request.getDesignation());
        user.setTechnicianSpecialization(request.getTechnicianSpecialization());
        user.setExperienceYears(request.getExperienceYears());

        User updatedUser = userRepository.save(user);
        log.info("User profile updated for email: {}", email);

        // Send notification to user
        notificationService.sendNotification(
                updatedUser.getId(),
                "Profile Updated",
                "Your profile has been updated successfully.",
                "PROFILE_UPDATED"
        );

        return userMapper.toResponse(updatedUser);
    }

    @Override
    @Transactional
    public void changePassword(String email, PasswordChangeRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new IllegalArgumentException("Incorrect current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);
        log.info("Password changed for user: {}", email);

        // Send notification to user
        notificationService.sendNotification(
                user.getId(),
                "Password Changed",
                "Your password has been changed successfully.",
                "PASSWORD_CHANGED"
        );
    }

    @Override
    @Transactional
    public UserResponse toggleMfa(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found with email: " + email));

        user.setTwoFactorEnabled(!user.getTwoFactorEnabled());
        User updatedUser = userRepository.save(user);
        log.info("MFA toggled to {} for user: {}", updatedUser.getTwoFactorEnabled(), email);

        // Send notification to user
        notificationService.sendNotification(
                updatedUser.getId(),
                "MFA Status Changed",
                String.format("Two-factor authentication %s successfully", updatedUser.getTwoFactorEnabled() ? "enabled" : "disabled"),
                "MFA_TOGGLED"
        );

        return userMapper.toResponse(updatedUser);
    }
}
