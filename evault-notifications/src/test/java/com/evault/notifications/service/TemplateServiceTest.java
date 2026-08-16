package com.evault.notifications.service;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.enums.NotificationType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for TemplateService: subject resolution and HTML rendering.
 */
@SpringBootTest
class TemplateServiceTest {

    @Autowired
    private TemplateService templateService;

    @Test
    void resolveSubject_documentUploaded() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_UPLOADED);
        request.setCaseId("2026-100");

        assertEquals("New document added to Case #2026-100", templateService.resolveSubject(request));
    }

    @Test
    void resolveSubject_accessGranted() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.ACCESS_GRANTED);
        request.setCaseId("2026-200");

        assertEquals("You now have access to Case #2026-200", templateService.resolveSubject(request));
    }

    @Test
    void resolveSubject_accessRevoked() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.ACCESS_REVOKED);

        assertEquals("Your access has been revoked", templateService.resolveSubject(request));
    }

    @Test
    void resolveSubject_documentAmended() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_AMENDED);
        request.setDocumentName("Petition.pdf");

        assertEquals("Document updated: Petition.pdf", templateService.resolveSubject(request));
    }

    @Test
    void renderTemplate_documentShared_containsDynamicValues() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_SHARED);
        request.setRecipientName("Advocate Mehta");
        request.setDocumentName("Evidence.docx");
        request.setCaseId("CASE-2026-500");

        String html = templateService.renderTemplate(request);

        assertNotNull(html);
        assertTrue(html.contains("Advocate Mehta"));
        assertTrue(html.contains("Evidence.docx"));
        assertTrue(html.contains("CASE-2026-500"));
    }

    @Test
    void renderTemplate_documentExpired_containsDocumentName() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_EXPIRED);
        request.setRecipientName("Client");
        request.setDocumentName("Lease.pdf");

        String html = templateService.renderTemplate(request);

        assertNotNull(html);
        assertTrue(html.contains("Lease.pdf"));
    }

    @Test
    void renderTemplate_genericFallback_usedForUploadedType() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_UPLOADED);
        request.setRecipientName("Judge");
        request.setDocumentName("Filing.pdf");
        request.setCaseId("CASE-999");

        String html = templateService.renderTemplate(request);

        assertNotNull(html);
        assertTrue(html.contains("Filing.pdf"));
        assertTrue(html.contains("CASE-999"));
    }
}
