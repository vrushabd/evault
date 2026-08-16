import { truncateHash } from "../utils/format";

export default function TxHashLink({ hash, label }) {
  if (!hash) return null;
  return (
    <a
      href={`https://sepolia.etherscan.io/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      title={hash}
    >
      {label || truncateHash(hash)}
    </a>
  );
}
