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
        <div className="communitySidebarTop">
          <div className="communitySidebarProfileRow">
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

            <div className="communitySidebarProfileInfo">
              <h3>{me?.name || "User"}</h3>
              <p>@{String(me?.name || "user").replace(/\s+/g, "").toLowerCase()}</p>
            </div>
          </div>

          <div className="communitySidebarStats">
            <span>
              <strong>{profileStats?.followingCount || 0}</strong> Following
            </span>
            <span>
              <strong>{profileStats?.followersCount || 0}</strong> Followers
            </span>
          </div>
        </div>

        <div className="communitySidebarDivider" />

        <div className="communitySidebarMenu">
          <button
            type="button"
            className={`communitySidebarLink ${activeView === "profile" ? "active" : ""}`}
            onClick={() => onChangeView("profile")}
          >
            <span className="communitySidebarIcon" aria-hidden="true">
              https://img.icons8.com/?size=100&id=7819&format=png&color=000000
            </span>
            <span className="communitySidebarText">My Profile</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "home" ? "active" : ""}`}
            onClick={() => onChangeView("home")}
          >
            <span className="communitySidebarIcon" aria-hidden="true">
              🏠︎
            </span>
            <span className="communitySidebarText">Home</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "bookmarks" ? "active" : ""}`}
            onClick={() => onChangeView("bookmarks")}
          >
            <span className="communitySidebarIcon" aria-hidden="true">
              ⛉
            </span>
            <span className="communitySidebarText">Bookmarks</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "likes" ? "active" : ""}`}
            onClick={() => onChangeView("likes")}
          >
            <span className="communitySidebarIcon" aria-hidden="true">
              ❤︎
            </span>
            <span className="communitySidebarText">Liked Posts</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${
              activeView === "notifications" ? "active" : ""
            }`}
            onClick={() => onChangeView("notifications")}
          >
            <span className="communitySidebarIcon" aria-hidden="true">
              🕭
            </span>
            <span className="communitySidebarText">Notifications</span>

            {unreadNotificationsCount > 0 ? (
              <span className="communitySidebarBadge">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            ) : null}
          </button>
        </div>

        <div className="communitySidebarBottom">
          <div className="communitySidebarMiniCard">
            <div className="communitySidebarMiniLabel">Posts</div>
            <div className="communitySidebarMiniValue">
              {profileStats?.postsCount || 0}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}