const STATUS_MAP = {
  ACTIVE: "badge-green",
  ARCHIVED: "badge-gray",
  REVOKED: "badge-red",
  UNTAMPERED: "badge-green",
  TAMPERED: "badge-red",
  NONE: "badge-gray",
  CLIENT: "badge-blue",
  LAWYER: "badge-gold",
  JUDGE: "badge-purple",
  ADMIN: "badge-red",
};

export default function StatusBadge({ status }) {
  const cls = STATUS_MAP[status] || "badge-gray";
  return <span className={`badge ${cls}`}>{status}</span>;
}
