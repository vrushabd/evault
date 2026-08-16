package com.evault.notifications.service;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.dto.NotificationResponse;
import com.evault.notifications.enums.NotificationType;
import com.evault.notifications.exception.NotificationNotFoundException;
import com.evault.notifications.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration tests for NotificationService using an in-memory H2 database.
 */
@SpringBootTest
@Transactional
class NotificationServiceTest {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository repository;

    @BeforeEach
    void cleanUp() {
        repository.deleteAll();
    }

    @Test
    void processNotification_savesHistoryAndReturnsResponse() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_SHARED);
        request.setRecipientWallet("0xWallet123");
        request.setRecipientEmail("recipient@example.com");
        request.setRecipientName("Advocate Sharma");
        request.setDocumentName("Affidavit.pdf");
        request.setCaseId("CASE-2026-001");
        request.setMessage("Please review the shared document.");

        NotificationResponse response = notificationService.processNotification(request);

        assertNotNull(response.getId());
        assertEquals("0xWallet123", response.getRecipientWallet());
        assertEquals(NotificationType.DOCUMENT_SHARED, response.getType());
        assertEquals("A document has been shared with you", response.getSubject());
        assertFalse(response.isRead());
        assertNotNull(response.getCreatedAt());
    }

    @Test
    void getNotificationsForWallet_returnsOnlyThatWalletsNotifications() {
        notificationService.processNotification(createNotification("0xWalletA", NotificationType.DOCUMENT_SHARED));
        notificationService.processNotification(createNotification("0xWalletA", NotificationType.ACCESS_GRANTED));
        notificationService.processNotification(createNotification("0xWalletB", NotificationType.DOCUMENT_EXPIRED));

        List<NotificationResponse> walletA = notificationService.getNotificationsForWallet("0xWalletA");

        assertEquals(2, walletA.size());
        assertTrue(walletA.stream().allMatch(n -> "0xWalletA".equals(n.getRecipientWallet())));
    }

    @Test
    void markAsRead_setsReadFlag() {
        NotificationRequest request = createNotification("0xWalletC", NotificationType.ACCESS_GRANTED);
        NotificationResponse saved = notificationService.processNotification(request);
        NotificationResponse updated = notificationService.markAsRead(saved.getId());

        assertTrue(updated.isRead());
    }

    @Test
    void markAsRead_throwsWhenNotFound() {
        assertThrows(NotificationNotFoundException.class, () -> notificationService.markAsRead(99999L));
    }

    @Test
    void processNotification_withDocumentExpired_resolvesCorrectSubject() {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_EXPIRED);
        request.setRecipientWallet("0xWalletD");
        request.setRecipientEmail("lawyer@example.com");
        request.setDocumentName("Contract.pdf");

        NotificationResponse response = notificationService.processNotification(request);

        assertEquals("Document expired: Contract.pdf", response.getSubject());
    }

    private NotificationRequest createNotification(String wallet, NotificationType type) {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(type);
        request.setRecipientWallet(wallet);
        request.setRecipientEmail("user@example.com");
        request.setRecipientName("Test User");
        request.setDocumentName("Doc.pdf");
        request.setCaseId("CASE-001");
        request.setMessage("Test message");
        return request;
    }
}
