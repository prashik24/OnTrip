import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import CustomSelect from "../components/CustomSelect";
import "./Community.css";

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
  return String(name).trim().charAt(0).toUpperCase() || "U";
}

const postTypeOptions = [
  { label: "Normal Post", value: "post" },
  { label: "Question", value: "question" },
  { label: "Trip Story", value: "trip_story" },
  { label: "Provider Offer", value: "provider_offer" },
];

function CommunityPostCard({
  post,
  onLike,
  onBookmark,
  onComment,
  commentText,
  setCommentText,
}) {
  return (
    <article className="communityPostCard">
      <div className="communityPostHead">
        <Link to={`/community/profile/${post.author?.id}`} className="communityAuthorLink">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author?.name || "User"}
              className="communityPostAvatar"
            />
          ) : (
            <div className="communityPostAvatarFallback">
              {getInitial(post.author?.name)}
            </div>
          )}
        </Link>

        <div className="communityPostHeadContent">
          <div className="communityPostHeadTop">
            <Link to={`/community/profile/${post.author?.id}`} className="communityAuthorName">
              {post.author?.name || "User"}
            </Link>

            <span className={`communityRolePill ${post.author?.role || "user"}`}>
              {post.author?.role === "provider" ? "Provider" : "Traveler"}
            </span>
          </div>

          <div className="communityPostMeta">
            <span>{post.author?.city || "OnTrip"}</span>
            <span>•</span>
            <span>{formatTime(post.createdAt)}</span>
            {post.postType && post.postType !== "post" ? (
              <>
                <span>•</span>
                <span className="communityPostType">
                  {post.postType === "question"
                    ? "Question"
                    : post.postType === "trip_story"
                    ? "Trip Story"
                    : post.postType === "provider_offer"
                    ? "Provider Offer"
                    : "Post"}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {post.text ? <div className="communityPostText">{post.text}</div> : null}

      {post.tags?.length ? (
        <div className="communityTagRow">
          {post.tags.map((tag) => (
            <span key={tag} className="communityTagChip">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {post.locationText ? (
        <div className="communityLocationText">📍 {post.locationText}</div>
      ) : null}

      {post.media?.length ? (
        <div
          className={`communityMediaGrid ${
            post.media.length === 1
              ? "single"
              : post.media.length === 2
              ? "double"
              : "multi"
          }`}
        >
          {post.media.map((item, index) =>
            item.type === "video" ? (
              <video
                key={`${item.url}-${index}`}
                src={item.url}
                controls
                className="communityPostMedia"
              />
            ) : (
              <img
                key={`${item.url}-${index}`}
                src={item.url}
                alt="post"
                className="communityPostMedia"
              />
            )
          )}
        </div>
      ) : null}

      <div className="communityPostActions">
        <button
          type="button"
          className={`communityActionBtn ${post.isLikedByMe ? "active" : ""}`}
          onClick={() => onLike(post.id)}
        >
          ❤️ {post.likesCount}
        </button>

        <button
          type="button"
          className={`communityActionBtn ${post.isBookmarkedByMe ? "active" : ""}`}
          onClick={() => onBookmark(post.id)}
        >
          🔖 {post.isBookmarkedByMe ? "Saved" : "Save"}
        </button>

        <div className="communityActionInfo">💬 {post.commentsCount}</div>
      </div>

      <div className="communityCommentComposer">
        <input
          type="text"
          placeholder="Write a comment..."
          value={commentText}
          onChange={(e) => setCommentText(post.id, e.target.value)}
        />
        <button type="button" onClick={() => onComment(post.id)}>
          Comment
        </button>
      </div>

      {post.comments?.length ? (
        <div className="communityCommentList">
          {post.comments.slice(0, 3).map((comment) => (
            <div className="communityCommentItem" key={comment.id}>
              <Link
                to={`/community/profile/${comment.user?.id}`}
                className="communityCommentUserLink"
              >
                {comment.user?.avatar ? (
                  <img
                    src={comment.user.avatar}
                    alt={comment.user?.name || "User"}
                    className="communityCommentAvatar"
                  />
                ) : (
                  <div className="communityCommentAvatarFallback">
                    {getInitial(comment.user?.name)}
                  </div>
                )}
              </Link>

              <div className="communityCommentBody">
                <div className="communityCommentTop">
                  <Link
                    to={`/community/profile/${comment.user?.id}`}
                    className="communityCommentName"
                  >
                    {comment.user?.name || "User"}
                  </Link>
                  <span>{formatTime(comment.createdAt)}</span>
                </div>

                <div className="communityCommentText">{comment.text}</div>

                {comment.replies?.length ? (
                  <div className="communityReplyList">
                    {comment.replies.slice(0, 2).map((reply) => (
                      <div className="communityReplyItem" key={reply.id}>
                        <Link
                          to={`/community/profile/${reply.user?.id}`}
                          className="communityReplyName"
                        >
                          {reply.user?.name || "User"}
                        </Link>
                        <span className="communityReplyText">{reply.text}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default function Community() {
  const me = getUser();
  const fileInputRef = useRef(null);

  const [posts, setPosts] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [profileStats, setProfileStats] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });

  const [composer, setComposer] = useState({
    postType: "post",
    text: "",
    locationText: "",
    tags: "",
    mediaFiles: [],
  });

  useEffect(() => {
    loadInitial();
  }, []);

  async function loadInitial() {
    try {
      setLoading(true);
      setError("");

      const [feedRes, profileRes] = await Promise.all([
        apiFetch("/api/community/feed?page=1&limit=10"),
        me?.id ? apiFetch(`/api/community/profile/${me.id}`) : Promise.resolve({ profile: null }),
      ]);

      setPosts(feedRes.posts || []);
      setPagination(feedRes.pagination || { page: 1, hasMore: false });

      if (profileRes?.profile) {
        setProfileStats({
          followersCount: profileRes.profile.followersCount || 0,
          followingCount: profileRes.profile.followingCount || 0,
          postsCount: profileRes.profile.postsCount || 0,
        });
      }
    } catch (err) {
      setError(err.message || "Failed to load community.");
    } finally {
      setLoading(false);
    }
  }

  async function applySearch() {
    try {
      setLoading(true);
      setError("");

      const res = await apiFetch(
        `/api/community/feed?page=1&limit=10&q=${encodeURIComponent(search)}`
      );

      setPosts(res.posts || []);
      setPagination(res.pagination || { page: 1, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to search posts.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);

      const nextPage = (pagination.page || 1) + 1;
      const res = await apiFetch(
        `/api/community/feed?page=${nextPage}&limit=10&q=${encodeURIComponent(search)}`
      );

      setPosts((prev) => [...prev, ...(res.posts || [])]);
      setPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleCreatePost() {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    if (!composer.text.trim() && composer.mediaFiles.length === 0) {
      setError("Write something or select image/video.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const fd = new FormData();
      fd.append("postType", composer.postType);
      fd.append("text", composer.text.trim());
      fd.append("locationText", composer.locationText.trim());
      fd.append("tags", composer.tags.trim());

      composer.mediaFiles.forEach((file) => {
        fd.append("media", file);
        fd.append("images", file);
      });

      const res = await apiFetch("/api/community", {
        method: "POST",
        body: fd,
      });

      setPosts((prev) => [res.post, ...prev]);
      setProfileStats((prev) => ({
        ...prev,
        postsCount: (prev.postsCount || 0) + 1,
      }));

      setComposer({
        postType: "post",
        text: "",
        locationText: "",
        tags: "",
        mediaFiles: [],
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLike(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/${postId}/like`, {
        method: "POST",
      });

      setPosts((prev) => prev.map((post) => (post.id === postId ? res.post : post)));
    } catch (err) {
      setError(err.message || "Failed to update like.");
    }
  }

  async function handleBookmark(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/${postId}/bookmark`, {
        method: "POST",
      });

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isBookmarkedByMe: res.isBookmarkedByMe,
                bookmarksCount: res.bookmarksCount,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update bookmark.");
    }
  }

  function setCommentText(postId, value) {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  }

  async function handleComment(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    const text = String(commentDrafts[postId] || "").trim();
    if (!text) return;

    try {
      const res = await apiFetch(`/api/community/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      setPosts((prev) => prev.map((post) => (post.id === postId ? res.post : post)));
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  }

  return (
    <div className="container communityPage">
      {error ? <div className="communityAlert">{error}</div> : null}

      <div className="communityLayout">
        <aside className="communitySidebar">
          <div className="communitySidebarInner">
            <div className="communityUserCard">
              {me?.avatar ? (
                <img src={me.avatar} alt={me.name} className="communityUserAvatar" />
              ) : (
                <div className="communityUserAvatarFallback">{getInitial(me?.name)}</div>
              )}

              <div className="communityUserInfo">
                <h3>{me?.name || "User"}</h3>
                <p>{me?.city || "OnTrip"}</p>
              </div>

              <div className="communityUserStats">
                <div>
                  <strong>{profileStats.postsCount || 0}</strong>
                  <span>Posts</span>
                </div>
                <div>
                  <strong>{profileStats.followersCount || 0}</strong>
                  <span>Followers</span>
                </div>
                <div>
                  <strong>{profileStats.followingCount || 0}</strong>
                  <span>Following</span>
                </div>
              </div>
            </div>

            <nav className="communitySidebarMenu">
              <Link to="/community" className="communitySidebarLink active">
                Home
              </Link>
              <Link to={`/community/profile/${me?.id}`} className="communitySidebarLink">
                My Profile
              </Link>
              <Link to="/community/bookmarks" className="communitySidebarLink">
                Bookmarks
              </Link>
              <Link to="/community/likes" className="communitySidebarLink">
                Liked Posts
              </Link>
              <Link to="/community/notifications" className="communitySidebarLink">
                Notifications
              </Link>
            </nav>
          </div>
        </aside>

        <main className="communityMain">
          <div className="communityHeroCard">
            <div className="communityHeroTop">
              <div>
                <h1>Community</h1>
                <p>See all posts from all users, share stories, photos, videos, and travel updates.</p>
              </div>

              <div className="communitySearchWrap">
                <input
                  type="text"
                  placeholder="Search hashtags or people..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button type="button" onClick={applySearch}>
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="communityComposerCard">
            <div className="communityComposerHead">
              <div className="communityComposerTitle">Create Post</div>
              <div className="communityComposerType">
                <CustomSelect
                  value={composer.postType}
                  onChange={(e) =>
                    setComposer((prev) => ({ ...prev, postType: e.target.value }))
                  }
                  options={postTypeOptions}
                  placeholder="Select post type"
                />
              </div>
            </div>

            <textarea
              className="communityComposerTextarea"
              placeholder="Share your travel thoughts, ask a question, or post a story..."
              value={composer.text}
              onChange={(e) =>
                setComposer((prev) => ({ ...prev, text: e.target.value }))
              }
              rows={4}
            />

            <div className="communityComposerGrid">
              <input
                type="text"
                className="communityComposerInput"
                placeholder="Location (optional)"
                value={composer.locationText}
                onChange={(e) =>
                  setComposer((prev) => ({ ...prev, locationText: e.target.value }))
                }
              />

              <input
                type="text"
                className="communityComposerInput"
                placeholder="Tags comma separated (goa, budget, trip)"
                value={composer.tags}
                onChange={(e) =>
                  setComposer((prev) => ({ ...prev, tags: e.target.value }))
                }
              />
            </div>

            <div className="communityComposerActions">
              <button
                type="button"
                className="communityUploadBtn"
                onClick={() => fileInputRef.current?.click()}
              >
                Add Image / Video
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                multiple
                className="communityHiddenInput"
                onChange={(e) =>
                  setComposer((prev) => ({
                    ...prev,
                    mediaFiles: Array.from(e.target.files || []),
                  }))
                }
              />

              <div className="communitySelectedFiles">
                {composer.mediaFiles.length > 0
                  ? `${composer.mediaFiles.length} file(s) selected`
                  : "No files selected"}
              </div>

              <button
                type="button"
                className="communityPostBtn"
                onClick={handleCreatePost}
                disabled={submitting}
              >
                {submitting ? "Posting..." : "Post"}
              </button>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading community..." />
          ) : posts.length === 0 ? (
            <div className="communityEmptyCard">No posts found.</div>
          ) : (
            <div className="communityFeed">
              {posts.map((post) => (
                <CommunityPostCard
                  key={post.id}
                  post={post}
                  onLike={handleLike}
                  onBookmark={handleBookmark}
                  onComment={handleComment}
                  commentText={commentDrafts[post.id] || ""}
                  setCommentText={setCommentText}
                />
              ))}

              {pagination.hasMore ? (
                <button
                  type="button"
                  className="communityLoadMoreBtn"
                  onClick={loadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}