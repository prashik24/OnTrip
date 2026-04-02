import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./MyCommunityPosts.css";

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MyCommunityPosts() {
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
      const res = await apiFetch("/api/community/me/posts?page=1&limit=10");
      setPosts(res.posts || []);
      setPagination(res.pagination || { page: 1, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load your posts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;
      const res = await apiFetch(`/api/community/me/posts?page=${nextPage}&limit=10`);
      setPosts((prev) => [...prev, ...(res.posts || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function deletePost(postId) {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    try {
      await apiFetch(`/api/community/${postId}`, {
        method: "DELETE",
      });

      setPosts((prev) => prev.filter((item) => item.id !== postId));
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    }
  }

  return (
    <div className="container myCommunityPostsPage">
      <div className="myCommunityPostsHero">
        <h1>My Posts</h1>
        <p>All the posts you created in the community.</p>
      </div>

      {error ? <div className="myCommunityPostsAlert">{error}</div> : null}

      {loading ? (
        <LoadingSpinner text="Loading your posts..." />
      ) : posts.length === 0 ? (
        <div className="myCommunityPostsEmpty">You have not posted yet.</div>
      ) : (
        <div className="myCommunityPostsList">
          {posts.map((post) => (
            <div className="myCommunityPostsCard" key={post.id}>
              <div className="myCommunityPostsHead">
                <strong>{post.author?.name || "You"}</strong>
                <span>{formatTime(post.createdAt)}</span>
              </div>

              <div className="myCommunityPostsText">{post.text}</div>

              {post.media?.length ? (
                <div className="myCommunityPostsMediaGrid">
                  {post.media.map((item, index) =>
                    item.type === "video" ? (
                      <video key={index} src={item.url} controls className="myCommunityPostsMedia" />
                    ) : (
                      <img key={index} src={item.url} alt="post" className="myCommunityPostsMedia" />
                    )
                  )}
                </div>
              ) : null}

              <div className="myCommunityPostsActions">
                <span>❤️ {post.likesCount}</span>
                <span>💬 {post.commentsCount}</span>
                <span>🔖 {post.bookmarksCount}</span>
                <button onClick={() => deletePost(post.id)}>Delete</button>
              </div>
            </div>
          ))}

          {pagination.hasMore ? (
            <button
              className="myCommunityPostsLoadBtn"
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}