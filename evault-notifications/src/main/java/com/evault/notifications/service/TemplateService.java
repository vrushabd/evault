package com.evault.notifications.service;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.enums.NotificationType;
import com.evault.notifications.exception.InvalidNotificationTypeException;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import java.util.Map;

/**
 * Selects the appropriate HTML template for a notification type,
 * populates it with the required information, and returns the final
 * HTML content that EmailService will send.
 */
@Service
public class TemplateService {

    private final TemplateEngine templateEngine;

    /**
     * Maps each notification type to its Thymeleaf template path under src/main/resources/templates.
     * Templates not listed here fall back to a generic template.
     */
    private static final Map<NotificationType, String> TEMPLATE_MAP = Map.of(
            NotificationType.DOCUMENT_SHARED, "document-shared",
            NotificationType.ACCESS_GRANTED, "access-granted",
            NotificationType.DOCUMENT_EXPIRED, "document-expired"
    );

    public TemplateService(TemplateEngine templateEngine) {
        this.templateEngine = templateEngine;
    }

    /**
     * Renders the HTML email body for the given notification request.
     *
     * @param request the notification payload
     * @return fully rendered HTML string
     */
    public String renderTemplate(NotificationRequest request) {
        NotificationType type = request.getNotificationType();
        String templateName = TEMPLATE_MAP.get(type);

        Context context = new Context();
        context.setVariable("recipientName", request.getRecipientName());
        context.setVariable("documentName", request.getDocumentName());
        context.setVariable("caseId", request.getCaseId());
        context.setVariable("message", request.getMessage());
        context.setVariable("notificationType", type != null ? type.name() : "");

        if (templateName != null) {
            return templateEngine.process(templateName, context);
        }

        // For events without a dedicated template, use the generic fallback.
        return templateEngine.process("generic", context);
    }

    /**
     * Determines the email subject for a given notification type.
     */
    public String resolveSubject(NotificationRequest request) {
        NotificationType type = request.getNotificationType();
        if (type == null) {
            throw new InvalidNotificationTypeException("Notification type must not be null");
        }

        String caseId = request.getCaseId() != null ? request.getCaseId() : "";
        String docName = request.getDocumentName() != null ? request.getDocumentName() : "";

        return switch (type) {
            case DOCUMENT_UPLOADED -> "New document added to Case #" + caseId;
            case DOCUMENT_SHARED -> "A document has been shared with you";
            case ACCESS_GRANTED -> "You now have access to Case #" + caseId;
            case ACCESS_REVOKED -> "Your access has been revoked";
            case DOCUMENT_AMENDED -> "Document updated: " + docName;
            case DOCUMENT_EXPIRED -> "Document expired: " + docName;
        };
    }
}
