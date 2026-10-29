import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SocialLayout.css";
import "./SocialHome.css";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationText(item) {
  const name = item.actor?.name || "Someone";
  if (item.type === "like_post") return `${name} liked your post`;
  if (item.type === "comment_post") return `${name} commented on your post`;
  if (item.type === "reply_comment") return `${name} replied to your comment`;
  if (item.type === "like_comment") return `${name} liked your comment`;
  if (item.type === "follow_user") return `${name} followed you`;
  return `${name} interacted with you`;
}

function Sidebar({ profile }) {
  const username = profile?.username || "";

  return (
    <aside className="socialSidebar">
      <div className="socialCard socialProfileSummaryCard">
        <div className="socialProfileSummaryTop">
          {profile?.profileImage ? (
            <img src={profile.profileImage} alt={profile.displayName} className="socialProfileAvatar large" />
          ) : (
            <div className="socialProfileAvatarFallback large">
              {getInitial(profile?.displayName || profile?.username)}
            </div>
          )}
          <div className="socialProfileSummaryText">
            <strong>{profile?.displayName || "Profile"}</strong>
            <span>@{username}</span>
          </div>
        </div>
      </div>

      <nav className="socialCard socialNavCard">
        <NavLink to="/community" className="socialNavItem">Home Feed</NavLink>
        <NavLink to="/social/posts/me" className="socialNavItem">My Posts</NavLink>
        <NavLink to="/social/bookmarks" className="socialNavItem">Bookmarks</NavLink>
        <NavLink to="/social/liked" className="socialNavItem">Liked Posts</NavLink>
        <NavLink to="/social/notifications" className="socialNavItem">Notifications</NavLink>
        <NavLink to="/social/create" className="socialNavItem">Create Post</NavLink>
        <NavLink to={`/social/profile/${username}`} className="socialNavItem">Profile</NavLink>
      </nav>
    </aside>
  );
}

export default function SocialNotifications() {
  const navigate = useNavigate();
  const me = getUser();

  const [profile, setProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        if (!isLoggedIn()) {
          navigate("/login");
          return;
        }

        setLoading(true);
        setError("");

        const [profileRes, notificationsRes] = await Promise.all([
          apiFetch("/api/social/profile/me"),
          apiFetch("/api/social/notifications"),
        ]);

        setProfile(profileRes.profile || null);
        setNotifications(notificationsRes.notifications || []);
      } catch (err) {
        setError(err.message || "Failed to load notifications.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate, me?.id]);

  async function markAllRead() {
    try {
      setMarking(true);
      await apiFetch("/api/social/notifications/read-all", {
        method: "POST",
      });

      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
    } catch (err) {
      setError(err.message || "Failed to mark notifications.");
    } finally {
      setMarking(false);
    }
  }

  return (
    <div className="container socialPage">
      {error ? <div className="socialAlert">{error}</div> : null}

      <div className="socialLayout">
        <Sidebar profile={profile} />

        <main className="socialMain">
          <div className="socialCard socialSectionHeaderCard">
            <div className="socialSectionHeaderSplit">
              <div>
                <h1>Notifications</h1>
                <p>Likes, comments, replies, and follow updates.</p>
              </div>

              <button type="button" className="socialPrimaryBtn" onClick={markAllRead} disabled={marking}>
                {marking ? "Updating..." : "Mark all read"}
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading notifications..." />
          ) : notifications.length === 0 ? (
            <div className="socialCard socialEmptyState">No notifications yet.</div>
          ) : (
            <div className="socialFeedList">
              {notifications.map((item) => (
                <div
                  key={item.id}
                  className={`socialCard socialNotificationCard ${item.isRead ? "" : "unread"}`}
                >
                  <div className="socialNotificationLeft">
                    {item.actor?.avatar ? (
                      <img
                        src={item.actor.avatar}
                        alt={item.actor.name}
                        className="socialProfileAvatar"
                      />
                    ) : (
                      <div className="socialProfileAvatarFallback">
                        {getInitial(item.actor?.name)}
                      </div>
                    )}
                  </div>

                  <div className="socialNotificationBody">
                    <div className="socialNotificationText">{getNotificationText(item)}</div>
                    <div className="socialNotificationMeta">{formatTime(item.createdAt)}</div>
                  </div>

                  <div className="socialNotificationRight">
                    {item.postId ? (
                      <Link to="/community" className="socialInlineLink">
                        Open
                      </Link>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        <aside className="socialRightBar">
          <div className="socialCard socialTipsCard">
            <h3>Stay Active</h3>
            <div className="socialTipsList">
              <div>Reply quickly to grow conversations.</div>
              <div>Follow users you like to stay updated.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}