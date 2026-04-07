import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderBroadcastHistory.css";

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getBroadcastImage(message = "", status = "") {
  const text = String(message || "").toLowerCase();
  const statusValue = String(status || "").toLowerCase();

  if (text.includes("goa")) return "/images/places/north-goa-hero.jpg";
  if (text.includes("mumbai")) return "/images/places/mumbai-hero.jpg";
  if (text.includes("pune")) return "/images/places/lonavala-hero.jpg";
  if (text.includes("nagpur")) return "/images/places/nashik-hero.jpg";
  if (text.includes("kerala")) return "/images/places/munnar-hero.jpg";
  if (text.includes("varanasi")) return "/images/places/varanasi-hero.jpg";
  if (text.includes("jaipur")) return "/images/places/jaipur-hero.jpg";
  if (text.includes("lucknow")) return "/images/places/lucknow-hero.jpg";
  if (text.includes("car")) return "/images/places/mumbai-hero.jpg";
  if (text.includes("bike")) return "/images/places/manali-hero.jpg";
  if (text.includes("bus")) return "/images/places/agra-hero.jpg";
  if (statusValue === "failed") return "/images/places/old-goa-hero.jpg";
  if (statusValue === "pending") return "/images/places/shimla-hero.jpg";
  return "/images/places/manali-hero.jpg";
}

export default function ProviderBroadcastHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setMsg("");

        const historyData = await apiFetch("/api/provider-broadcasts/my");
        const list = Array.isArray(historyData)
          ? historyData
          : historyData.broadcasts || [];

        setHistory(list);
      } catch (err) {
        setMsg(err.message || "Failed to load broadcast history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading broadcast history..." />;
  }

  return (
    <div className="providerBroadcastHistoryPage container">
      <div className="providerBroadcastHistoryHead">
        <h1>Provider Broadcast History</h1>
        <p>View all sent, pending, and failed broadcasts in one place.</p>
      </div>

      {msg ? <div className="providerBroadcastHistoryMessage">{msg}</div> : null}

      <div className="providerBroadcastHistoryTopBar">
        <button
          className="providerBroadcastHistoryTopBtn"
          type="button"
          onClick={() => navigate("/provider-broadcast")}
        >
          Back to Provider Broadcast
        </button>
      </div>

      {history.length === 0 ? (
        <div className="providerBroadcastHistoryEmpty">No broadcast history found yet.</div>
      ) : (
        <div className="providerBroadcastHistoryGrid">
          {history.map((item) => {
            const image = getBroadcastImage(item.message, item.status);
            const topClass =
              item.status === "failed"
                ? "failed"
                : item.status === "pending"
                ? "pending"
                : "sent";

            return (
              <div className="providerBroadcastHistoryCard" key={item._id}>
                <div className={`providerBroadcastHistoryCardTop ${topClass}`}>
                  <div className="providerBroadcastHistoryCardTopLeft">
                    <h3>{item.subject || "Broadcast"}</h3>
                    <p>Created: {formatDateTime(item.createdAt)}</p>
                  </div>

                  <div className="providerBroadcastHistoryCardTopRight">
                    <div className="providerBroadcastHistoryCount">
                      {item.recipientsCount || 0}
                    </div>
                    <div className="providerBroadcastHistoryTopStatuses">
                      <span className={`providerBroadcastHistoryStatusBadge top ${item.status || ""}`}>
                        {formatLabel(item.status || "-")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="providerBroadcastHistoryCardBody">
                  <div className="providerBroadcastHistoryPreview">
                    <div className="providerBroadcastHistoryImageWrap">
                      <img
                        src={image}
                        alt={item.subject || "Broadcast"}
                        className="providerBroadcastHistoryImage"
                      />
                    </div>

                    <div className="providerBroadcastHistoryPreviewMeta">
                      <span>Status: {formatLabel(item.status || "-")}</span>
                      <span>Recipients: {item.recipientsCount || 0}</span>
                      <span>Updated: {formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="providerBroadcastHistoryInfo">
                    <div>
                      <strong>Subject</strong>
                      <span>{item.subject || "-"}</span>
                    </div>

                    <div>
                      <strong>Status</strong>
                      <span>{formatLabel(item.status || "-")}</span>
                    </div>

                    <div>
                      <strong>Recipients</strong>
                      <span>{item.recipientsCount || 0}</span>
                    </div>

                    <div>
                      <strong>Created At</strong>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>

                    <div className="providerBroadcastHistoryInfoWide">
                      <strong>Broadcast Message</strong>
                      <span>{item.message || "-"}</span>
                    </div>
                  </div>

                  <div className="providerBroadcastHistoryActions">
                    <button
                      className="providerBroadcastHistoryBtn primary"
                      type="button"
                      onClick={() => navigate("/provider-broadcast")}
                    >
                      Send New Broadcast
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}