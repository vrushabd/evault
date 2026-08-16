package com.evault.notifications.dto;

import com.evault.notifications.enums.NotificationType;
import java.time.LocalDateTime;

/**
 * Response payload returned after sending a notification and for history queries.
 */
public class NotificationResponse {

    private Long id;
    private String recipientWallet;
    private String recipientEmail;
    private NotificationType type;
    private String subject;
    private String message;
    private String documentName;
    private String caseId;
    private String recipientName;
    private boolean isRead;
    private LocalDateTime createdAt;
    private boolean emailSent;

    public NotificationResponse() {
    }

    public NotificationResponse(Long id, String recipientWallet, String recipientEmail,
                                NotificationType type, String subject, String message,
                                String documentName, String caseId, String recipientName,
                                boolean isRead, LocalDateTime createdAt, boolean emailSent) {
        this.id = id;
        this.recipientWallet = recipientWallet;
        this.recipientEmail = recipientEmail;
        this.type = type;
        this.subject = subject;
        this.message = message;
        this.documentName = documentName;
        this.caseId = caseId;
        this.recipientName = recipientName;
        this.isRead = isRead;
        this.createdAt = createdAt;
        this.emailSent = emailSent;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRecipientWallet() { return recipientWallet; }
    public void setRecipientWallet(String recipientWallet) { this.recipientWallet = recipientWallet; }

    public String getRecipientEmail() { return recipientEmail; }
    public void setRecipientEmail(String recipientEmail) { this.recipientEmail = recipientEmail; }

    public NotificationType getType() { return type; }
    public void setType(NotificationType type) { this.type = type; }

    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getDocumentName() { return documentName; }
    public void setDocumentName(String documentName) { this.documentName = documentName; }

    public String getCaseId() { return caseId; }
    public void setCaseId(String caseId) { this.caseId = caseId; }

    public String getRecipientName() { return recipientName; }
    public void setRecipientName(String recipientName) { this.recipientName = recipientName; }

    public boolean isRead() { return isRead; }
    public void setRead(boolean read) { isRead = read; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public boolean isEmailSent() { return emailSent; }
    public void setEmailSent(boolean emailSent) { this.emailSent = emailSent; }
}
