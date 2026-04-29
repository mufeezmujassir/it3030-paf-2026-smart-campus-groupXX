package com.smartcampus.operations.service.impl;

import com.smartcampus.operations.entity.Notification;
import com.smartcampus.operations.repository.NotificationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import java.util.UUID;

import static org.mockito.Mockito.*;

@ExtendWith(org.mockito.junit.jupiter.MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    @Test
    void sendNotification_shouldSaveNotification() {
        UUID userId = UUID.randomUUID();

        notificationService.sendNotification(userId, "Title", "Message", "LOGIN_SUCCESS");

        verify(notificationRepository).save(any(Notification.class));
    }
}
