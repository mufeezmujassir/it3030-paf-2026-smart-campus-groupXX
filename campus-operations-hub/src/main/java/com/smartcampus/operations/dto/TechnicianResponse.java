package com.smartcampus.operations.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
@Builder
public class TechnicianResponse {
    private UUID id;
    private String fullName;
    private String email;
    private String technicianSpecialization;
    private String department;
}