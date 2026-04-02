import { useEffect, useState } from "react";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./LikedPosts.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LikedPosts() {
  const [posts, setPosts] = useState([]);
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
      const res = await apiFetch("/api/community/me/likes?page=1&limit=10");
      setPosts(res.posts || []);
      setPagination(res.pagination || { page: 1, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load liked posts.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleLike(postId) {
    if (!isLoggedIn()) return;

    try {
      const res = await apiFetch(`/api/community/${postId}/like`, {
        method: "POST",
      });

      if (!res.post.isLikedByMe) {
        setPosts((prev) => prev.filter((item) => item.id !== postId));
      } else {
        setPosts((prev) => prev.map((item) => (item.id === postId ? res.post : item)));
      }
    } catch (err) {
      setError(err.message || "Failed to update like.");
    }
  }

  async function loadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      const res = await apiFetch(`/api/community/me/likes?page=${nextPage}&limit=10`);
      setPosts((prev) => [...prev, ...(res.posts || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container likedPostsPage">
      <div className="likedPostsHero">
        <h1>Liked Posts</h1>
        <p>Posts you liked in the community.</p>
      </div>

      {error ? <div className="likedPostsAlert">{error}</div> : null}

      {loading ? (
        <LoadingSpinner text="Loading liked posts..." />
      ) : posts.length === 0 ? (
        <div className="likedPostsEmpty">No liked posts yet.</div>
      ) : (
        <div className="likedPostsList">
          {posts.map((post) => (
            <div className="likedPostsCard" key={post.id}>
              <div className="likedPostsHead">
                <strong>{post.author?.name || "User"}</strong>
                <span>{formatTime(post.createdAt)}</span>
              </div>

              <div className="likedPostsText">{post.text}</div>

              {post.media?.length ? (
                <div className="likedPostsMediaGrid">
                  {post.media.map((item, index) =>
                    item.type === "video" ? (
                      <video key={index} src={item.url} controls className="likedPostsMedia" />
                    ) : (
                      <img key={index} src={item.url} alt="post" className="likedPostsMedia" />
                    )
                  )}
                </div>
              ) : null}

              <div className="likedPostsActions">
                <button onClick={() => toggleLike(post.id)}>Unlike</button>
                <span>💬 {post.commentsCount}</span>
                <span>🔖 {post.bookmarksCount}</span>
              </div>
            </div>
          ))}

          {pagination.hasMore ? (
            <button className="likedPostsLoadBtn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}