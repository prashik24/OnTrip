import { useEffect, useState } from "react";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Bookmarks.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Bookmarks() {
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
      const res = await apiFetch("/api/community/me/bookmarks?page=1&limit=10");
      setPosts(res.posts || []);
      setPagination(res.pagination || { page: 1, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load bookmarks.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleBookmark(postId) {
    if (!isLoggedIn()) return;

    try {
      const res = await apiFetch(`/api/community/${postId}/bookmark`, {
        method: "POST",
      });

      if (!res.isBookmarkedByMe) {
        setPosts((prev) => prev.filter((item) => item.id !== postId));
      }
    } catch (err) {
      setError(err.message || "Failed to update bookmark.");
    }
  }

  async function loadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      const res = await apiFetch(`/api/community/me/bookmarks?page=${nextPage}&limit=10`);
      setPosts((prev) => [...prev, ...(res.posts || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container bookmarksPage">
      <div className="bookmarksHero">
        <h1>Bookmarks</h1>
        <p>All your saved community posts in one place.</p>
      </div>

      {error ? <div className="bookmarksAlert">{error}</div> : null}

      {loading ? (
        <LoadingSpinner text="Loading bookmarks..." />
      ) : posts.length === 0 ? (
        <div className="bookmarksEmpty">No bookmarked posts yet.</div>
      ) : (
        <div className="bookmarksList">
          {posts.map((post) => (
            <div className="bookmarksCard" key={post.id}>
              <div className="bookmarksCardHead">
                <strong>{post.author?.name || "User"}</strong>
                <span>{formatTime(post.createdAt)}</span>
              </div>

              <div className="bookmarksText">{post.text}</div>

              {post.media?.length ? (
                <div className="bookmarksMediaGrid">
                  {post.media.map((item, index) =>
                    item.type === "video" ? (
                      <video key={index} src={item.url} controls className="bookmarksMedia" />
                    ) : (
                      <img key={index} src={item.url} alt="post" className="bookmarksMedia" />
                    )
                  )}
                </div>
              ) : null}

              <div className="bookmarksActions">
                <span>❤️ {post.likesCount}</span>
                <span>💬 {post.commentsCount}</span>
                <button onClick={() => toggleBookmark(post.id)}>Remove Bookmark</button>
              </div>
            </div>
          ))}

          {pagination.hasMore ? (
            <button className="bookmarksLoadBtn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}