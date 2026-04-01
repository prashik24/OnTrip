import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SocialLayout.css";
import "./SocialHome.css";

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

function SocialSidebar({ profile }) {
  const username = profile?.username || "";

  return (
    <aside className="socialSidebar">
      <div className="socialCard socialProfileSummaryCard">
        <div className="socialProfileSummaryTop">
          {profile?.profileImage ? (
            <img
              src={profile.profileImage}
              alt={profile.displayName || profile.username}
              className="socialProfileAvatar large"
            />
          ) : (
            <div className="socialProfileAvatarFallback large">
              {getInitial(profile?.displayName || profile?.username)}
            </div>
          )}

          <div className="socialProfileSummaryText">
            <strong>{profile?.displayName || "Profile"}</strong>
            <span>@{username || "username"}</span>
            {profile?.location ? <p>{profile.location}</p> : null}
          </div>
        </div>

        <div className="socialStatsRow">
          <div className="socialStatBox">
            <strong>{profile?.followersCount || 0}</strong>
            <span>Followers</span>
          </div>
          <div className="socialStatBox">
            <strong>{profile?.followingCount || 0}</strong>
            <span>Following</span>
          </div>
          <div className="socialStatBox">
            <strong>{profile?.postsCount || 0}</strong>
            <span>Posts</span>
          </div>
        </div>
      </div>

      <nav className="socialCard socialNavCard">
        <NavLink to="/community" className="socialNavItem">
          Home Feed
        </NavLink>
        <NavLink to="/social/posts/me" className="socialNavItem">
          My Posts
        </NavLink>
        <NavLink to="/social/bookmarks" className="socialNavItem">
          Bookmarks
        </NavLink>
        <NavLink to="/social/liked" className="socialNavItem">
          Liked Posts
        </NavLink>
        <NavLink to="/social/notifications" className="socialNavItem">
          Notifications
        </NavLink>
        <NavLink to="/social/create" className="socialNavItem">
          Create Post
        </NavLink>
        <NavLink to={username ? `/social/profile/${username}` : "/social/profile/me"} className="socialNavItem">
          Profile
        </NavLink>
      </nav>
    </aside>
  );
}

function SimplePostCard({ post }) {
  return (
    <article className="socialCard socialPostCard">
      <div className="socialPostHeader">
        <div className="socialPostAuthor">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="socialProfileAvatar"
            />
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
              <span>{post.author?.city || "OnTrip"}</span>
              <span>•</span>
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
              <img key={`${item.url}-${index}`} src={item.url} alt="post media" className="socialMediaItem" />
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

export default function SocialProfile() {
  const me = getUser();
  const navigate = useNavigate();
  const { username = "me" } = useParams();

  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");

  const isOwnProfile =
    username === "me" || (profile?.userId && me?.id && String(profile.userId) === String(me.id));

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true);
        setError("");

        if (username === "me") {
          if (!isLoggedIn()) {
            navigate("/login");
            return;
          }

          const [profileRes, postsRes] = await Promise.all([
            apiFetch("/api/social/profile/me"),
            apiFetch("/api/social/posts/me"),
          ]);

          setProfile(profileRes.profile || null);
          setPosts(postsRes.posts || []);
          return;
        }

        const [profileRes, postsRes] = await Promise.all([
          apiFetch(`/api/social/profile/${username}`),
          apiFetch(`/api/social/posts/user/${username}`),
        ]);

        setProfile(profileRes.profile || null);
        setPosts(postsRes.posts || []);
      } catch (err) {
        setError(err.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate, username]);

  async function handleFollowToggle() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      setFollowLoading(true);
      const data = await apiFetch(`/api/social/profile/${profile.username}/follow`, {
        method: "POST",
      });

      setProfile(data.profile || profile);
    } catch (err) {
      setError(err.message || "Failed to update follow.");
    } finally {
      setFollowLoading(false);
    }
  }

  return (
    <div className="container socialPage">
      {error ? <div className="socialAlert">{error}</div> : null}

      <div className="socialLayout">
        <SocialSidebar profile={profile} />

        <main className="socialMain">
          {loading ? (
            <LoadingSpinner text="Loading profile..." />
          ) : !profile ? (
            <div className="socialCard socialEmptyState">Profile not found.</div>
          ) : (
            <>
              <div className="socialCard socialProfileHeroCard">
                {profile.coverImage ? (
                  <img
                    src={profile.coverImage}
                    alt="cover"
                    className="socialProfileCover"
                  />
                ) : (
                  <div className="socialProfileCover placeholder" />
                )}

                <div className="socialProfileHeroBody">
                  <div className="socialProfileHeroTop">
                    {profile.profileImage ? (
                      <img
                        src={profile.profileImage}
                        alt={profile.displayName || profile.username}
                        className="socialProfileAvatar xlarge"
                      />
                    ) : (
                      <div className="socialProfileAvatarFallback xlarge">
                        {getInitial(profile.displayName || profile.username)}
                      </div>
                    )}

                    <div className="socialProfileHeroActions">
                      {isOwnProfile ? (
                        <Link to="/social/create" className="socialPrimaryBtn socialBtnLink">
                          Create Post
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className={profile.isFollowing ? "socialGhostBtn" : "socialPrimaryBtn"}
                          onClick={handleFollowToggle}
                          disabled={followLoading}
                        >
                          {followLoading
                            ? "Please wait..."
                            : profile.isFollowing
                            ? "Unfollow"
                            : "Follow"}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="socialProfileHeroText">
                    <h1>{profile.displayName || profile.username}</h1>
                    <span>@{profile.username}</span>
                    {profile.bio ? <p>{profile.bio}</p> : null}
                    {profile.location ? (
                      <div className="socialProfileMetaLine">📍 {profile.location}</div>
                    ) : null}
                    {profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noreferrer"
                        className="socialInlineLink"
                      >
                        {profile.website}
                      </a>
                    ) : null}
                  </div>

                  <div className="socialStatsRow big">
                    <div className="socialStatBox">
                      <strong>{profile.followersCount}</strong>
                      <span>Followers</span>
                    </div>
                    <div className="socialStatBox">
                      <strong>{profile.followingCount}</strong>
                      <span>Following</span>
                    </div>
                    <div className="socialStatBox">
                      <strong>{profile.postsCount}</strong>
                      <span>Posts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="socialSectionTitleRow">
                <h2>{isOwnProfile ? "My Posts" : "Posts"}</h2>
              </div>

              {posts.length === 0 ? (
                <div className="socialCard socialEmptyState">No posts yet.</div>
              ) : (
                <div className="socialFeedList">
                  {posts.map((post) => (
                    <SimplePostCard key={post.id} post={post} />
                  ))}
                </div>
              )}
            </>
          )}
        </main>

        <aside className="socialRightBar">
          <div className="socialCard socialTipsCard">
            <h3>Profile Tips</h3>
            <div className="socialTipsList">
              <div>Use a clear bio and profile photo.</div>
              <div>Post regularly to grow followers.</div>
              <div>Reply to comments to stay active.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}