import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_BLOCKCHAIN_API_URL || "http://localhost:8083/blockchain",
  timeout: 120000,
});

const activityListeners = [];

export function onApiActivity(listener) {
  activityListeners.push(listener);
  return () => {
    const idx = activityListeners.indexOf(listener);
    if (idx >= 0) activityListeners.splice(idx, 1);
  };
}

function logActivity(method, endpoint) {
  const entry = { method, endpoint, timestamp: new Date().toISOString() };
  activityListeners.forEach((fn) => fn(entry));
  const stored = JSON.parse(localStorage.getItem("evault_activity") || "[]");
  stored.unshift(entry);
  localStorage.setItem("evault_activity", JSON.stringify(stored.slice(0, 50)));
}

api.interceptors.request.use((config) => {
  const method = (config.method || "get").toUpperCase();
  const endpoint = config.url || "";
  logActivity(method, endpoint);
  return config;
});

export const getHealth = () => api.get("/health");
export const storeDocument = (body) => api.post("/store", body);
export const amendDocument = (body) => api.post("/amend", body);
export const verifyDocument = (docId, cid) => api.get(`/verify/${docId}`, { params: { cid } });
export const getDocument = (docId) => api.get(`/document/${docId}`);
export const shareDocument = (body) => api.post("/share", body);
export const revokeDocument = (body) => api.post("/revoke", body);
export const signDocument = (body) => api.post("/sign", body);
export const assignRole = (body) => api.post("/roles/assign", body);
export const getRole = (wallet) => api.get(`/roles/${wallet}`);
export const getAuditLog = (docId) => api.get(`/audit/${docId}`);
export const getSignatures = (docId) => api.get(`/signatures/${docId}`);

export function getStoredActivity() {
  return JSON.parse(localStorage.getItem("evault_activity") || "[]");
}

export default api;
