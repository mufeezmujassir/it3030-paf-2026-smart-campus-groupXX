package com.smartcampus.operations.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ProfileUpdateRequest {
    
    @NotBlank(message = "First Name is required")
    private String firstName;
    
    @NotBlank(message = "Last Name is required")
    private String lastName;

    private String gender;
    
    private String department;
    private String studentId;
    private String qualification;
    private String designation;
    private String technicianSpecialization;
    private Integer experienceYears;
}
