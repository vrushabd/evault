package com.evault.audit.controller;

import com.evault.audit.dto.ApiResponse;
import com.evault.audit.dto.AuditRequest;
import com.evault.audit.model.AuditLog;
import com.evault.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/audit")
@CrossOrigin(origins = "*") // Allow frontend integration
public class AuditLogController {

    @Autowired
    private AuditLogRepository repository;

    @Autowired
    private RestTemplate restTemplate;

    @PostMapping("/log")
    public ResponseEntity<ApiResponse<AuditLog>> logAction(@RequestBody AuditRequest request, HttpServletRequest httpRequest) {
        try {
            AuditLog log = AuditLog.builder()
                    .docId(request.getDocId())
                    .caseId(request.getCaseId())
                    .action(request.getAction())
                    .performedBy(request.getPerformedBy())
                    .txHash(request.getTxHash())
                    .details(request.getDetails())
                    .ipAddress(httpRequest.getRemoteAddr())
                    .build();

            AuditLog saved = repository.save(log);
            return ResponseEntity.ok(ApiResponse.success(saved));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to log audit event: " + e.getMessage()));
        }
    }

    @GetMapping("/document/{docId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getDocumentAuditLogs(@PathVariable String docId) {
        List<AuditLog> logs = repository.findByDocIdOrderByPerformedAtDesc(docId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/case/{caseId}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getCaseAuditLogs(@PathVariable String caseId) {
        List<AuditLog> logs = repository.findByCaseIdOrderByPerformedAtDesc(caseId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/user/{wallet}")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getUserAuditLogs(@PathVariable String wallet) {
        List<AuditLog> logs = repository.findByPerformedByOrderByPerformedAtDesc(wallet);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/verify/{docId}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> verifyDocumentTampering(@PathVariable String docId) {
        try {
            long dbCount = repository.countByDocId(docId);
            
            // Call Blockchain service running on Node.js port 8083
            String blockchainUrl = "http://localhost:8083/blockchain/audit/" + docId;
            Map<String, Object> bcResponse = restTemplate.getForObject(blockchainUrl, Map.class);
            
            long bcCount = 0;
            if (bcResponse != null && bcResponse.containsKey("count")) {
                bcCount = Long.parseLong(bcResponse.get("count").toString());
            }

            Map<String, Object> result = new HashMap<>();
            result.put("dbCount", dbCount);
            result.put("blockchainCount", bcCount);
            result.put("tampered", dbCount != bcCount);
            
            return ResponseEntity.ok(ApiResponse.success(result));
        } catch (Exception e) {
            // If blockchain service is down, handle gracefully
            Map<String, Object> result = new HashMap<>();
            result.put("error", "Failed to verify against blockchain: " + e.getMessage());
            result.put("tampered", true); // Default to true if unable to verify for security
            return ResponseEntity.ok(ApiResponse.success(result));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("evault-audit service is healthy"));
    }
}
