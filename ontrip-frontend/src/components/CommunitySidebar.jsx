import { Link } from "react-router-dom";
import "./CommunitySidebar.css";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

export default function CommunitySidebar({
  me,
  profileStats,
  activeView,
  onChangeView,
}) {
  return (
    <aside className="communitySidebar">
      <div className="communitySidebarInner">
        <div className="communitySidebarCard communitySidebarUserCard">
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

          <div className="communitySidebarUserInfo">
            <h3>{me?.name || "User"}</h3>
            <p>{me?.city || "OnTrip"}</p>
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
        </div>

        <div className="communitySidebarCard communitySidebarMenuCard">
          <button
            type="button"
            className={`communitySidebarLink ${activeView === "home" ? "active" : ""}`}
            onClick={() => onChangeView("home")}
          >
            Home
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "profile" ? "active" : ""}`}
            onClick={() => onChangeView("profile")}
          >
            My Profile
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "bookmarks" ? "active" : ""}`}
            onClick={() => onChangeView("bookmarks")}
          >
            Bookmarks
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "likes" ? "active" : ""}`}
            onClick={() => onChangeView("likes")}
          >
            Liked Posts
          </button>

          <button
            type="button"
            className={`communitySidebarLink ${activeView === "notifications" ? "active" : ""}`}
            onClick={() => onChangeView("notifications")}
          >
            Notifications
          </button>
        </div>

        <div className="communitySidebarCard communitySidebarMiniCard">
          <div className="communitySidebarMiniTitle">Quick Tips</div>
          <div className="communitySidebarMiniList">
            <div>Use hashtags like #goa #budget #solo</div>
            <div>Tag people with @name in posts/comments</div>
            <div>Upload multiple images and videos</div>
            <div>Open any user profile by clicking their name</div>
          </div>
        </div>

        <div className="communitySidebarCard communitySidebarMiniCard">
          <div className="communitySidebarMiniTitle">Navigation</div>
          <div className="communitySidebarMiniList">
            <Link to="/community" className="communitySidebarMiniLink">
              Community Main
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}