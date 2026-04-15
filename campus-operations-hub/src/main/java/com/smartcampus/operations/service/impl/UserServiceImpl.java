package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.dto.ProfileUpdateRequest;
import com.smartcampus.operations.dto.PasswordChangeRequest;
import com.smartcampus.operations.dto.BulkUploadResponse;
import com.smartcampus.operations.entity.User;
import com.smartcampus.operations.entity.Role;
import com.smartcampus.operations.exception.UserNotFoundException;
import com.smartcampus.operations.mapper.UserMapper;
import com.smartcampus.operations.repository.UserRepository;
import com.smartcampus.operations.service.NotificationService;
import com.smartcampus.operations.service.UserService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.*;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final NotificationService notificationService;

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
            "^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    private static final Set<String> VALID_ROLES = Set.of("ADMIN", "STUDENT", "STAFF", "TECHNICIAN");
    private static final Set<String> VALID_SPECIALIZATIONS = Set.of(
            "RESOURCE_MAINTENANCE", "IT_SUPPORT", "NETWORK", "LAB_SUPPORT"
    );

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
    @Transactional
    public BulkUploadResponse bulkCreateUsers(MultipartFile file, String adminEmail) {
        List<BulkUploadResponse.FailedUserRecord> failedRecords = new ArrayList<>();
        Set<String> seenEmailsInFile = new HashSet<>();
        int totalRows = 0;
        int successCount = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new IllegalArgumentException("Excel file has no sheets");
            }

            // Parse header row to get column indices
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new IllegalArgumentException("Excel file has no header row");
            }

            Map<String, Integer> columnMap = parseHeaderRow(headerRow);

            // Validate required columns exist
            if (!columnMap.containsKey("fullname")) {
                throw new IllegalArgumentException("Missing required column: fullName");
            }
            if (!columnMap.containsKey("email")) {
                throw new IllegalArgumentException("Missing required column: email");
            }
            if (!columnMap.containsKey("role")) {
                throw new IllegalArgumentException("Missing required column: role");
            }

            // Process each data row (skip header)
            for (int i = 1; i <= sheet.getLastRowNum(); i++) {
                Row row = sheet.getRow(i);
                if (row == null || isRowEmpty(row)) continue;

                totalRows++;
                int rowNumber = i + 1; // 1-based for user display

                String fullName = getCellStringValue(row, columnMap.get("fullname"));
                String email = getCellStringValue(row, columnMap.get("email"));
                String roleStr = getCellStringValue(row, columnMap.get("role"));
                String department = getCellStringValue(row, columnMap.getOrDefault("department", -1));
                String studentId = getCellStringValue(row, columnMap.getOrDefault("studentid", -1));
                String qualification = getCellStringValue(row, columnMap.getOrDefault("qualification", -1));
                String designation = getCellStringValue(row, columnMap.getOrDefault("designation", -1));
                String techSpec = getCellStringValue(row, columnMap.getOrDefault("technicianspecialization", -1));
                String expYearsStr = getCellStringValue(row, columnMap.getOrDefault("experienceyears", -1));

                // --- Validate row ---
                String validationError = validateRow(
                        fullName, email, roleStr, department, studentId,
                        qualification, designation, techSpec, expYearsStr,
                        seenEmailsInFile, rowNumber
                );

                if (validationError != null) {
                    failedRecords.add(BulkUploadResponse.FailedUserRecord.builder()
                            .rowNumber(rowNumber)
                            .fullName(fullName != null ? fullName : "")
                            .email(email != null ? email : "")
                            .role(roleStr != null ? roleStr : "")
                            .reason(validationError)
                            .build());
                    continue;
                }

                // Track email for in-file duplicate detection
                seenEmailsInFile.add(email.toLowerCase().trim());

                // Build and save the user
                try {
                    UserCreateRequest request = new UserCreateRequest();
                    request.setFullName(fullName.trim());
                    request.setEmail(email.trim().toLowerCase());
                    request.setRole(roleStr.trim().toUpperCase());
                    request.setDepartment(department);
                    request.setStudentId(studentId);
                    request.setQualification(qualification);
                    request.setDesignation(designation);
                    request.setTechnicianSpecialization(techSpec != null ? techSpec.trim().toUpperCase() : null);

                    if (expYearsStr != null && !expYearsStr.isBlank()) {
                        request.setExperienceYears((int) Double.parseDouble(expYearsStr.trim()));
                    }

                    User user = userMapper.toEntity(request);
                    userRepository.save(user);
                    successCount++;
                    log.info("Bulk import: Created user {} with role {}", email, roleStr);
                } catch (Exception e) {
                    log.error("Bulk import: Failed to save user at row {}: {}", rowNumber, e.getMessage());
                    failedRecords.add(BulkUploadResponse.FailedUserRecord.builder()
                            .rowNumber(rowNumber)
                            .fullName(fullName != null ? fullName : "")
                            .email(email != null ? email : "")
                            .role(roleStr != null ? roleStr : "")
                            .reason("Failed to save: " + e.getMessage())
                            .build());
                }
            }

            // Send notification to admin
            User admin = userRepository.findByEmail(adminEmail).orElse(null);
            if (admin != null) {
                notificationService.sendNotification(
                        admin.getId(),
                        "Bulk Import Complete",
                        String.format("Bulk import finished: %d added, %d skipped out of %d total rows",
                                successCount, failedRecords.size(), totalRows),
                        "BULK_IMPORT"
                );
            }

        } catch (IllegalArgumentException e) {
            throw e; // re-throw validation errors
        } catch (Exception e) {
            log.error("Bulk import: Failed to process Excel file: {}", e.getMessage());
            throw new IllegalArgumentException("Failed to process Excel file: " + e.getMessage());
        }

        return BulkUploadResponse.builder()
                .totalRows(totalRows)
                .successCount(successCount)
                .failedCount(failedRecords.size())
                .failedRecords(failedRecords)
                .build();
    }

    // --- Bulk import helper methods ---

    private Map<String, Integer> parseHeaderRow(Row headerRow) {
        Map<String, Integer> columnMap = new HashMap<>();
        for (int i = 0; i < headerRow.getLastCellNum(); i++) {
            Cell cell = headerRow.getCell(i);
            if (cell != null) {
                String headerName = cell.getStringCellValue().trim().toLowerCase().replaceAll("[\\s_-]+", "");
                columnMap.put(headerName, i);
            }
        }
        return columnMap;
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = getCellStringValue(row, i);
                if (val != null && !val.isBlank()) return false;
            }
        }
        return true;
    }

    private String getCellStringValue(Row row, int colIndex) {
        if (colIndex < 0) return null;
        Cell cell = row.getCell(colIndex);
        if (cell == null) return null;

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue().trim();
            case NUMERIC -> String.valueOf((long) cell.getNumericCellValue());
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case BLANK -> null;
            default -> null;
        };
    }

    private String validateRow(String fullName, String email, String roleStr,
                               String department, String studentId, String qualification,
                               String designation, String techSpec, String expYearsStr,
                               Set<String> seenEmails, int rowNumber) {
        // fullName required
        if (fullName == null || fullName.isBlank()) {
            return "Full name is required";
        }

        // email required + format
        if (email == null || email.isBlank()) {
            return "Email is required";
        }
        if (!EMAIL_PATTERN.matcher(email.trim()).matches()) {
            return "Invalid email format: " + email;
        }

        // email: check in-file duplicate
        if (seenEmails.contains(email.toLowerCase().trim())) {
            return "Duplicate email within the uploaded file";
        }

        // email: check DB uniqueness
        if (userRepository.existsByEmail(email.trim().toLowerCase())) {
            return "Email already exists in system";
        }

        // role required + valid
        if (roleStr == null || roleStr.isBlank()) {
            return "Role is required";
        }
        String roleUpper = roleStr.trim().toUpperCase();
        if (!VALID_ROLES.contains(roleUpper)) {
            return "Invalid role: " + roleStr + ". Must be one of: STUDENT, STAFF, TECHNICIAN, ADMIN";
        }

        // Role-specific validations
        switch (roleUpper) {
            case "STUDENT":
                if (studentId == null || studentId.isBlank()) {
                    return "Student ID is required for STUDENT role";
                }
                break;
            case "STAFF":
                if (qualification == null || qualification.isBlank()) {
                    return "Qualification is required for STAFF role";
                }
                if (designation == null || designation.isBlank()) {
                    return "Designation is required for STAFF role";
                }
                break;
            case "TECHNICIAN":
                if (techSpec == null || techSpec.isBlank()) {
                    return "Technician specialization is required for TECHNICIAN role";
                }
                if (!VALID_SPECIALIZATIONS.contains(techSpec.trim().toUpperCase())) {
                    return "Invalid specialization: " + techSpec + ". Must be one of: RESOURCE_MAINTENANCE, IT_SUPPORT, NETWORK, LAB_SUPPORT";
                }
                if (expYearsStr == null || expYearsStr.isBlank()) {
                    return "Experience years is required for TECHNICIAN role";
                }
                try {
                    Double.parseDouble(expYearsStr.trim());
                } catch (NumberFormatException e) {
                    return "Experience years must be a number";
                }
                break;
            case "ADMIN":
                // No additional fields required
                break;
        }

        return null; // All valid
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
