// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract eVault {

    // ── ENUMS ──────────────────────────────────────────────
    enum Role      { NONE, CLIENT, LAWYER, JUDGE, ADMIN }
    enum DocStatus { ACTIVE, ARCHIVED, REVOKED }

    // ── STRUCTS ────────────────────────────────────────────
    struct Document {
        string    caseId;
        string    ipfsCID;
        string    docType;
        address   uploadedBy;
        uint256   timestamp;
        uint256   version;
        string    previousDocId;
        DocStatus status;
    }

    struct AuditEntry {
        address accessor;
        string  action;
        uint256 timestamp;
        string  details;
    }

    // ── STATE VARIABLES ────────────────────────────────────
    address public owner;
    uint8   public constant REQUIRED_SIGNATURES = 2;

    mapping(string  => Document)    public  documents;
    mapping(address => Role)        public  userRoles;
    mapping(string  => AuditEntry[]) private auditLogs;
    mapping(string  => address[])   private caseAccess;
    mapping(string  => address[])   private documentSignatures;
    mapping(string  => uint8)       public  signatureCount;
    mapping(string  => bool)        public  approvedDocuments;
    mapping(bytes32 => bytes32)     public  permissionCommitments; // ← NEW

    // ── EVENTS ─────────────────────────────────────────────
    event DocumentStored(
        string  indexed docId,
        string          caseId,
        string          ipfsCID,
        address indexed uploadedBy,
        uint256         timestamp
    );

    event DocumentAccessed(
        string  indexed docId,
        address indexed accessor,
        string          action,
        uint256         timestamp
    );

    event DocumentShared(
        string  indexed docId,
        address indexed sharedWith,
        address indexed sharedBy,
        uint256         timestamp
    );

    event DocumentRevoked(
        string  indexed docId,
        address indexed revokedBy,
        uint256         timestamp
    );

    event DocumentSigned(
        string  indexed docId,
        address indexed judge,
        uint256         timestamp,
        uint8           totalSignatures
    );

    event DocumentApproved(
        string  indexed docId,
        uint256         timestamp
    );

    event RoleAssigned(
        address indexed user,
        Role            role,
        uint256         timestamp
    );

    event DocumentAmended(
        string  indexed newDocId,
        string  indexed previousDocId,
        uint256         version,
        uint256         timestamp
    );

    event PermissionCommitted( // ← NEW
        string  indexed docId,
        address indexed grantedTo,
        bytes32         permissionHash,
        uint256         timestamp
    );

    // ── MODIFIERS ──────────────────────────────────────────
    modifier onlyAdmin() {
        require(
            userRoles[msg.sender] == Role.ADMIN || msg.sender == owner,
            "eVault: caller is not admin"
        );
        _;
    }

    modifier onlyLawyerOrJudge() {
        require(
            userRoles[msg.sender] == Role.LAWYER ||
            userRoles[msg.sender] == Role.JUDGE  ||
            userRoles[msg.sender] == Role.ADMIN  ||
            msg.sender == owner,
            "eVault: caller is not authorized (need LAWYER, JUDGE, or ADMIN)"
        );
        _;
    }

    modifier onlyJudgeOrAdmin() {
        require(
            userRoles[msg.sender] == Role.JUDGE ||
            userRoles[msg.sender] == Role.ADMIN ||
            msg.sender == owner,
            "eVault: caller is not a judge or admin"
        );
        _;
    }

    modifier documentExists(string memory docId) {
        require(
            bytes(documents[docId].ipfsCID).length > 0,
            "eVault: document not found"
        );
        _;
    }

    // ── CONSTRUCTOR ────────────────────────────────────────
    constructor() {
        owner = msg.sender;
        userRoles[msg.sender] = Role.ADMIN;
        emit RoleAssigned(msg.sender, Role.ADMIN, block.timestamp);
    }

    // ── INTERNAL: AUDIT LOGGER ─────────────────────────────
    function _logAudit(
        string memory docId,
        address       accessor,
        string memory action,
        string memory details
    ) internal {
        auditLogs[docId].push(AuditEntry({
            accessor:  accessor,
            action:    action,
            timestamp: block.timestamp,
            details:   details
        }));
        emit DocumentAccessed(docId, accessor, action, block.timestamp);
    }

    // ── STORE DOCUMENT ─────────────────────────────────────
    function storeDocument(
        string memory docId,
        string memory caseId,
        string memory ipfsCID,
        string memory docType
    ) external onlyLawyerOrJudge {
        require(bytes(docId).length > 0,                        "eVault: docId required");
        require(bytes(documents[docId].ipfsCID).length == 0,    "eVault: document already exists");

        documents[docId] = Document({
            caseId:        caseId,
            ipfsCID:       ipfsCID,
            docType:       docType,
            uploadedBy:    msg.sender,
            timestamp:     block.timestamp,
            version:       1,
            previousDocId: "",
            status:        DocStatus.ACTIVE
        });

        _logAudit(docId, msg.sender, "UPLOAD", "Document stored on blockchain");

        emit DocumentStored(docId, caseId, ipfsCID, msg.sender, block.timestamp);
    }

    // ── AMEND DOCUMENT (version control) ──────────────────
    function amendDocument(
        string memory newDocId,
        string memory previousDocId,
        string memory newCID,
        string memory docType
    ) external onlyLawyerOrJudge documentExists(previousDocId) {
        require(
            bytes(documents[newDocId].ipfsCID).length == 0,
            "eVault: new docId already exists"
        );

        Document storage prev = documents[previousDocId];
        prev.status = DocStatus.ARCHIVED;

        uint256 newVersion = prev.version + 1;

        documents[newDocId] = Document({
            caseId:        prev.caseId,
            ipfsCID:       newCID,
            docType:       docType,
            uploadedBy:    msg.sender,
            timestamp:     block.timestamp,
            version:       newVersion,
            previousDocId: previousDocId,
            status:        DocStatus.ACTIVE
        });

        _logAudit(newDocId,      msg.sender, "AMEND", string(abi.encodePacked("Amended from ", previousDocId)));
        _logAudit(previousDocId, msg.sender, "AMEND", string(abi.encodePacked("Superseded by ", newDocId)));

        emit DocumentAmended(newDocId, previousDocId, newVersion, block.timestamp);
    }

    // ── VERIFY DOCUMENT ────────────────────────────────────
    function verifyDocument(
        string memory docId,
        string memory cidToVerify
    ) external documentExists(docId) returns (bool) {
        bool isValid = keccak256(bytes(documents[docId].ipfsCID))
            == keccak256(bytes(cidToVerify));

        _logAudit(
            docId,
            msg.sender,
            "VERIFY",
            isValid
                ? "Document verified - untampered"
                : "Document verification FAILED - tampered"
        );

        return isValid;
    }

    // ── SHARE DOCUMENT ─────────────────────────────────────
    function shareDocument(
        string  memory docId,
        address        withAddress
    ) external onlyLawyerOrJudge documentExists(docId) {
        require(withAddress != address(0), "eVault: invalid address");

        caseAccess[documents[docId].caseId].push(withAddress);

        _logAudit(
            docId,
            msg.sender,
            "SHARE",
            string(abi.encodePacked("Shared with ", _addressToString(withAddress)))
        );

        emit DocumentShared(docId, withAddress, msg.sender, block.timestamp);
    }

    // ── REVOKE DOCUMENT ────────────────────────────────────
    function revokeDocument(
        string memory docId
    ) external onlyJudgeOrAdmin documentExists(docId) {
        require(
            documents[docId].status != DocStatus.REVOKED,
            "eVault: document already revoked" // ← FIX
        );

        documents[docId].status = DocStatus.REVOKED;

        _logAudit(docId, msg.sender, "REVOKE", "Document access revoked");

        emit DocumentRevoked(docId, msg.sender, block.timestamp);
    }

    // ── SIGN DOCUMENT (multi-sig) ──────────────────────────
    function signDocument(
        string memory docId
    ) external onlyJudgeOrAdmin documentExists(docId) {
        require(
            documents[docId].status == DocStatus.ACTIVE,
            "eVault: document is not active" // ← FIX
        );

        address[] storage sigs = documentSignatures[docId];

        for (uint256 i = 0; i < sigs.length; i++) {
            require(sigs[i] != msg.sender, "eVault: already signed this document");
        }

        sigs.push(msg.sender);
        signatureCount[docId] = uint8(sigs.length);

        _logAudit(docId, msg.sender, "SIGN", "Judge signature added");

        emit DocumentSigned(docId, msg.sender, block.timestamp, signatureCount[docId]);

        if (signatureCount[docId] >= REQUIRED_SIGNATURES) {
            approvedDocuments[docId] = true;
            emit DocumentApproved(docId, block.timestamp);
        }
    }

    // ── COMMIT PERMISSION ──────────────────────────────────  ← NEW FEATURE
    /**
     * @dev Commit a permission hash for a given document + address pair
     * Only LAWYER, JUDGE, ADMIN can call this
     * Document must exist and must not be revoked (implicit via ACTIVE check omitted here —
     * add if you want to block committing permissions on revoked docs)
     */
    function commitPermission(
        string  memory docId,
        address        grantedTo,
        bytes32        permissionHash
    ) external onlyLawyerOrJudge documentExists(docId) {
        require(grantedTo != address(0),      "eVault: invalid address");
        require(permissionHash != bytes32(0), "eVault: permissionHash required");

        bytes32 key = keccak256(abi.encodePacked(docId, grantedTo));
        permissionCommitments[key] = permissionHash;

        emit PermissionCommitted(
            docId,
            grantedTo,
            permissionHash,
            block.timestamp
        );
    }

    // ── VERIFY PERMISSION ──────────────────────────────────  ← NEW FEATURE
    function verifyPermission(
        string  memory docId,
        address        grantedTo,
        bytes32        candidateHash
    ) external view returns (bool) {
        if (candidateHash == bytes32(0)) return false; // ← FIX: zero-hash false positive

        bytes32 key = keccak256(abi.encodePacked(docId, grantedTo));
        return permissionCommitments[key] == candidateHash;
    }

    // ── ASSIGN ROLE ────────────────────────────────────────
    function assignRole(address user, Role role) external onlyAdmin {
        require(user != address(0), "eVault: invalid address");
        userRoles[user] = role;
        emit RoleAssigned(user, role, block.timestamp);
    }

    // ── VIEW FUNCTIONS (free — no gas cost) ───────────────

    function getDocument(string memory docId)
    external
    view
    documentExists(docId)
    returns (Document memory)
    {
        return documents[docId];
    }

    function getAuditLog(string memory docId)
    external
    view
    returns (AuditEntry[] memory)
    {
        return auditLogs[docId];
    }

    function getRole(address user)
    external
    view
    returns (Role)
    {
        return userRoles[user];
    }

    function getSignatureCount(string memory docId)
    external
    view
    returns (uint8)
    {
        return signatureCount[docId];
    }

    function isApproved(string memory docId)
    external
    view
    returns (bool)
    {
        return approvedDocuments[docId];
    }

    function getCaseAccess(string memory caseId)
    external
    view
    returns (address[] memory)
    {
        return caseAccess[caseId];
    }

    // ── INTERNAL HELPERS ───────────────────────────────────
    function _addressToString(address addr)
    internal
    pure
    returns (string memory)
    {
        bytes memory data     = abi.encodePacked(addr);
        bytes memory alphabet = "0123456789abcdef";
        bytes memory str      = new bytes(2 + data.length * 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < data.length; i++) {
            str[2 + i * 2] = alphabet[uint8(data[i] >> 4)];
            str[3 + i * 2] = alphabet[uint8(data[i] & 0x0f)];
        }
        return string(str);
    }
}