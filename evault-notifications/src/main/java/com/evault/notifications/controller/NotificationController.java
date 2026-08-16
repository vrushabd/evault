package com.evault.notifications.controller;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.dto.NotificationResponse;
import com.evault.notifications.service.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing the three required Notification Service endpoints.
 * Base path: /api/notifications
 */
@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * POST /api/notifications/send
     * Called by the Document Service to send a notification email and store history.
     */
    @PostMapping("/send")
    public ResponseEntity<NotificationResponse> send(@Valid @RequestBody NotificationRequest request) {
        NotificationResponse response = notificationService.processNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * GET /api/notifications/user/{wallet}
     * Called by the frontend to retrieve notification history for a user.
     */
    @GetMapping("/user/{wallet}")
    public ResponseEntity<List<NotificationResponse>> getUserNotifications(@PathVariable String wallet) {
        List<NotificationResponse> notifications = notificationService.getNotificationsForWallet(wallet);
        return ResponseEntity.ok(notifications);
    }

    /**
     * PUT /api/notifications/{id}/read
     * Called by the frontend to mark a notification as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long id) {
        NotificationResponse response = notificationService.markAsRead(id);
        return ResponseEntity.ok(response);
    }
}
