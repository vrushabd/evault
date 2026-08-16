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
  if (token) config.headers.Authorization = `Bearer ${token}`;
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
  bindAadhaar: async (aadhaarNumber, walletAddress) => {
    const res = await apiClient.post('/aadhaar/bind', { aadhaarNumber, walletAddress });
    return res.data;
  },

  verifyAadhaar: async (walletAddress) => {
    const res = await apiClient.get(`/aadhaar/verify/${encodeURIComponent(walletAddress)}`);
    return res.data;
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
