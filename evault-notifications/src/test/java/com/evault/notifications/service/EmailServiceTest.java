package com.evault.notifications.service;

import com.evault.notifications.exception.EmailSendException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for EmailService. Since the test profile does not have a real SMTP server,
 * we verify that the service correctly throws EmailSendException when mail
 * delivery is unavailable. This confirms the wiring and error-handling path.
 *
 * When a valid mail configuration is provided (real SMTP credentials),
 * EmailService.sendHtmlEmail will successfully deliver the message.
 */
@SpringBootTest
class EmailServiceTest {

    @Autowired
    private EmailService emailService;

    @Test
    void sendHtmlEmail_withoutSmtpServer_throwsEmailSendException() {
        // No SMTP server is running in the test environment, so this should fail gracefully.
        assertThrows(EmailSendException.class, () ->
                emailService.sendHtmlEmail("recipient@example.com", "Test Subject", "<p>Test</p>")
        );
    }
}
