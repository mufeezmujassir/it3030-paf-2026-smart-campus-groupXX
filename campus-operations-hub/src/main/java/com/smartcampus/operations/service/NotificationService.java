// src/main/java/com/smartcampus/operations/service/NotificationService.java
package com.smartcampus.operations.service;

import java.util.UUID;

public interface NotificationService {
    void sendNotification(UUID userId, String title, String message, String type);
}