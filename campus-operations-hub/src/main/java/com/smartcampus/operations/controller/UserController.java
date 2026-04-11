package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.dto.ProfileUpdateRequest;
import com.smartcampus.operations.dto.PasswordChangeRequest;
import com.smartcampus.operations.service.UserService;
import com.smartcampus.operations.mapper.UserModelAssembler;
import jakarta.validation.Valid;
import java.security.Principal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.hateoas.EntityModel;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserModelAssembler userModelAssembler;

    @GetMapping("/me")
    public ResponseEntity<EntityModel<UserResponse>> getMe(Principal principal) {
        UserResponse response = userService.getMe(principal.getName());
        return ResponseEntity.ok(userModelAssembler.toModel(response));
    }

    @PutMapping("/me/profile")
    public ResponseEntity<EntityModel<UserResponse>> updateProfile(Principal principal, @Valid @RequestBody ProfileUpdateRequest request) {
        UserResponse response = userService.updateProfile(principal.getName(), request);
        return ResponseEntity.ok(userModelAssembler.toModel(response));
    }

    @PutMapping("/me/password")
    public ResponseEntity<String> changePassword(Principal principal, @Valid @RequestBody PasswordChangeRequest request) {
        userService.changePassword(principal.getName(), request);
        return ResponseEntity.ok("Password updated successfully");
    }

    @PostMapping("/me/mfa/toggle")
    public ResponseEntity<EntityModel<UserResponse>> toggleMfa(Principal principal) {
        UserResponse response = userService.toggleMfa(principal.getName());
        return ResponseEntity.ok(userModelAssembler.toModel(response));
    }
}
