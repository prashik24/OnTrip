import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Notifications.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      const res = await apiFetch("/api/community/me/notifications?page=1&limit=15");
      setNotifications(res.notifications || []);
      setPagination(res.pagination || { page: 1, hasMore: false });
      await apiFetch("/api/community/me/notifications/read", { method: "POST" });
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      const res = await apiFetch(
        `/api/community/me/notifications?page=${nextPage}&limit=15`
      );
      setNotifications((prev) => [...prev, ...(res.notifications || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more notifications.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container notificationsPage">
      <div className="notificationsHero">
        <h1>Notifications</h1>
        <p>Recent updates from your community activity.</p>
      </div>

      {error ? <div className="notificationsAlert">{error}</div> : null}

      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="notificationsEmpty">No notifications yet.</div>
      ) : (
        <div className="notificationsList">
          {notifications.map((item) => (
            <div className={`notificationsCard ${item.isRead ? "read" : "unread"}`} key={item.id}>
              <div className="notificationsCardLeft">
                {item.actor?.avatar ? (
                  <img
                    src={item.actor.avatar}
                    alt={item.actor.name}
                    className="notificationsAvatar"
                  />
                ) : (
                  <div className="notificationsAvatarFallback">
                    {item.actor?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="notificationsCardBody">
                <div className="notificationsText">{item.text}</div>
                <div className="notificationsMeta">
                  <span>{formatTime(item.createdAt)}</span>
                  {item.post ? (
                    <>
                      <span>•</span>
                      <Link to="/community">Open Feed</Link>
                    </>
                  ) : null}
                  {item.actor?.id ? (
                    <>
                      <span>•</span>
                      <Link to={`/community/profile/${item.actor.id}`}>View Profile</Link>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          ))}

          {pagination.hasMore ? (
            <button className="notificationsLoadBtn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}