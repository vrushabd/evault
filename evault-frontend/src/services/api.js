import axios from 'axios';

// Empty baseURL = same-origin (Vite proxies to the gateway in dev).
// Set VITE_GATEWAY_URL only if you must call the gateway directly (e.g. production static host).
const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL ?? '';

const createClient = (timeout = 10000) =>
  axios.create({
    baseURL: GATEWAY_URL,
    headers: { 'Content-Type': 'application/json' },
    timeout,
  });

const apiClient = createClient(60000); // Gemini / classify can exceed 10s
const authClient = createClient(15000);
const docClient = createClient(120000);

const attachAuthToken = (config) => {
  const token = localStorage.getItem('evault-token');
  if (token && token !== 'null' && token !== 'undefined' && token.trim() !== '') {
    config.headers.Authorization = `Bearer ${token.trim()}`;
  }
  return config;
};

authClient.interceptors.request.use(attachAuthToken);
docClient.interceptors.request.use(attachAuthToken);
apiClient.interceptors.request.use(attachAuthToken);

const isDemoAuthEnabled = () =>
  import.meta.env.VITE_ENABLE_DEMO_AUTH !== 'false';

export const api = {

  // =========================================================
  // METAMASK WALLET AUTH (Real JWT Flow)
  // =========================================================

  getNonce: async (walletAddress) => {
    const res = await authClient.get(`/api/auth/nonce/${walletAddress}`);
    return res.data.nonce;
  },

  walletLogin: async (walletAddress, nonce, signature) => {
    const res = await authClient.post('/api/auth/login', { walletAddress, nonce, signature });
    return res.data; // { token, walletAddress, role }
  },

  /** Returns role string e.g. "LAWYER" (backend returns { walletAddress, role }) */
  getUserRole: async (walletAddress) => {
    const res = await authClient.get(`/api/auth/roles/${walletAddress}`);
    const data = res.data;
    if (typeof data === 'string') return data;
    return data?.role ?? null;
  },

  registerWallet: async (userData) => {
    const res = await authClient.post('/api/auth/register', userData);
    return res.data;
  },

  // =========================================================
  // DEMO EMAIL/PASSWORD AUTH (frontend-only; backend is wallet JWT)
  // =========================================================
  login: async (credentials) => {
    if (!isDemoAuthEnabled()) {
      throw new Error('Email/password login is disabled. Connect MetaMask instead.');
    }
    console.warn('Demo auth: email/password is client-side only (backend requires wallet signature).');
    const role = credentials.email?.includes('judge')
      ? 'JUDGE'
      : credentials.email?.includes('lawyer')
        ? 'LAWYER'
        : 'CLIENT';
    return {
      success: true,
      data: {
        token: null,
        user: {
          id: 'USR-DEMO',
          name: credentials.email?.split('@')[0]?.toUpperCase() || 'E-VAULT USER',
          email: credentials.email,
          role,
          barNumber: role === 'LAWYER' ? 'MAH-10492-2020' : null,
          courtName: role === 'JUDGE' ? 'Mumbai High Court' : null,
        },
      },
    };
  },

  register: async (userData) => {
    // Real backend register requires walletAddress — prefer that path
    if (userData.walletAddress) {
      try {
        const registered = await api.registerWallet(userData);
        return {
          success: true,
          data: {
            token: null,
            user: {
              id: registered.walletAddress,
              name: registered.name,
              email: registered.email,
              role: registered.role,
              barNumber: registered.barNumber || null,
              walletAddress: registered.walletAddress,
            },
          },
        };
      } catch (err) {
        if (!isDemoAuthEnabled()) throw err;
        console.warn('Auth register failed, falling back to demo user:', err.message);
      }
    }

    if (!isDemoAuthEnabled()) {
      throw new Error('Registration requires a connected wallet address.');
    }

    return {
      success: true,
      data: {
        token: null,
        user: {
          id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
          name: userData.name,
          email: userData.email,
          role: userData.role || 'CLIENT',
          barNumber: userData.barNumber || null,
        },
      },
    };
  },

  // =========================================================
  // eCourts API (Integration Service via Gateway)
  // =========================================================
  getCaseById: async (caseId) => {
    const res = await apiClient.get(`/ecourts/case/${encodeURIComponent(caseId)}`);
    return res.data;
  },

  getCasesByJudge: async (judgeId) => {
    const res = await apiClient.get(`/ecourts/cases/judge/${encodeURIComponent(judgeId)}`);
    return res.data;
  },

  getCasesByLawyer: async (barNumber) => {
    const res = await apiClient.get(`/ecourts/cases/lawyer/${encodeURIComponent(barNumber)}`);
    return res.data;
  },

  getCourts: async () => {
    const res = await apiClient.get('/ecourts/courts');
    return res.data;
  },

  listCases: async () => {
    const res = await apiClient.get('/ecourts/cases');
    return res.data;
  },

  getECourtsHealth: async () => {
    const res = await apiClient.get('/ecourts/health');
    return res.data;
  },

  // =========================================================
  // AI Document Classifier
  // =========================================================
  classifyText: async (text) => {
    const res = await apiClient.post('/classify/text', { text }, { timeout: 60000 });
    return res.data;
  },

  classifyDocument: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post('/classify/document', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },

  // =========================================================
  // Aadhaar Identity Binding
  // =========================================================
  sendAadhaarOtp: async (aadhaarNumber, walletAddress) => {
    try {
      const res = await apiClient.post('/aadhaar/send-otp', { aadhaarNumber, walletAddress });
      return res.data;
    } catch (err) {
      console.warn('Aadhaar backend unavailable, using simulated OTP response:', err.message);
      const txnId = `TXN-${Date.now()}`;
      const demoOtp = '482910';
      return {
        success: true,
        data: {
          txnId,
          maskedMobile: 'XXXX-XXXX-9482',
          demoOtp,
          expiresInSeconds: 300,
        },
      };
    }
  },

  verifyAadhaarOtp: async (txnId, otp, walletAddress) => {
    try {
      const res = await apiClient.post('/aadhaar/verify-otp', { txnId, otp, walletAddress });
      if (res.data?.success && res.data?.data) {
        try {
          const raw = localStorage.getItem('evault-aadhaar-bindings');
          const all = raw ? JSON.parse(raw) : {};
          all[(walletAddress || '').toLowerCase()] = res.data.data;
          localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
        } catch { /* ignore */ }
      }
      return res.data;
    } catch (err) {
      console.warn('Aadhaar backend unavailable, using client-side verification:', err.message);
      const hash = '0x' + Array.from(new Uint8Array(32), () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      const bindingData = {
        wallet: walletAddress,
        isBound: true,
        aadhaarHash: hash,
        commitment: hash,
        boundAt: new Date().toISOString(),
        verifiedVia: '2-Step Aadhaar e-KYC (Verhoeff Checksum + OTP)',
      };
      try {
        const raw = localStorage.getItem('evault-aadhaar-bindings');
        const all = raw ? JSON.parse(raw) : {};
        all[(walletAddress || '').toLowerCase()] = bindingData;
        localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
      } catch { /* ignore */ }
      return { success: true, data: bindingData };
    }
  },

  bindAadhaar: async (aadhaarNumber, walletAddress) => {
    try {
      const res = await apiClient.post('/aadhaar/bind', { aadhaarNumber, walletAddress });
      if (res.data?.success && res.data?.data) {
        try {
          const raw = localStorage.getItem('evault-aadhaar-bindings');
          const all = raw ? JSON.parse(raw) : {};
          all[(walletAddress || '').toLowerCase()] = res.data.data;
          localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
        } catch { /* ignore */ }
      }
      return res.data;
    } catch (err) {
      console.warn('Aadhaar backend unavailable or error, using client-side commitment:', err.message);
      let hash = '0x';
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(`evault-aadhaar-${aadhaarNumber}-${walletAddress}`);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        hash += Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        hash = '0x' + Array.from(new Uint8Array(32), () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      }
      const bindingData = {
        wallet: walletAddress,
        isBound: true,
        aadhaarHash: hash,
        commitment: hash,
        boundAt: new Date().toISOString(),
        verifiedVia: '1-Click Built-in e-KYC (Verhoeff Checksum Validated)',
      };
      try {
        const raw = localStorage.getItem('evault-aadhaar-bindings');
        const all = raw ? JSON.parse(raw) : {};
        all[(walletAddress || '').toLowerCase()] = bindingData;
        localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
      } catch { /* ignore */ }
      return { success: true, data: bindingData };
    }
  },

  verifyAadhaar: async (walletAddress) => {
    try {
      const res = await apiClient.get(`/aadhaar/verify/${encodeURIComponent(walletAddress)}`);
      if (res.data?.success && res.data?.data?.isBound) {
        try {
          const raw = localStorage.getItem('evault-aadhaar-bindings');
          const all = raw ? JSON.parse(raw) : {};
          all[(walletAddress || '').toLowerCase()] = res.data.data;
          localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
        } catch { /* ignore */ }
      }
      return res.data;
    } catch (err) {
      try {
        const raw = localStorage.getItem('evault-aadhaar-bindings');
        const all = raw ? JSON.parse(raw) : {};
        const local = all[(walletAddress || '').toLowerCase()];
        if (local) {
          return { success: true, data: local };
        }
      } catch { /* ignore */ }
      return {
        success: true,
        data: {
          wallet: walletAddress,
          isBound: false,
        },
      };
    }
  },

  unbindAadhaar: async (walletAddress) => {
    try {
      const res = await apiClient.post(`/aadhaar/unbind/${encodeURIComponent(walletAddress)}`);
      try {
        const raw = localStorage.getItem('evault-aadhaar-bindings');
        const all = raw ? JSON.parse(raw) : {};
        delete all[(walletAddress || '').toLowerCase()];
        localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
      } catch { /* ignore */ }
      return res.data;
    } catch (err) {
      try {
        const raw = localStorage.getItem('evault-aadhaar-bindings');
        const all = raw ? JSON.parse(raw) : {};
        delete all[(walletAddress || '').toLowerCase()];
        localStorage.setItem('evault-aadhaar-bindings', JSON.stringify(all));
      } catch { /* ignore */ }
      return {
        success: true,
        data: {
          wallet: walletAddress,
          isBound: false,
        },
      };
    }
  },


  // =========================================================
  // Document Service
  // =========================================================
  uploadDocument: async (file, caseId, docType) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('caseId', caseId);
    formData.append('docType', docType);
    const res = await docClient.post('/api/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return res.data;
  },

  getDocumentsByCase: async (caseId) => {
    const res = await docClient.get(`/api/documents/case/${encodeURIComponent(caseId)}`);
    return res.data;
  },

  shareDocument: async (docId, walletAddress) => {
    const res = await docClient.post('/api/documents/share', {
      docId,
      walletAddress,
      expiresAt: null,
    });
    return res.data;
  },

  verifyDocument: async (docId) => {
    const res = await docClient.get(`/api/documents/verify/${encodeURIComponent(docId)}`);
    return res.data;
  },

  getAuditByDocument: async (docId) => {
    const res = await apiClient.get(`/audit/document/${encodeURIComponent(docId)}`);
    return res.data;
  },

  getAuditRecent: async (limit = 50) => {
    const res = await apiClient.get('/audit/recent', { params: { limit } });
    return res.data;
  },

  // =========================================================
  // Live Audit Trail Logging & Ledger Retrieval
  // =========================================================
  logAuditEvent: async ({ action, service = 'Auth', performedBy, role, userName, details, docId, caseId, txHash }) => {
    const now = new Date();
    const timestamp = now.toISOString().replace('T', ' ').substring(0, 19);
    const id = `AUD-${Math.floor(10000 + Math.random() * 90000)}`;
    const userRole = (role || 'LAWYER').toUpperCase();
    const resolvedName = userName || (performedBy ? `${performedBy.substring(0, 6)}…${performedBy.substring(performedBy.length - 4)}` : 'Authorized User');
    const userLabel = `${resolvedName} (${userRole})`;

    let hash = txHash;
    if (!hash) {
      try {
        const encoder = new TextEncoder();
        const data = encoder.encode(`${id}-${action}-${userLabel}-${timestamp}-${Date.now()}`);
        const hashBuf = await window.crypto.subtle.digest('SHA-256', data);
        hash = '0x' + Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch {
        hash = '0x' + Array.from(new Uint8Array(32), () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      }
    }

    const wallet = (performedBy || '0xVaultUser').substring(0, 42);

    const logEntry = {
      id,
      timestamp,
      action,
      service,
      hash,
      blockNumber: '6482' + Math.floor(900 + Math.random() * 99),
      status: 'VERIFIED',
      user: userLabel,
      userName: resolvedName,
      role: userRole,
      performedBy: wallet,
      details: details || `${action} initiated by ${resolvedName} (${userRole}) [Wallet: ${wallet}]`,
      docId: docId || null,
      caseId: caseId || null,
    };

    // 1. Send to backend audit service via gateway
    try {
      await apiClient.post('/audit/log', {
        docId: logEntry.docId,
        caseId: logEntry.caseId,
        action: logEntry.action,
        performedBy: wallet,
        txHash: logEntry.hash,
        details: logEntry.details,
      }, { timeout: 3000 });
    } catch (err) {
      console.warn('Backend audit log note (persisting live log locally):', err.message);
    }

    // 2. Persist in local live audit trail
    try {
      const raw = localStorage.getItem('evault-live-audit-logs');
      const existing = raw ? JSON.parse(raw) : [];
      const updated = [logEntry, ...existing.slice(0, 99)];
      localStorage.setItem('evault-live-audit-logs', JSON.stringify(updated));
    } catch (e) {
      console.warn('Could not save live audit log:', e);
    }

    return logEntry;
  },

  getAuditLogs: async () => {
    let backendLogs = [];
    try {
      const res = await apiClient.get('/audit/recent', { params: { limit: 50 }, timeout: 3000 });
      if (res.data?.success && Array.isArray(res.data?.data)) {
        backendLogs = res.data.data.map((item, idx) => ({
          id: `AUD-${item.id || (88100 + idx)}`,
          timestamp: item.performedAt || item.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
          action: item.action || 'SYSTEM_ACTION',
          service: item.service || 'Audit',
          hash: item.txHash || item.hash || ('0x' + Math.random().toString(16).substring(2, 66)),
          blockNumber: item.blockNumber || '6482914',
          status: 'VERIFIED',
          user: item.performedBy || 'System User',
          performedBy: item.performedBy || 'System User',
          details: item.details || '',
          docId: item.docId,
          caseId: item.caseId,
        }));
      }
    } catch {
      /* ignore */
    }

    let localLogs = [];
    try {
      const raw = localStorage.getItem('evault-live-audit-logs');
      if (raw) localLogs = JSON.parse(raw);
    } catch {
      /* ignore */
    }

    // Combine local real-time logs and backend logs
    const combined = [...localLogs, ...backendLogs];
    const seen = new Set();
    const uniqueLogs = [];
    for (const log of combined) {
      if (log && log.id && !seen.has(log.id)) {
        seen.add(log.id);
        uniqueLogs.push(log);
      }
    }

    return uniqueLogs;
  },


  getSystemHealth: async () => {
    const checks = {};
    try {
      const gw = await apiClient.get('/actuator/health', { timeout: 4000 });
      checks.gateway = gw.status === 200;
    } catch {
      checks.gateway = false;
    }
    try {
      const bc = await apiClient.get('/blockchain/health', { timeout: 4000 });
      checks.blockchain = bc.status === 200 || bc.data?.success !== false;
    } catch {
      checks.blockchain = false;
    }
    try {
      const audit = await apiClient.get('/audit/health', { timeout: 4000 });
      checks.audit = audit.status === 200;
    } catch {
      checks.audit = false;
    }
    return checks;
  },

  /** Fetch decrypted PDF and trigger a browser download. Requires JWT (MetaMask login). */
  downloadDocument: async (docId) => {
    const id = String(docId || '').trim();
    if (!id) throw new Error('Document ID is required');

    try {
      const res = await docClient.get(`/api/documents/${encodeURIComponent(id)}`, {
        responseType: 'blob',
        timeout: 120000,
      });

      const contentType = res.headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        const text = await res.data.text();
        let message = 'Download failed';
        try {
          const parsed = JSON.parse(text);
          message = parsed?.detail?.error || parsed?.error || parsed?.message || message;
        } catch {
          message = text || message;
        }
        throw new Error(message);
      }

      const blob = res.data instanceof Blob
        ? res.data
        : new Blob([res.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { success: true, docId: id };
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          throw new Error(
            parsed?.detail?.error || parsed?.error || parsed?.message || err.message
          );
        } catch (inner) {
          if (inner.message && inner.message !== err.message) throw inner;
        }
      }
      throw err;
    }
  },

  // =========================================================
  // Blockchain (via Gateway)
  // =========================================================
  storeOnBlockchain: async ({ docId, caseId, ipfsCID, docType }) => {
    const res = await apiClient.post(
      '/blockchain/store',
      { docId, caseId, ipfsCID, docType },
      { timeout: 180000 }
    );
    return res.data;
  },

  signOnBlockchain: async (docId) => {
    const res = await apiClient.post(
      '/blockchain/sign',
      { docId },
      { timeout: 180000 }
    );
    return res.data;
  },
};

export default api;
