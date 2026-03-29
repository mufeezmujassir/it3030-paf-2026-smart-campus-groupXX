// src/main/java/com/smartcampus/operations/service/impl/NotificationServiceImpl.java
package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.entity.Notification;
import com.smartcampus.operations.repository.NotificationRepository;
import com.smartcampus.operations.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;

    @Override
    public void sendNotification(UUID userId, String title, String message, String type) {
        Notification notification = Notification.builder()
                .userId(userId)
                .title(title)
                .message(message)
                .type(type)
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        notificationRepository.save(notification);
        log.info("Notification sent to user {}: {}", userId, title);
    }
}