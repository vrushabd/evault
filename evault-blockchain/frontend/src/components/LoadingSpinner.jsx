export default function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div className="loading-box">
      <div className="spinner" />
      <p>{message}</p>
    </div>
  );
}
