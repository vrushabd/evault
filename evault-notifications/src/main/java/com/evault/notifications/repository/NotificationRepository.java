package com.evault.notifications.repository;

import com.evault.notifications.model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByRecipientWalletOrderByCreatedAtDesc(String recipientWallet);
}
