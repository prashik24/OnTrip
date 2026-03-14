import "./LoadingSpinner.css";

export default function LoadingSpinner({ text = "Loading..." }) {
  return (
    <div className="loadingWrap">
      <div className="loadingSpinner" />
      <div className="loadingText">{text}</div>
    </div>
  );
}