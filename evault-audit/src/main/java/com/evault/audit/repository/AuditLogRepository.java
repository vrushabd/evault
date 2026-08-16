package com.evault.audit.repository;

import com.evault.audit.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    List<AuditLog> findByDocIdOrderByPerformedAtDesc(String docId);

    List<AuditLog> findByCaseIdOrderByPerformedAtDesc(String caseId);

    List<AuditLog> findByPerformedByOrderByPerformedAtDesc(String performedBy);

    List<AuditLog> findAllByOrderByPerformedAtDesc();

    Optional<AuditLog> findByTxHashIgnoreCase(String txHash);

    long countByDocId(String docId);
}
