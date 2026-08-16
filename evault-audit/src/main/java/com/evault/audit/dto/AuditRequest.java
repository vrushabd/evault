package com.evault.audit.dto;

import com.evault.audit.model.AuditAction;
import lombok.Data;

@Data
public class AuditRequest {
    private String docId;
    private String caseId;
    private AuditAction action;
    private String performedBy;
    private String txHash;
    private String details;
}
