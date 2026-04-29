package com.smartcampus.operations.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class BulkUploadResponse {

    private int totalRows;
    private int successCount;
    private int failedCount;
    private List<FailedUserRecord> failedRecords;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class FailedUserRecord {
        private int rowNumber;
        private String fullName;
        private String email;
        private String role;
        private String reason;
    }
}
