import "./CommunitySidebar.css";

const ICONS = {
  user: "https://img.icons8.com/?size=100&id=7819&format=png&color=000000",
  home: "https://img.icons8.com/?size=100&id=2797&format=png&color=000000",
  bell: "https://img.icons8.com/?size=100&id=84025&format=png&color=000000",
  bookmark: "https://img.icons8.com/?size=100&id=82461&format=png&color=000000",
  like: "https://img.icons8.com/?size=100&id=33479&format=png&color=000000",
};

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function getUsername(me) {
  const raw =
    me?.username ||
    me?.email?.split("@")?.[0] ||
    String(me?.name || "user").replace(/\s+/g, "").toLowerCase();

  return `@${raw}`;
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
              <img src={me.avatar} alt="" className="communitySidebarAvatar" />
            ) : (
              <div className="communitySidebarAvatarFallback">
                {getInitial(me?.name)}
              </div>
            )}

            <div className="communitySidebarProfileInfo">
              <h3>{me?.name}</h3>
              <p>{getUsername(me)}</p>
            </div>
          </div>

          <div className="communitySidebarStats">
            <span>
              <strong>{profileStats?.postsCount || 0}</strong> Posts
            </span>
            <span>
              <strong>{profileStats?.followingCount || 0}</strong> Following
            </span>
            <span>
              <strong>{profileStats?.followersCount || 0}</strong> Followers
            </span>
          </div>
        </div>

        <div className="communitySidebarMenu">
          <button
            type="button"
            className={`communitySidebarLink ${activeView === "profile" ? "active" : ""}`}
            onClick={() => onChangeView("profile")}
          >
            <img src={ICONS.user} alt="" className="communitySidebarIcon" />
            <span>My Profile</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "home" ? "active" : ""}`}
            onClick={() => onChangeView("home")}
          >
            <img src={ICONS.home} alt="" className="communitySidebarIcon" />
            <span>Home</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "bookmarks" ? "active" : ""}`}
            onClick={() => onChangeView("bookmarks")}
          >
            <img src={ICONS.bookmark} alt="" className="communitySidebarIcon" />
            <span>Bookmarks</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "likes" ? "active" : ""}`}
            onClick={() => onChangeView("likes")}
          >
            <img src={ICONS.like} alt="" className="communitySidebarIcon" />
            <span>Liked Posts</span>
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${
              activeView === "notifications" ? "active" : ""
            }`}
            onClick={() => onChangeView("notifications")}
          >
            <img src={ICONS.bell} alt="" className="communitySidebarIcon" />
            <span>Notifications</span>

            {unreadNotificationsCount > 0 ? (
              <span className="communitySidebarBadge">
                {unreadNotificationsCount > 99 ? "99+" : unreadNotificationsCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}