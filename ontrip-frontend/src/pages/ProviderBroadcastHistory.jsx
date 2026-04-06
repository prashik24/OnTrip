import { useEffect, useMemo, useState } from "react";
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

export default function ProviderBroadcastHistory() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState([]);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setMsg("");

        const historyData = await apiFetch("/api/provider-broadcasts/my");
        const nextHistory = Array.isArray(historyData)
          ? historyData
          : historyData.broadcasts || [];

        setHistory(nextHistory);
      } catch (err) {
        setMsg(err.message || "Failed to load broadcast history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const stats = useMemo(() => {
    const total = history.length;
    const sent = history.filter((item) => item.status === "sent").length;
    const failed = history.filter((item) => item.status === "failed").length;
    const pending = history.filter((item) => item.status === "pending").length;
    const recipients = history.reduce(
      (sum, item) => sum + Number(item.recipientsCount || 0),
      0
    );

    return { total, sent, failed, pending, recipients };
  }, [history]);

  if (loading) {
    return <LoadingSpinner text="Loading broadcast history..." />;
  }

  return (
    <div className="providerBroadcastHistoryPage container">
      {msg ? (
        <div className="providerBroadcastHistoryMessage error">{msg}</div>
      ) : null}

      <section className="providerBroadcastHistoryHeroCard">
        <div className="providerBroadcastHistoryHeroImageWrap">
          <img
            src="/images/places/varanasi-hero.jpg"
            alt="Travel broadcast history"
            className="providerBroadcastHistoryHeroImage"
          />
          <div className="providerBroadcastHistoryHeroOverlay" />
        </div>

        <div className="providerBroadcastHistoryHeroContent">
          <div className="providerBroadcastHistoryBadge">OnTrip Provider Tools</div>
          <h1>Broadcast History</h1>
          <p>
            Review all past provider broadcasts, delivery status, recipient count,
            and update details in one clean page.
          </p>

          <div className="providerBroadcastHistoryHeroActions">
            <button
              className="providerBroadcastHistoryPrimaryBtn"
              type="button"
              onClick={() => navigate("/provider-broadcast")}
            >
              Back to Provider Broadcast
            </button>
          </div>
        </div>
      </section>

      <section className="providerBroadcastHistoryStatsWrap">
        <div className="providerBroadcastHistoryStatsGrid">
          <div className="providerBroadcastHistoryStatCard">
            <strong>Total Broadcasts</strong>
            <span>{stats.total}</span>
          </div>

          <div className="providerBroadcastHistoryStatCard">
            <strong>Sent</strong>
            <span>{stats.sent}</span>
          </div>

          <div className="providerBroadcastHistoryStatCard">
            <strong>Pending</strong>
            <span>{stats.pending}</span>
          </div>

          <div className="providerBroadcastHistoryStatCard">
            <strong>Failed</strong>
            <span>{stats.failed}</span>
          </div>

          <div className="providerBroadcastHistoryStatCard providerBroadcastHistoryStatWide">
            <strong>Total Recipients Reached</strong>
            <span>{stats.recipients}</span>
          </div>
        </div>
      </section>

      {history.length === 0 ? (
        <div className="providerBroadcastHistoryEmpty">
          No old broadcasts found yet.
        </div>
      ) : (
        <section className="providerBroadcastHistoryListWrap">
          <div className="providerBroadcastHistoryListHead">
            <h2>All Broadcast Records</h2>
            <p>Every provider update you sent is shown here.</p>
          </div>

          <div className="providerBroadcastHistoryList">
            {history.map((item) => (
              <article className="providerBroadcastHistoryCard" key={item._id}>
                <div className="providerBroadcastHistoryCardTop">
                  <div className="providerBroadcastHistoryCardMain">
                    <div className="providerBroadcastHistoryType">
                      Provider Broadcast
                    </div>
                    <h3>{item.subject || "-"}</h3>
                    <p>Sent on {formatDateTime(item.createdAt)}</p>
                  </div>

                  <div
                    className={`providerBroadcastHistoryStatus ${item.status || ""}`}
                  >
                    {formatLabel(item.status || "-")}
                  </div>
                </div>

                <div className="providerBroadcastHistoryBody">
                  {item.message || "-"}
                </div>

                <div className="providerBroadcastHistoryFooter">
                  <span>Recipients: {item.recipientsCount || 0}</span>
                  <span>Updated: {formatDateTime(item.updatedAt)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}