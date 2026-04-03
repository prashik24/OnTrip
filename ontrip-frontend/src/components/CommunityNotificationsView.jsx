import LoadingSpinner from "./LoadingSpinner";
import "./CommunityNotificationsView.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

export default function CommunityNotificationsView({
  notifications,
  pagination,
  loading,
  loadingMore,
  onLoadMore,
}) {
  return (
    <div className="communityNotificationsView">
      <div className="communityNotificationsHead">
        <h1>Notifications</h1>
        <p>Recent updates from your community activity.</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="communityNotificationsEmptyState">
          <div className="communityNotificationsEmptyIcon">📭</div>
          <h3>No notifications yet</h3>
          <p>When something new happens, it will appear here.</p>
        </div>
      ) : (
        <div className="communityNotificationsList">
          {notifications.map((item) => (
            <div
              className={`communityNotificationsCard ${item.isRead ? "read" : "unread"}`}
              key={item.id}
            >
              <div className="communityNotificationsLeft">
                {item.actor?.avatar ? (
                  <img
                    src={item.actor.avatar}
                    alt={item.actor?.name || "User"}
                    className="communityNotificationsAvatar"
                  />
                ) : (
                  <div className="communityNotificationsAvatarFallback">
                    {getInitial(item.actor?.name)}
                  </div>
                )}
              </div>

              <div className="communityNotificationsBody">
                <div className="communityNotificationsText">{item.text}</div>
                <div className="communityNotificationsMeta">
                  <span>{formatTime(item.createdAt)}</span>
                </div>
              </div>
            </div>
          ))}

          {pagination?.hasMore ? (
            <button
              type="button"
              className="communityNotificationsLoadMoreBtn"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}