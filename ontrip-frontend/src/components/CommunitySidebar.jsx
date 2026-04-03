import "./CommunitySidebar.css";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

export default function CommunitySidebar({
  me,
  profileStats,
  activeView,
  unreadNotificationsCount,
  onChangeView,
}) {
  return (
    <aside className="communitySidebar">
      <div className="communitySidebarCard">
        <div className="communitySidebarHead">
          <h2>Community</h2>
          <p>Profile, posts and activity</p>
        </div>

        <div className="communitySidebarUserCard">
          <div className="communitySidebarAvatarWrap">
            {me?.avatar ? (
              <img
                src={me.avatar}
                alt={me.name || "User"}
                className="communitySidebarAvatar"
              />
            ) : (
              <div className="communitySidebarAvatarFallback">
                {getInitial(me?.name)}
              </div>
            )}
          </div>

          <div className="communitySidebarUserInfo">
            <h3>{me?.name || "User"}</h3>
            <p>{me?.city || "OnTrip"}</p>
          </div>
        </div>

        <div className="communitySidebarStats">
          <div className="communitySidebarStatBox">
            <strong>{profileStats?.postsCount || 0}</strong>
            <span>Posts</span>
          </div>

          <div className="communitySidebarStatBox">
            <strong>{profileStats?.followersCount || 0}</strong>
            <span>Followers</span>
          </div>

          <div className="communitySidebarStatBox">
            <strong>{profileStats?.followingCount || 0}</strong>
            <span>Following</span>
          </div>
        </div>

        <div className="communitySidebarMenu">
          <button
            type="button"
            className={`communitySidebarLink ${activeView === "home" ? "active" : ""}`}
            onClick={() => onChangeView("home")}
          >
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "profile" ? "active" : ""}`}
            onClick={() => onChangeView("profile")}
          >
            <span>My Profile</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "bookmarks" ? "active" : ""}`}
            onClick={() => onChangeView("bookmarks")}
          >
            <span>Bookmarks</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "likes" ? "active" : ""}`}
            onClick={() => onChangeView("likes")}
          >
            <span>Liked Posts</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${
              activeView === "notifications" ? "active" : ""
            }`}
            onClick={() => onChangeView("notifications")}
          >
            <span>Notifications</span>
            {unreadNotificationsCount > 0 ? (
              <span className="communitySidebarBadge">{unreadNotificationsCount}</span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}