import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./CommunityProfile.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CommunityProfile() {
  const { userId } = useParams();
  const me = getUser();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadInitial();
  }, [userId]);

  async function loadInitial() {
    try {
      setLoading(true);
      setError("");

      const [profileRes, postsRes] = await Promise.all([
        apiFetch(`/api/community/profile/${userId}`),
        apiFetch(`/api/community/profile/${userId}/posts?page=1&limit=10`),
      ]);

      setProfile(profileRes.profile || null);
      setPosts(postsRes.posts || []);
      setPagination(postsRes.pagination || { page: 1, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load profile.");
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
        `/api/community/profile/${userId}/posts?page=${nextPage}&limit=10`
      );

      setPosts((prev) => [...prev, ...(res.posts || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function toggleFollow() {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/profile/${userId}/follow`, {
        method: "POST",
      });

      setProfile(res.profile || null);
    } catch (err) {
      setError(err.message || "Failed to update follow status.");
    }
  }

  async function likePost(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/${postId}/like`, {
        method: "POST",
      });

      setPosts((prev) => prev.map((item) => (item.id === postId ? res.post : item)));
    } catch (err) {
      setError(err.message || "Failed to update like.");
    }
  }

  if (loading) {
    return (
      <div className="container communityProfilePage">
        <LoadingSpinner text="Loading profile..." />
      </div>
    );
  }

  return (
    <div className="container communityProfilePage">
      {error ? <div className="communityProfileAlert">{error}</div> : null}

      <div className="communityProfileHero">
        <div className="communityProfileTop">
          {profile?.avatar ? (
            <img src={profile.avatar} alt={profile.name} className="communityProfileAvatar" />
          ) : (
            <div className="communityProfileAvatarFallback">
              {profile?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
          )}

          <div className="communityProfileInfo">
            <h1>{profile?.name || "Profile"}</h1>
            <p>{profile?.bio || "Traveler on OnTrip community"}</p>

            <div className="communityProfileMeta">
              <span>{profile?.city || "OnTrip"}</span>
              <span>•</span>
              <span>{profile?.role === "provider" ? "Provider" : "Traveler"}</span>
            </div>

            <div className="communityProfileStats">
              <div>
                <strong>{profile?.postsCount || 0}</strong>
                <span>Posts</span>
              </div>
              <div>
                <strong>{profile?.followersCount || 0}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{profile?.followingCount || 0}</strong>
                <span>Following</span>
              </div>
            </div>

            <div className="communityProfileActions">
              {!profile?.isMe ? (
                <button className="communityProfileBtn" onClick={toggleFollow}>
                  {profile?.isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <Link to="/community" className="communityProfileBtn ghost">
                  Back to Feed
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="communityProfilePosts">
        {posts.length === 0 ? (
          <div className="communityProfileEmpty">No posts yet.</div>
        ) : (
          posts.map((post) => (
            <div className="communityProfilePostCard" key={post.id}>
              <div className="communityProfilePostHead">
                <strong>{post.author?.name}</strong>
                <span>{formatTime(post.createdAt)}</span>
              </div>

              <div className="communityProfilePostText">{post.text}</div>

              {post.media?.length ? (
                <div className="communityProfileMediaGrid">
                  {post.media.map((item, index) =>
                    item.type === "video" ? (
                      <video key={index} src={item.url} controls className="communityProfileMedia" />
                    ) : (
                      <img key={index} src={item.url} alt="post" className="communityProfileMedia" />
                    )
                  )}
                </div>
              ) : null}

              <div className="communityProfilePostActions">
                <button onClick={() => likePost(post.id)}>
                  ❤️ {post.likesCount}
                </button>
                <span>💬 {post.commentsCount}</span>
                <span>🔖 {post.bookmarksCount}</span>
              </div>
            </div>
          ))
        )}

        {pagination.hasMore ? (
          <button className="communityProfileLoadBtn" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        ) : null}
      </div>
    </div>
  );
}