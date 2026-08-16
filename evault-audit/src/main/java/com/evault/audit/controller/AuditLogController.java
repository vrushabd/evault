package com.evault.audit.controller;

import com.evault.audit.dto.ApiResponse;
import com.evault.audit.dto.AuditRequest;
import com.evault.audit.model.AuditLog;
import com.evault.audit.repository.AuditLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/audit")
@CrossOrigin(origins = "*")
public class AuditLogController {

    @Autowired
    private AuditLogRepository repository;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${evault.blockchain.url:http://localhost:8083}")
    private String blockchainBaseUrl;

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

    @GetMapping("/recent")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getRecentLogs(
            @RequestParam(name = "limit", defaultValue = "50") int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 200));
        List<AuditLog> logs = repository.findAllByOrderByPerformedAtDesc().stream()
                .limit(safeLimit)
                .collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(logs));
    }

    @GetMapping("/id/{id}")
    public ResponseEntity<ApiResponse<AuditLog>> getLogById(@PathVariable Long id) {
        return repository.findById(id)
                .map(log -> ResponseEntity.ok(ApiResponse.success(log)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Audit log not found: " + id)));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<AuditLog>> searchLog(@RequestParam("q") String query) {
        String q = query == null ? "" : query.trim();
        if (q.isEmpty()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Query is required"));
        }

        if (q.matches("\\d+")) {
            return repository.findById(Long.parseLong(q))
                    .map(log -> ResponseEntity.ok(ApiResponse.success(log)))
                    .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("No audit log for id " + q)));
        }

        if (q.toLowerCase(Locale.ROOT).startsWith("0x") && q.length() >= 10) {
            return repository.findByTxHashIgnoreCase(q)
                    .map(log -> ResponseEntity.ok(ApiResponse.success(log)))
                    .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("No audit log for tx hash")));
        }

        List<AuditLog> byDoc = repository.findByDocIdOrderByPerformedAtDesc(q);
        if (!byDoc.isEmpty()) {
            return ResponseEntity.ok(ApiResponse.success(byDoc.get(0)));
        }

        return ResponseEntity.status(404).body(ApiResponse.error("No matching audit record"));
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

            String base = blockchainBaseUrl.endsWith("/")
                    ? blockchainBaseUrl.substring(0, blockchainBaseUrl.length() - 1)
                    : blockchainBaseUrl;
            String blockchainUrl = base + "/blockchain/audit/" + docId;
            @SuppressWarnings("unchecked")
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
            Map<String, Object> result = new HashMap<>();
            result.put("error", "Failed to verify against blockchain: " + e.getMessage());
            result.put("tampered", true);
            return ResponseEntity.ok(ApiResponse.success(result));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return ResponseEntity.ok(ApiResponse.success("evault-audit service is healthy"));
    }
}
