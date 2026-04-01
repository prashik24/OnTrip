import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Community.css";

const postTypeOptions = [
  { label: "Normal Post", value: "post" },
  { label: "Question", value: "question" },
  { label: "Story", value: "story" },
  { label: "Provider Offer", value: "provider_offer" },
];

const feedFilterOptions = [
  { label: "All Posts", value: "all" },
  { label: "Questions", value: "questions" },
  { label: "Stories", value: "stories" },
  { label: "Offers", value: "offers" },
];

function getInitial(name = "U") {
  return String(name).trim().charAt(0).toUpperCase() || "U";
}

function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function compactCount(value = 0) {
  const num = Number(value || 0);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return String(num);
}

function PostComposer({
  me,
  myProfile,
  myProviders,
  composer,
  setComposer,
  fileInputRef,
  submitting,
  onSubmit,
}) {
  const providerOptions = useMemo(
    () => [
      { label: "Select provider listing", value: "" },
      ...myProviders.map((item) => ({
        label: `${item.businessName} — ${
          item.listingType === "travel_planner" ? "Travel Planner" : "Vehicle"
        }`,
        value: item._id,
      })),
    ],
    [myProviders]
  );

  return (
    <div className="communityComposerCard">
      <div className="communityComposerTop">
        {me?.avatar ? (
          <img src={me.avatar} alt={me.name} className="communityAvatar large" />
        ) : (
          <div className="communityAvatarFallback large">{getInitial(me?.name)}</div>
        )}

        <div className="communityComposerMain">
          <div className="communityComposerHeader">
            <div>
              <strong>{me?.name || "Traveler"}</strong>
              <span>
                {myProfile?.followersCount || 0} followers •{" "}
                {myProfile?.followingCount || 0} following
              </span>
            </div>

            <CustomSelect
              value={composer.postType}
              onChange={(e) =>
                setComposer((prev) => ({ ...prev, postType: e.target.value }))
              }
              options={postTypeOptions}
              placeholder="Post type"
              className="communitySmallSelect"
            />
          </div>

          <textarea
            className="communityComposerTextarea"
            placeholder="Share your travel story, ask a question, post an update, or promote your service..."
            value={composer.text}
            onChange={(e) =>
              setComposer((prev) => ({ ...prev, text: e.target.value }))
            }
            rows={5}
          />

          <div className="communityComposerGrid">
            <input
              className="communityInput"
              placeholder="Hashtags (example: goa, solo, budget)"
              value={composer.hashtags}
              onChange={(e) =>
                setComposer((prev) => ({ ...prev, hashtags: e.target.value }))
              }
            />

            <input
              className="communityInput"
              placeholder='Tag users JSON later, for now type names "@amit @riya"'
              value={composer.tagNames}
              onChange={(e) =>
                setComposer((prev) => ({ ...prev, tagNames: e.target.value }))
              }
            />
          </div>

          {composer.postType === "provider_offer" ? (
            <CustomSelect
              value={composer.providerId}
              onChange={(e) =>
                setComposer((prev) => ({ ...prev, providerId: e.target.value }))
              }
              options={providerOptions}
              placeholder="Select provider listing"
            />
          ) : null}

          <div className="communityComposerActions">
            <button
              type="button"
              className="communityGhostBtn"
              onClick={() => fileInputRef.current?.click()}
            >
              Add Photo / Video
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
              {composer.mediaFiles.length
                ? `${composer.mediaFiles.length} file(s) selected`
                : "No media selected"}
            </div>

            <button
              type="button"
              className="communityPrimaryBtn"
              onClick={onSubmit}
              disabled={submitting}
            >
              {submitting ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReplyComposer({ value, onChange, onSubmit }) {
  return (
    <div className="communityReplyComposer">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Write a reply..."
      />
      <button type="button" onClick={onSubmit}>
        Reply
      </button>
    </div>
  );
}

function CommentItem({
  postId,
  comment,
  onLikeComment,
  onReplyComment,
  replyDraft,
  setReplyDraft,
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);

  return (
    <div className="communityCommentItem">
      {comment.user?.avatar ? (
        <img
          src={comment.user.avatar}
          alt={comment.user.name}
          className="communityCommentAvatar"
        />
      ) : (
        <div className="communityCommentAvatarFallback">
          {getInitial(comment.user?.name)}
        </div>
      )}

      <div className="communityCommentBody">
        <div className="communityCommentTop">
          <strong>{comment.user?.name || "User"}</strong>
          <span>{formatTime(comment.createdAt)}</span>
        </div>

        <div className="communityCommentText">{comment.text}</div>

        <div className="communityCommentActions">
          <button type="button" onClick={() => onLikeComment(postId, comment.id)}>
            ❤️ {compactCount(comment.likesCount)}
          </button>
          <button type="button" onClick={() => setShowReplyBox((prev) => !prev)}>
            Reply
          </button>
        </div>

        {showReplyBox ? (
          <ReplyComposer
            value={replyDraft}
            onChange={setReplyDraft}
            onSubmit={() => {
              onReplyComment(postId, comment.id);
              setShowReplyBox(false);
            }}
          />
        ) : null}

        {comment.replies?.length ? (
          <div className="communityReplyList">
            {comment.replies.map((reply) => (
              <div key={reply.id} className="communityReplyItem">
                {reply.user?.avatar ? (
                  <img
                    src={reply.user.avatar}
                    alt={reply.user.name}
                    className="communityReplyAvatar"
                  />
                ) : (
                  <div className="communityReplyAvatarFallback">
                    {getInitial(reply.user?.name)}
                  </div>
                )}
                <div className="communityReplyBody">
                  <div className="communityCommentTop">
                    <strong>{reply.user?.name || "User"}</strong>
                    <span>{formatTime(reply.createdAt)}</span>
                  </div>
                  <div className="communityCommentText">{reply.text}</div>
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FeedPost({
  post,
  onLikePost,
  onBookmarkPost,
  onAddComment,
  onLikeComment,
  onReplyComment,
  commentDraft,
  setCommentDraft,
  replyDrafts,
  setReplyDraft,
}) {
  return (
    <article className="communityPostCard">
      <div className="communityPostHead">
        <div className="communityPostAuthor">
          {post.author?.avatar ? (
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="communityAvatar"
            />
          ) : (
            <div className="communityAvatarFallback">
              {getInitial(post.author?.name)}
            </div>
          )}

          <div className="communityPostAuthorText">
            <div className="communityPostAuthorTop">
              <strong>{post.author?.name || "User"}</strong>
              <span className={`communityRoleBadge ${post.author?.role || "user"}`}>
                {post.author?.role === "provider" ? "Provider" : "Traveler"}
              </span>
            </div>

            <div className="communityMetaLine">
              <span>{post.author?.city || "OnTrip"}</span>
              <span>•</span>
              <span>{formatTime(post.createdAt)}</span>
              <span>•</span>
              <span className="communityTypeBadge">{post.postType}</span>
            </div>
          </div>
        </div>
      </div>

      {post.text ? <div className="communityPostText">{post.text}</div> : null}

      {post.hashtags?.length ? (
        <div className="communityTagRow">
          {post.hashtags.map((tag) => (
            <button key={tag} type="button" className="communityTagChip">
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {post.media?.length ? (
        <div
          className={`communityMediaGrid ${
            post.media.length === 1 ? "single" : post.media.length === 2 ? "double" : "multi"
          }`}
        >
          {post.media.map((item, index) =>
            item.mediaType === "video" ? (
              <video key={`${item.url}-${index}`} controls className="communityPostMedia">
                <source src={item.url} />
              </video>
            ) : (
              <img
                key={`${item.url}-${index}`}
                src={item.url}
                alt="community media"
                className="communityPostMedia"
              />
            )
          )}
        </div>
      ) : null}

      <div className="communityPostActions">
        <button
          type="button"
          className={post.isLikedByMe ? "active" : ""}
          onClick={() => onLikePost(post.id)}
        >
          ❤️ {compactCount(post.likesCount)}
        </button>

        <button
          type="button"
          className={post.isBookmarkedByMe ? "active" : ""}
          onClick={() => onBookmarkPost(post.id)}
        >
          🔖 {compactCount(post.bookmarksCount)}
        </button>

        <div>💬 {compactCount(post.commentsCount)}</div>
        <div>🔁 {compactCount(post.sharesCount)}</div>
      </div>

      <div className="communityCommentComposer">
        <input
          value={commentDraft}
          onChange={(e) => setCommentDraft(post.id, e.target.value)}
          placeholder="Write a comment..."
        />
        <button type="button" onClick={() => onAddComment(post.id)}>
          Comment
        </button>
      </div>

      {post.comments?.length ? (
        <div className="communityCommentList">
          {post.comments.map((comment) => (
            <CommentItem
              key={comment.id}
              postId={post.id}
              comment={comment}
              onLikeComment={onLikeComment}
              onReplyComment={onReplyComment}
              replyDraft={replyDrafts[comment.id] || ""}
              setReplyDraft={(value) => setReplyDraft(comment.id, value)}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ProfileSidebar({
  me,
  myProfile,
  notifications,
  activeTab,
  setActiveTab,
}) {
  return (
    <div className="communitySidebarCard">
      <div className="communityProfileBlock">
        {myProfile?.user?.avatar ? (
          <img
            src={myProfile.user.avatar}
            alt={myProfile.user.name}
            className="communityProfileHeroAvatar"
          />
        ) : (
          <div className="communityProfileHeroAvatarFallback">
            {getInitial(myProfile?.user?.name || me?.name)}
          </div>
        )}

        <div className="communityProfileName">{myProfile?.user?.name || me?.name || "User"}</div>
        <div className="communityProfileMeta">
          {myProfile?.user?.city || "OnTrip"} • {myProfile?.user?.role || "user"}
        </div>

        <div className="communityProfileStats">
          <div>
            <strong>{compactCount(myProfile?.followersCount || 0)}</strong>
            <span>Followers</span>
          </div>
          <div>
            <strong>{compactCount(myProfile?.followingCount || 0)}</strong>
            <span>Following</span>
          </div>
          <div>
            <strong>{compactCount(myProfile?.unreadNotifications || 0)}</strong>
            <span>Alerts</span>
          </div>
        </div>
      </div>

      <div className="communitySidebarMenu">
        <button
          type="button"
          className={activeTab === "feed" ? "active" : ""}
          onClick={() => setActiveTab("feed")}
        >
          Main Feed
        </button>
        <button
          type="button"
          className={activeTab === "profile" ? "active" : ""}
          onClick={() => setActiveTab("profile")}
        >
          My Profile
        </button>
        <button
          type="button"
          className={activeTab === "posts" ? "active" : ""}
          onClick={() => setActiveTab("posts")}
        >
          My Posts
        </button>
        <button
          type="button"
          className={activeTab === "bookmarks" ? "active" : ""}
          onClick={() => setActiveTab("bookmarks")}
        >
          Bookmarks
        </button>
        <button
          type="button"
          className={activeTab === "liked" ? "active" : ""}
          onClick={() => setActiveTab("liked")}
        >
          Liked Posts
        </button>
        <button
          type="button"
          className={activeTab === "notifications" ? "active" : ""}
          onClick={() => setActiveTab("notifications")}
        >
          Notifications
        </button>
      </div>

      <div className="communitySidebarHint">
        Click profile to open your post section, bookmarks, likes, and notifications.
      </div>

      {notifications?.length ? (
        <div className="communityQuickNotifications">
          <div className="communitySidebarTitle">Recent Alerts</div>
          {notifications.slice(0, 4).map((item) => (
            <div key={item.id} className={`communityNotificationItem ${item.isRead ? "" : "unread"}`}>
              <strong>{item.sender?.name || "Someone"}</strong>
              <span>{item.text}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function RightPanel({ search, setSearch, hashtagResults, notifications, onMarkRead }) {
  return (
    <div className="communitySidebarCard">
      <div className="communitySidebarTitle">Search Hashtags</div>
      <input
        className="communityInput"
        placeholder="Search hashtag..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="communityHashtagList">
        {hashtagResults.length === 0 ? (
          <div className="communityMutedCard">No hashtag match yet.</div>
        ) : (
          hashtagResults.map((tag) => (
            <div key={tag} className="communityHashtagItem">
              #{tag}
            </div>
          ))
        )}
      </div>

      <div className="communitySidebarTitle withSpace">Notifications</div>
      <button type="button" className="communityGhostBtn full" onClick={onMarkRead}>
        Mark all as read
      </button>

      <div className="communityNotificationList">
        {notifications.length === 0 ? (
          <div className="communityMutedCard">No notifications.</div>
        ) : (
          notifications.map((item) => (
            <div key={item.id} className={`communityNotificationCard ${item.isRead ? "" : "unread"}`}>
              <div className="communityNotificationTop">
                <strong>{item.sender?.name || "OnTrip"}</strong>
                <span>{formatTime(item.createdAt)}</span>
              </div>
              <div className="communityNotificationText">{item.text}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function Community() {
  const me = getUser();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [searchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [feed, setFeed] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  });

  const [feedFilter, setFeedFilter] = useState("all");
  const [hashtagSearch, setHashtagSearch] = useState("");
  const [activeTab, setActiveTab] = useState("feed");

  const [myProfile, setMyProfile] = useState(null);
  const [myPosts, setMyPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [bookmarkedPosts, setBookmarkedPosts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [myProviders, setMyProviders] = useState([]);

  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});

  const [composer, setComposer] = useState({
    postType: "post",
    text: "",
    hashtags: "",
    tagNames: "",
    providerId: "",
    mediaFiles: [],
  });

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");

        const requests = [
          apiFetch(`/api/community/feed?page=1&limit=10&filter=${feedFilter}`),
        ];

        if (isLoggedIn()) {
          requests.push(apiFetch("/api/community/me"));
          requests.push(apiFetch("/api/community/notifications"));

          if (me?.role === "provider") {
            requests.push(apiFetch("/api/providers/mine"));
          }
        }

        const results = await Promise.all(requests);
        const feedRes = results[0];
        const myProfileRes = results[1];
        const notificationsRes = results[2];
        const providersRes = results[3];

        setFeed(feedRes.posts || []);
        setPagination(
          feedRes.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            hasMore: false,
          }
        );

        if (myProfileRes) {
          setMyProfile(myProfileRes.profile || null);
          setMyPosts(myProfileRes.myPosts || []);
          setLikedPosts(myProfileRes.likedPosts || []);
          setBookmarkedPosts(myProfileRes.bookmarkedPosts || []);
        }

        if (notificationsRes) {
          setNotifications(notificationsRes.notifications || []);
        }

        if (providersRes) {
          setMyProviders(providersRes.providers || []);
        }
      } catch (err) {
        setError(err.message || "Failed to load community.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [feedFilter, me?.role]);

  const hashtagResults = useMemo(() => {
    const allTags = new Set();

    for (const post of feed) {
      for (const tag of post.hashtags || []) {
        allTags.add(tag);
      }
    }

    const tags = [...allTags];
    const q = hashtagSearch.trim().toLowerCase();
    if (!q) return tags.slice(0, 12);

    return tags.filter((tag) => tag.includes(q)).slice(0, 12);
  }, [feed, hashtagSearch]);

  const visiblePosts = useMemo(() => {
    if (activeTab === "posts") return myPosts;
    if (activeTab === "liked") return likedPosts;
    if (activeTab === "bookmarks") return bookmarkedPosts;
    return feed;
  }, [activeTab, feed, myPosts, likedPosts, bookmarkedPosts]);

  function updatePostCollections(nextPost) {
    setFeed((prev) =>
      prev.map((item) => (String(item.id) === String(nextPost.id) ? nextPost : item))
    );
    setMyPosts((prev) =>
      prev.map((item) => (String(item.id) === String(nextPost.id) ? nextPost : item))
    );
    setLikedPosts((prev) => {
      const exists = prev.some((item) => String(item.id) === String(nextPost.id));
      if (nextPost.isLikedByMe) {
        return exists
          ? prev.map((item) => (String(item.id) === String(nextPost.id) ? nextPost : item))
          : [nextPost, ...prev];
      }
      return prev.filter((item) => String(item.id) !== String(nextPost.id));
    });
    setBookmarkedPosts((prev) => {
      const exists = prev.some((item) => String(item.id) === String(nextPost.id));
      if (nextPost.isBookmarkedByMe) {
        return exists
          ? prev.map((item) => (String(item.id) === String(nextPost.id) ? nextPost : item))
          : [nextPost, ...prev];
      }
      return prev.filter((item) => String(item.id) !== String(nextPost.id));
    });
  }

  async function refreshProfileLite() {
    if (!isLoggedIn()) return;

    const data = await apiFetch("/api/community/me");
    setMyProfile(data.profile || null);
    setMyPosts(data.myPosts || []);
    setLikedPosts(data.likedPosts || []);
    setBookmarkedPosts(data.bookmarkedPosts || []);
  }

  async function handleCreatePost() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (!composer.text.trim() && composer.mediaFiles.length === 0) {
      setError("Write something or select media.");
      return;
    }

    if (composer.postType === "provider_offer" && !composer.providerId) {
      setError("Please select provider listing.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const fd = new FormData();
      fd.append("postType", composer.postType);
      fd.append("text", composer.text.trim());
      fd.append("hashtags", composer.hashtags.trim());

      if (composer.providerId) {
        fd.append("providerId", composer.providerId);
      }

      const taggedUsers = composer.tagNames
        .split(" ")
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => ({
          user: "",
          nameSnapshot: item.replace(/^@/, ""),
        }));

      fd.append("taggedUsers", JSON.stringify(taggedUsers));

      for (const file of composer.mediaFiles) {
        fd.append("media", file);
      }

      const data = await apiFetch("/api/community/post", {
        method: "POST",
        body: fd,
      });

      setFeed((prev) => [data.post, ...prev]);
      setMyPosts((prev) => [data.post, ...prev]);

      setComposer({
        postType: "post",
        text: "",
        hashtags: "",
        tagNames: "",
        providerId: "",
        mediaFiles: [],
      });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      await refreshProfileLite();
      setActiveTab("feed");
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLikePost(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(`/api/community/post/${postId}/like`, {
        method: "POST",
      });

      const allCollections = [...feed, ...myPosts, ...likedPosts, ...bookmarkedPosts];
      const oldPost = allCollections.find((item) => String(item.id) === String(postId));
      if (!oldPost) return;

      const nextPost = {
        ...oldPost,
        likesCount: data.likesCount,
        isLikedByMe: data.isLikedByMe,
      };

      updatePostCollections(nextPost);
      await refreshProfileLite();
    } catch (err) {
      setError(err.message || "Failed to update like.");
    }
  }

  async function handleBookmarkPost(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(`/api/community/post/${postId}/bookmark`, {
        method: "POST",
      });

      const allCollections = [...feed, ...myPosts, ...likedPosts, ...bookmarkedPosts];
      const oldPost = allCollections.find((item) => String(item.id) === String(postId));
      if (!oldPost) return;

      const nextPost = {
        ...oldPost,
        bookmarksCount: data.bookmarksCount,
        isBookmarkedByMe: data.isBookmarkedByMe,
      };

      updatePostCollections(nextPost);
      await refreshProfileLite();
    } catch (err) {
      setError(err.message || "Failed to update bookmark.");
    }
  }

  function setCommentDraft(postId, value) {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  }

  function setReplyDraft(commentId, value) {
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: value,
    }));
  }

  async function handleAddComment(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const text = String(commentDrafts[postId] || "").trim();
    if (!text) return;

    try {
      const data = await apiFetch(`/api/community/post/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      updatePostCollections(data.post);
      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: "",
      }));
      await refreshProfileLite();
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  }

  async function handleLikeComment(postId, commentId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(
        `/api/community/post/${postId}/comment/${commentId}/like`,
        {
          method: "POST",
        }
      );

      updatePostCollections(data.post);
      await refreshProfileLite();
    } catch (err) {
      setError(err.message || "Failed to update comment like.");
    }
  }

  async function handleReplyComment(postId, commentId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const text = String(replyDrafts[commentId] || "").trim();
    if (!text) return;

    try {
      const data = await apiFetch(
        `/api/community/post/${postId}/comment/${commentId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        }
      );

      updatePostCollections(data.post);
      setReplyDrafts((prev) => ({
        ...prev,
        [commentId]: "",
      }));
      await refreshProfileLite();
    } catch (err) {
      setError(err.message || "Failed to add reply.");
    }
  }

  async function handleLoadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      const nextPage = pagination.page + 1;

      const data = await apiFetch(
        `/api/community/feed?page=${nextPage}&limit=${pagination.limit}&filter=${feedFilter}`
      );

      setFeed((prev) => [...prev, ...(data.posts || [])]);
      setPagination(data.pagination || pagination);
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleMarkNotificationsRead() {
    if (!isLoggedIn()) return;

    try {
      await apiFetch("/api/community/notifications/read", {
        method: "POST",
      });

      setNotifications((prev) => prev.map((item) => ({ ...item, isRead: true })));
      setMyProfile((prev) =>
        prev
          ? {
              ...prev,
              unreadNotifications: 0,
            }
          : prev
      );
    } catch (err) {
      setError(err.message || "Failed to mark notifications.");
    }
  }

  if (loading) {
    return (
      <div className="container communityPage">
        <LoadingSpinner text="Loading community..." />
      </div>
    );
  }

  return (
    <div className="container communityPage">
      {error ? <div className="communityAlert">{error}</div> : null}

      <div className="communityTopBar">
        <div>
          <h1>OnTrip Community</h1>
          <p>
            Mini travel social network with posts, comments, replies, hashtags,
            bookmarks, likes, notifications, followers, and media sharing.
          </p>
        </div>

        <div className="communityTopBarActions">
          <CustomSelect
            value={feedFilter}
            onChange={(e) => setFeedFilter(e.target.value)}
            options={feedFilterOptions}
            placeholder="Feed filter"
            className="communitySmallSelect"
          />
          {isLoggedIn() ? (
            <Link to="/community?tab=profile" className="communityProfileLinkBtn">
              Open My Page
            </Link>
          ) : (
            <Link to="/login" className="communityProfileLinkBtn">
              Login to Post
            </Link>
          )}
        </div>
      </div>

      <div className="communityLayout">
        <aside className="communityLeft">
          <ProfileSidebar
            me={me}
            myProfile={myProfile}
            notifications={notifications}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </aside>

        <main className="communityCenter">
          {isLoggedIn() ? (
            <PostComposer
              me={me}
              myProfile={myProfile}
              myProviders={myProviders}
              composer={composer}
              setComposer={setComposer}
              fileInputRef={fileInputRef}
              submitting={submitting}
              onSubmit={handleCreatePost}
            />
          ) : null}

          {activeTab === "profile" ? (
            <div className="communityProfilePageCard">
              <div className="communityProfilePageHead">
                <h2>My Community Page</h2>
                <p>
                  This page shows your profile, follower count, following count,
                  posts, bookmarks, liked posts, and notifications.
                </p>
              </div>

              <div className="communityProfileCards">
                <div className="communityMiniStatCard">
                  <strong>{compactCount(myProfile?.followersCount || 0)}</strong>
                  <span>Followers</span>
                </div>
                <div className="communityMiniStatCard">
                  <strong>{compactCount(myProfile?.followingCount || 0)}</strong>
                  <span>Following</span>
                </div>
                <div className="communityMiniStatCard">
                  <strong>{compactCount(myPosts.length)}</strong>
                  <span>Posts</span>
                </div>
                <div className="communityMiniStatCard">
                  <strong>{compactCount(bookmarkedPosts.length)}</strong>
                  <span>Bookmarks</span>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "notifications" ? (
            <div className="communityFeedList">
              {notifications.length === 0 ? (
                <div className="communityMutedCard">No notifications yet.</div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`communityNotificationCard large ${item.isRead ? "" : "unread"}`}
                  >
                    <div className="communityNotificationTop">
                      <strong>{item.sender?.name || "OnTrip"}</strong>
                      <span>{formatTime(item.createdAt)}</span>
                    </div>
                    <div className="communityNotificationText">{item.text}</div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="communityFeedList">
              {visiblePosts.length === 0 ? (
                <div className="communityMutedCard">
                  No posts found in this section.
                </div>
              ) : (
                visiblePosts.map((post) => (
                  <FeedPost
                    key={post.id}
                    post={post}
                    onLikePost={handleLikePost}
                    onBookmarkPost={handleBookmarkPost}
                    onAddComment={handleAddComment}
                    onLikeComment={handleLikeComment}
                    onReplyComment={handleReplyComment}
                    commentDraft={commentDrafts[post.id] || ""}
                    setCommentDraft={setCommentDraft}
                    replyDrafts={replyDrafts}
                    setReplyDraft={setReplyDraft}
                  />
                ))
              )}

              {activeTab === "feed" && pagination.hasMore ? (
                <button
                  type="button"
                  className="communityLoadMoreBtn"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                >
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              ) : null}
            </div>
          )}
        </main>

        <aside className="communityRight">
          <RightPanel
            search={hashtagSearch}
            setSearch={setHashtagSearch}
            hashtagResults={hashtagResults}
            notifications={notifications}
            onMarkRead={handleMarkNotificationsRead}
          />
        </aside>
      </div>
    </div>
  );
}