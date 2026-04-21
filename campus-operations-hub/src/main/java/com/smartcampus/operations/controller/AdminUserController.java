package com.smartcampus.operations.controller;

import com.smartcampus.operations.dto.BulkUploadResponse;
import com.smartcampus.operations.dto.UserCreateRequest;
import com.smartcampus.operations.dto.UserResponse;
import com.smartcampus.operations.mapper.UserModelAssembler;
import com.smartcampus.operations.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.hateoas.CollectionModel;
import org.springframework.hateoas.EntityModel;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import static org.springframework.hateoas.server.mvc.WebMvcLinkBuilder.*;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserService userService;
    private final UserModelAssembler userModelAssembler;

    @PostMapping
    public ResponseEntity<EntityModel<UserResponse>> createUser(@Valid @RequestBody UserCreateRequest request,
                                                               @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        UserResponse response = userService.createUser(request, userDetails.getUsername());
        return new ResponseEntity<>(userModelAssembler.toModel(response), HttpStatus.CREATED);
    }

    @PostMapping("/bulk-upload")
    public ResponseEntity<BulkUploadResponse> bulkUploadUsers(
            @RequestParam("file") MultipartFile file,
            @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {

        // Validate file
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please upload a valid Excel file");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new IllegalArgumentException("Only .xlsx and .xls files are supported");
        }

        BulkUploadResponse response = userService.bulkCreateUsers(file, userDetails.getUsername());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/bulk-upload/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("User Import Template");

            // Create header style
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setFontHeightInPoints((short) 12);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.LIGHT_CORNFLOWER_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            // Headers
            String[] headers = {
                    "fullName", "email", "role", "department", "gender",
                    "studentId", "qualification", "designation",
                    "technicianSpecialization", "experienceYears"
            };

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 6000);
            }

            // Example data rows for each role
            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);

            // Row 1: STUDENT example
            Row studentRow = sheet.createRow(1);
            String[] studentData = {"John Doe", "john.doe@university.edu", "STUDENT", "Engineering", "MALE", "IT21000001", "", "", "", ""};
            for (int i = 0; i < studentData.length; i++) {
                Cell cell = studentRow.createCell(i);
                cell.setCellValue(studentData[i]);
                cell.setCellStyle(dataStyle);
            }

            // Row 2: STAFF example
            Row staffRow = sheet.createRow(2);
            String[] staffData = {"Jane Smith", "jane.smith@university.edu", "STAFF", "Computer Science", "FEMALE", "", "PhD", "Senior Lecturer", "", ""};
            for (int i = 0; i < staffData.length; i++) {
                Cell cell = staffRow.createCell(i);
                cell.setCellValue(staffData[i]);
                cell.setCellStyle(dataStyle);
            }

            // Row 3: TECHNICIAN example
            Row techRow = sheet.createRow(3);
            String[] techData = {"Mike Johnson", "mike.johnson@university.edu", "TECHNICIAN", "IT Department", "MALE", "", "", "", "IT_SUPPORT", "5"};
            for (int i = 0; i < techData.length; i++) {
                Cell cell = techRow.createCell(i);
                cell.setCellValue(techData[i]);
                cell.setCellStyle(dataStyle);
            }

            // Row 4: ADMIN example
            Row adminRow = sheet.createRow(4);
            String[] adminData = {"Sarah Admin", "sarah.admin@university.edu", "ADMIN", "Administration", "FEMALE", "", "", "", "", ""};
            for (int i = 0; i < adminData.length; i++) {
                Cell cell = adminRow.createCell(i);
                cell.setCellValue(adminData[i]);
                cell.setCellStyle(dataStyle);
            }

            // --- Instructions Sheet ---
            Sheet instructionsSheet = workbook.createSheet("Instructions");

            CellStyle titleStyle = workbook.createCellStyle();
            Font titleFont = workbook.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 14);
            titleStyle.setFont(titleFont);

            CellStyle infoStyle = workbook.createCellStyle();
            infoStyle.setWrapText(true);

            int row = 0;
            Row r = instructionsSheet.createRow(row++);
            Cell c = r.createCell(0);
            c.setCellValue("Smart Campus — Bulk User Import Instructions");
            c.setCellStyle(titleStyle);

            row++;
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Required Columns: fullName, email, role");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Optional Columns: department, gender, studentId, qualification, designation, specialization, experience");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Valid Roles: STUDENT, STAFF, TECHNICIAN, ADMIN");
            row++;
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Role-Specific Required Fields:");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • STUDENT: studentId");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • STAFF: qualification, designation");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • TECHNICIAN: technicianSpecialization, experienceYears");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • ADMIN: no additional fields required");
            row++;
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Valid Specializations: RESOURCE_MAINTENANCE, IT_SUPPORT, NETWORK, LAB_SUPPORT");
            row++;
            instructionsSheet.createRow(row++).createCell(0).setCellValue("Notes:");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • Emails must be unique — duplicates within the file or existing in the system will be skipped");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • Empty rows will be ignored");
            instructionsSheet.createRow(row++).createCell(0).setCellValue("  • Delete the example data rows before uploading your actual data");

            instructionsSheet.setColumnWidth(0, 20000);

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            HttpHeaders responseHeaders = new HttpHeaders();
            responseHeaders.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            responseHeaders.setContentDispositionFormData("attachment", "user_import_template.xlsx");

            return new ResponseEntity<>(out.toByteArray(), responseHeaders, HttpStatus.OK);

        } catch (Exception e) {
            throw new RuntimeException("Failed to generate template: " + e.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<CollectionModel<EntityModel<UserResponse>>> getAllUsers() {
        List<EntityModel<UserResponse>> users = userService.getAllUsers().stream()
                .map(userModelAssembler::toModel)
                .collect(Collectors.toList());
        
        return ResponseEntity.ok(CollectionModel.of(users,
                linkTo(methodOn(AdminUserController.class).getAllUsers()).withSelfRel()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EntityModel<UserResponse>> getUserById(@PathVariable UUID id) {
        UserResponse response = userService.getUserById(id);
        return ResponseEntity.ok(userModelAssembler.toModel(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<String> deleteUser(@PathVariable UUID id,
                                             @org.springframework.security.core.annotation.AuthenticationPrincipal org.springframework.security.core.userdetails.UserDetails userDetails) {
        userService.deleteUser(id, userDetails.getUsername());
        return ResponseEntity.ok("User deleted successfully");
    }
}
