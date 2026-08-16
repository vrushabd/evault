package com.evault.notifications.service;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.dto.NotificationResponse;
import com.evault.notifications.exception.NotificationNotFoundException;
import com.evault.notifications.model.Notification;
import com.evault.notifications.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Core business logic for the Notification Service.
 * Receives requests, persists history to MySQL, and delegates email delivery to EmailService.
 */
@Service
public class NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationService.class);

    private final NotificationRepository repository;
    private final EmailService emailService;
    private final TemplateService templateService;

    public NotificationService(NotificationRepository repository,
                                EmailService emailService,
                                TemplateService templateService) {
        this.repository = repository;
        this.emailService = emailService;
        this.templateService = templateService;
    }

    /**
     * Processes a send-notification request:
     * 1. Resolves the subject and HTML body.
     * 2. Saves the notification record to MySQL.
     * 3. Attempts to send the email.
     *
     * The notification is saved regardless of whether the email succeeds,
     * so history is never lost. The response indicates emailSent status.
     */
    @Transactional
    public NotificationResponse processNotification(NotificationRequest request) {
        String subject = templateService.resolveSubject(request);
        String htmlBody = templateService.renderTemplate(request);

        Notification notification = new Notification();
        notification.setRecipientWallet(request.getRecipientWallet());
        notification.setRecipientEmail(request.getRecipientEmail());
        notification.setType(request.getNotificationType());
        notification.setSubject(subject);
        notification.setMessage(request.getMessage());
        notification.setDocumentName(request.getDocumentName());
        notification.setCaseId(request.getCaseId());
        notification.setRecipientName(request.getRecipientName());
        notification.setRead(false);

        Notification saved = repository.save(notification);

        boolean emailSent = false;
        try {
            emailService.sendHtmlEmail(request.getRecipientEmail(), subject, htmlBody);
            emailSent = true;
        } catch (Exception e) {
            // History is preserved even if email delivery fails.
            log.error("Failed to send email to {} for notification {}: {}",
                    request.getRecipientEmail(), saved.getId(), e.getMessage());
        }

        return toResponse(saved, emailSent);
    }

    /**
     * Returns all notifications for a given wallet address, newest first.
     */
    @Transactional(readOnly = true)
    public List<NotificationResponse> getNotificationsForWallet(String wallet) {
        return repository.findByRecipientWalletOrderByCreatedAtDesc(wallet)
                .stream()
                .map(n -> toResponse(n, false))
                .toList();
    }

    /**
     * Marks the notification with the given ID as read.
     */
    @Transactional
    public NotificationResponse markAsRead(Long id) {
        Notification notification = repository.findById(id)
                .orElseThrow(() -> new NotificationNotFoundException("Notification not found with id: " + id));
        notification.setRead(true);
        Notification updated = repository.save(notification);
        return toResponse(updated, false);
    }

    private NotificationResponse toResponse(Notification n, boolean emailSent) {
        return new NotificationResponse(
                n.getId(),
                n.getRecipientWallet(),
                n.getRecipientEmail(),
                n.getType(),
                n.getSubject(),
                n.getMessage(),
                n.getDocumentName(),
                n.getCaseId(),
                n.getRecipientName(),
                n.isRead(),
                n.getCreatedAt(),
                emailSent
        );
    }
}
