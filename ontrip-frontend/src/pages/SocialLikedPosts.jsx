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

function PostCard({ post }) {
  return (
    <article className="socialCard socialPostCard">
      <div className="socialPostHeader">
        <div className="socialPostAuthor">
          {post.author?.avatar ? (
            <img src={post.author.avatar} alt={post.author.name} className="socialProfileAvatar" />
          ) : (
            <div className="socialProfileAvatarFallback">
              {getInitial(post.author?.name)}
            </div>
          )}

          <div className="socialPostAuthorText">
            <div className="socialPostAuthorTop">
              <strong>{post.author?.name || "User"}</strong>
              {post.author?.username ? (
                <Link to={`/social/profile/${post.author.username}`} className="socialInlineLink">
                  @{post.author.username}
                </Link>
              ) : null}
            </div>
            <div className="socialPostMeta">
              <span>{formatTime(post.createdAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {post.text ? <div className="socialPostText">{post.text}</div> : null}

      {post.media?.length ? (
        <div className={`socialMediaGrid ${post.media.length === 1 ? "single" : "double"}`}>
          {post.media.map((item, index) =>
            item.type === "video" ? (
              <video key={`${item.url}-${index}`} controls className="socialMediaItem">
                <source src={item.url} />
              </video>
            ) : (
              <img key={`${item.url}-${index}`} src={item.url} alt="liked media" className="socialMediaItem" />
            )
          )}
        </div>
      ) : null}

      <div className="socialActionBar">
        <div className="socialActionStatic">❤️ {post.likesCount}</div>
        <div className="socialActionStatic">💬 {post.commentsCount}</div>
        <div className="socialActionStatic">🔖 {post.bookmarksCount || 0}</div>
      </div>
    </article>
  );
}

export default function SocialLikedPosts() {
  const navigate = useNavigate();
  const me = getUser();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
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

        const [profileRes, postsRes] = await Promise.all([
          apiFetch("/api/social/profile/me"),
          apiFetch("/api/social/posts/liked/me"),
        ]);

        setProfile(profileRes.profile || null);
        setPosts(postsRes.posts || []);
      } catch (err) {
        setError(err.message || "Failed to load liked posts.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [navigate, me?.id]);

  return (
    <div className="container socialPage">
      {error ? <div className="socialAlert">{error}</div> : null}

      <div className="socialLayout">
        <Sidebar profile={profile} />

        <main className="socialMain">
          <div className="socialCard socialSectionHeaderCard">
            <h1>Liked Posts</h1>
            <p>Posts you have liked across the platform.</p>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading liked posts..." />
          ) : posts.length === 0 ? (
            <div className="socialCard socialEmptyState">No liked posts yet.</div>
          ) : (
            <div className="socialFeedList">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </main>

        <aside className="socialRightBar">
          <div className="socialCard socialTipsCard">
            <h3>Liked Feed</h3>
            <div className="socialTipsList">
              <div>Track the posts you found useful.</div>
              <div>Revisit popular ideas anytime.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}