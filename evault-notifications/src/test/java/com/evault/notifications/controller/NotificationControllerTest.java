package com.evault.notifications.controller;

import com.evault.notifications.dto.NotificationRequest;
import com.evault.notifications.dto.NotificationResponse;
import com.evault.notifications.enums.NotificationType;
import com.evault.notifications.service.NotificationService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Integration tests for NotificationController using MockMvc.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private NotificationService notificationService;

    @Test
    void sendNotification_returnsCreated() throws Exception {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_SHARED);
        request.setRecipientWallet("0xTestWallet");
        request.setRecipientEmail("test@example.com");
        request.setRecipientName("Test User");
        request.setDocumentName("TestDoc.pdf");
        request.setCaseId("CASE-001");
        request.setMessage("Please review.");

        mockMvc.perform(post("/api/notifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.recipientWallet").value("0xTestWallet"))
                .andExpect(jsonPath("$.subject").value("A document has been shared with you"))
                .andExpect(jsonPath("$.read").value(false));
    }

    @Test
    void sendNotification_invalidEmail_returnsBadRequest() throws Exception {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_SHARED);
        request.setRecipientWallet("0xTestWallet");
        request.setRecipientEmail("not-an-email");
        request.setRecipientName("Test User");

        mockMvc.perform(post("/api/notifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void sendNotification_missingType_returnsBadRequest() throws Exception {
        String body = """
                {
                    "recipientWallet": "0xTestWallet",
                    "recipientEmail": "test@example.com"
                }
                """;

        mockMvc.perform(post("/api/notifications/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUserNotifications_returnsList() throws Exception {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.ACCESS_GRANTED);
        request.setRecipientWallet("0xWalletList");
        request.setRecipientEmail("list@example.com");
        request.setRecipientName("List User");
        request.setCaseId("CASE-002");

        notificationService.processNotification(request);

        mockMvc.perform(get("/api/notifications/user/0xWalletList"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].recipientWallet").value("0xWalletList"));
    }

    @Test
    void markAsRead_existingNotification_returnsOk() throws Exception {
        NotificationRequest request = new NotificationRequest();
        request.setNotificationType(NotificationType.DOCUMENT_SHARED);
        request.setRecipientWallet("0xReadWallet");
        request.setRecipientEmail("read@example.com");

        NotificationResponse saved = notificationService.processNotification(request);

        mockMvc.perform(put("/api/notifications/" + saved.getId() + "/read"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.read").value(true));
    }

    @Test
    void markAsRead_notFound_returns404() throws Exception {
        mockMvc.perform(put("/api/notifications/99999/read"))
                .andExpect(status().isNotFound());
    }
}
