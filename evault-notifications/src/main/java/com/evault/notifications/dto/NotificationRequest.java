package com.evault.notifications.dto;

import com.evault.notifications.enums.NotificationType;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Request payload for POST /api/notifications/send.
 * Contains everything needed to identify the event, the recipient,
 * and the document/case information required to populate the email template.
 */
public class NotificationRequest {

    @NotNull(message = "notificationType is required")
    private NotificationType notificationType;

    @NotBlank(message = "recipientWallet is required")
    private String recipientWallet;

    @NotBlank(message = "recipientEmail is required")
    @Email(message = "recipientEmail must be a valid email address")
    private String recipientEmail;

    private String recipientName;

    private String documentName;

    private String caseId;

    private String message;

    public NotificationType getNotificationType() {
        return notificationType;
    }

    public void setNotificationType(NotificationType notificationType) {
        this.notificationType = notificationType;
    }

    public String getRecipientWallet() {
        return recipientWallet;
    }

    public void setRecipientWallet(String recipientWallet) {
        this.recipientWallet = recipientWallet;
    }

    public String getRecipientEmail() {
        return recipientEmail;
    }

    public void setRecipientEmail(String recipientEmail) {
        this.recipientEmail = recipientEmail;
    }

    public String getRecipientName() {
        return recipientName;
    }

    public void setRecipientName(String recipientName) {
        this.recipientName = recipientName;
    }

    public String getDocumentName() {
        return documentName;
    }

    public void setDocumentName(String documentName) {
        this.documentName = documentName;
    }

    public String getCaseId() {
        return caseId;
    }

    public void setCaseId(String caseId) {
        this.caseId = caseId;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
