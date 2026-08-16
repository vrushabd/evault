export function truncateAddress(addr) {
  if (!addr || addr.length < 10) return addr || "—";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function truncateHash(hash) {
  if (!hash || hash.length < 14) return hash || "—";
  return `${hash.slice(0, 10)}...${hash.slice(-6)}`;
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text);
}
