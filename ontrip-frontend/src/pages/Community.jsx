import { useEffect, useMemo, useState } from "react";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CommunitySidebar from "../components/CommunitySidebar";
import CommunityFeedView from "../components/CommunityFeedView";
import CommunityProfileView from "../components/CommunityProfileView";
import CommunityBookmarksView from "../components/CommunityBookmarksView";
import CommunityLikedView from "../components/CommunityLikedView";
import CommunityNotificationsView from "../components/CommunityNotificationsView";
import "./Community.css";

const ROOT_COMMENTS_LIMIT = 2;
const REPLY_LIMIT = 2;
const MAX_INLINE_REPLY_DEPTH = 1;

function normalizeCommentsForUi(
  comments = [],
  rootLimit = ROOT_COMMENTS_LIMIT,
  replyLimit = REPLY_LIMIT
) {
  const safeComments = Array.isArray(comments) ? comments : [];
  const visibleRoot = safeComments.slice(0, rootLimit);

  function normalizeNode(comment, depth = 0) {
    const replies = Array.isArray(comment.replies) ? comment.replies : [];

    const shouldCollapseDeeperReplies =
      depth >= MAX_INLINE_REPLY_DEPTH && replies.length > 0;

    const visibleReplies = shouldCollapseDeeperReplies
      ? []
      : replies.slice(0, replyLimit);

    return {
      ...comment,
      depth,
      replies: visibleReplies.map((reply) => normalizeNode(reply, depth + 1)),
      hasMoreReplies: shouldCollapseDeeperReplies || replies.length > replyLimit,
    };
  }

  return {
    comments: visibleRoot.map((comment) => normalizeNode(comment, 0)),
    hasMoreComments: safeComments.length > rootLimit,
  };
}

function enrichPosts(posts = []) {
  return (posts || []).map((post) => {
    const normalized = normalizeCommentsForUi(post.comments || []);
    return {
      ...post,
      comments: normalized.comments,
      hasMoreComments: normalized.hasMoreComments,
      commentsPage: 1,
      loadedRootCount: normalized.comments.length,
      rootCommentsTotal: Array.isArray(post.comments) ? post.comments.length : 0,
    };
  });
}

function mergeRepliesByCommentId(comments = [], commentId, newReplies = [], hasMore = false) {
  return comments.map((comment) => {
    if (String(comment.id) === String(commentId)) {
      const existingIds = new Set((comment.replies || []).map((reply) => String(reply.id)));
      const filteredIncoming = (newReplies || []).filter(
        (reply) => !existingIds.has(String(reply.id))
      );

      return {
        ...comment,
        replies: [...(comment.replies || []), ...filteredIncoming],
        hasMoreReplies: hasMore,
      };
    }

    return {
      ...comment,
      replies: mergeRepliesByCommentId(comment.replies || [], commentId, newReplies, hasMore),
    };
  });
}

function findCommentById(comments = [], commentId) {
  for (const comment of comments) {
    if (String(comment.id) === String(commentId)) return comment;
    const found = findCommentById(comment.replies || [], commentId);
    if (found) return found;
  }
  return null;
}

export default function Community() {
  const me = getUser();

  const [activeView, setActiveView] = useState("home");
  const [selectedProfileId, setSelectedProfileId] = useState(me?.id || "");
  const [selectedProfile, setSelectedProfile] = useState(null);

  const [feedPosts, setFeedPosts] = useState([]);
  const [feedPagination, setFeedPagination] = useState({
    page: 1,
    hasMore: false,
  });

  const [profilePosts, setProfilePosts] = useState([]);
  const [profilePagination, setProfilePagination] = useState({
    page: 1,
    hasMore: false,
  });

  const [bookmarkPosts, setBookmarkPosts] = useState([]);
  const [bookmarkPagination, setBookmarkPagination] = useState({
    page: 1,
    hasMore: false,
  });

  const [likedPosts, setLikedPosts] = useState([]);
  const [likedPagination, setLikedPagination] = useState({
    page: 1,
    hasMore: false,
  });

  const [notifications, setNotifications] = useState([]);
  const [notificationsPagination, setNotificationsPagination] = useState({
    page: 1,
    hasMore: false,
  });

  const [profileStats, setProfileStats] = useState({
    followersCount: 0,
    followingCount: 0,
    postsCount: 0,
  });

  const [search, setSearch] = useState("");
  const [commentDrafts, setCommentDrafts] = useState({});
  const [notificationCommentDrafts, setNotificationCommentDrafts] = useState({});
  const [loadingCommentsFor, setLoadingCommentsFor] = useState("");
  const [loadingRepliesId, setLoadingRepliesId] = useState("");
  const [commentingNotificationId, setCommentingNotificationId] = useState("");

  const [loadingMain, setLoadingMain] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingBookmarks, setLoadingBookmarks] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const [loadingFeedMore, setLoadingFeedMore] = useState(false);
  const [loadingProfileMore, setLoadingProfileMore] = useState(false);
  const [loadingBookmarksMore, setLoadingBookmarksMore] = useState(false);
  const [loadingLikesMore, setLoadingLikesMore] = useState(false);
  const [loadingNotificationsMore, setLoadingNotificationsMore] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [composer, setComposer] = useState({
    postType: "post",
    text: "",
    locationText: "",
    tags: "",
    mediaFiles: [],
  });

  const unreadNotificationsCount = useMemo(() => {
    return (notifications || []).filter((item) => !item.isRead).length;
  }, [notifications]);

  useEffect(() => {
    loadInitialHome();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeView === "profile" && selectedProfileId) {
      loadProfileView(selectedProfileId, true);
    } else if (activeView === "bookmarks") {
      loadBookmarks(true);
    } else if (activeView === "likes") {
      loadLikes(true);
    } else if (activeView === "notifications") {
      loadNotifications(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, selectedProfileId]);

  async function loadInitialHome() {
    try {
      setLoadingMain(true);
      setError("");

      const requests = [apiFetch("/api/community/feed?page=1&limit=10")];

      if (me?.id) {
        requests.push(apiFetch(`/api/community/profile/${me.id}`));
        requests.push(apiFetch("/api/community/me/notifications?page=1&limit=20"));
      }

      const [feedRes, myProfileRes, notificationsRes] = await Promise.all(requests);

      setFeedPosts(enrichPosts(feedRes.posts || []));
      setFeedPagination(feedRes.pagination || { page: 1, hasMore: false });

      if (myProfileRes?.profile) {
        setProfileStats({
          followersCount: myProfileRes.profile.followersCount || 0,
          followingCount: myProfileRes.profile.followingCount || 0,
          postsCount: myProfileRes.profile.postsCount || 0,
        });
        setSelectedProfile(myProfileRes.profile);
      }

      if (notificationsRes?.notifications) {
        setNotifications(notificationsRes.notifications || []);
        setNotificationsPagination(
          notificationsRes.pagination || { page: 1, hasMore: false }
        );
      }
    } catch (err) {
      setError(err.message || "Failed to load community.");
    } finally {
      setLoadingMain(false);
    }
  }

  async function applySearch() {
    try {
      setLoadingMain(true);
      setError("");

      const res = await apiFetch(
        `/api/community/feed?page=1&limit=10&q=${encodeURIComponent(search)}`
      );

      setFeedPosts(enrichPosts(res.posts || []));
      setFeedPagination(res.pagination || { page: 1, hasMore: false });
      setActiveView("home");
    } catch (err) {
      setError(err.message || "Failed to search posts.");
    } finally {
      setLoadingMain(false);
    }
  }

  async function loadMoreFeed() {
    if (!feedPagination.hasMore || loadingFeedMore) return;

    try {
      setLoadingFeedMore(true);

      const nextPage = (feedPagination.page || 1) + 1;
      const res = await apiFetch(
        `/api/community/feed?page=${nextPage}&limit=10&q=${encodeURIComponent(search)}`
      );

      setFeedPosts((prev) => [...prev, ...enrichPosts(res.posts || [])]);
      setFeedPagination(res.pagination || { page: nextPage, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingFeedMore(false);
    }
  }

  async function loadProfileView(userId, reset = false) {
    try {
      if (reset) {
        setLoadingProfile(true);
      } else {
        setLoadingProfileMore(true);
      }

      const page = reset ? 1 : (profilePagination.page || 1) + 1;

      const [profileRes, postsRes] = await Promise.all([
        apiFetch(`/api/community/profile/${userId}`),
        apiFetch(`/api/community/profile/${userId}/posts?page=${page}&limit=10`),
      ]);

      setSelectedProfile(profileRes.profile || null);

      const nextPosts = enrichPosts(postsRes.posts || []).map((post) => ({
        ...post,
        showDelete: String(userId) === String(me?.id),
      }));

      if (reset) {
        setProfilePosts(nextPosts);
      } else {
        setProfilePosts((prev) => [...prev, ...nextPosts]);
      }

      setProfilePagination(postsRes.pagination || { page, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoadingProfile(false);
      setLoadingProfileMore(false);
    }
  }

  async function loadBookmarks(reset = false) {
    try {
      if (reset) {
        setLoadingBookmarks(true);
      } else {
        setLoadingBookmarksMore(true);
      }

      const page = reset ? 1 : (bookmarkPagination.page || 1) + 1;
      const res = await apiFetch(`/api/community/me/bookmarks?page=${page}&limit=10`);

      if (reset) {
        setBookmarkPosts(enrichPosts(res.posts || []));
      } else {
        setBookmarkPosts((prev) => [...prev, ...enrichPosts(res.posts || [])]);
      }

      setBookmarkPagination(res.pagination || { page, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load bookmarks.");
    } finally {
      setLoadingBookmarks(false);
      setLoadingBookmarksMore(false);
    }
  }

  async function loadLikes(reset = false) {
    try {
      if (reset) {
        setLoadingLikes(true);
      } else {
        setLoadingLikesMore(true);
      }

      const page = reset ? 1 : (likedPagination.page || 1) + 1;
      const res = await apiFetch(`/api/community/me/likes?page=${page}&limit=10`);

      if (reset) {
        setLikedPosts(enrichPosts(res.posts || []));
      } else {
        setLikedPosts((prev) => [...prev, ...enrichPosts(res.posts || [])]);
      }

      setLikedPagination(res.pagination || { page, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load liked posts.");
    } finally {
      setLoadingLikes(false);
      setLoadingLikesMore(false);
    }
  }

  async function loadNotifications(reset = false) {
    try {
      if (reset) {
        setLoadingNotifications(true);
      } else {
        setLoadingNotificationsMore(true);
      }

      const page = reset ? 1 : (notificationsPagination.page || 1) + 1;
      const res = await apiFetch(`/api/community/me/notifications?page=${page}&limit=15`);

      if (reset) {
        const freshNotifications = (res.notifications || []).map((item) => ({
          ...item,
          isRead: true,
        }));
        setNotifications(freshNotifications);
        await apiFetch("/api/community/me/notifications/read", { method: "POST" });
      } else {
        setNotifications((prev) => [...prev, ...(res.notifications || [])]);
      }

      setNotificationsPagination(res.pagination || { page, hasMore: false });
    } catch (err) {
      setError(err.message || "Failed to load notifications.");
    } finally {
      setLoadingNotifications(false);
      setLoadingNotificationsMore(false);
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
      });

      const res = await apiFetch("/api/community", {
        method: "POST",
        body: fd,
      });

      const freshPost = {
        ...res.post,
        ...normalizeCommentsForUi(res.post.comments || []),
        commentsPage: 1,
        loadedRootCount: Array.isArray(res.post.comments)
          ? Math.min(res.post.comments.length, ROOT_COMMENTS_LIMIT)
          : 0,
        rootCommentsTotal: Array.isArray(res.post.comments) ? res.post.comments.length : 0,
        showDelete: true,
      };

      setFeedPosts((prev) => [freshPost, ...prev]);
      setProfilePosts((prev) => [freshPost, ...prev]);

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

      setActiveView("profile");
      setSelectedProfileId(me?.id || "");
    } catch (err) {
      setError(err.message || "Failed to create post.");
    } finally {
      setSubmitting(false);
    }
  }

  function updatePostAcrossViews(postId, updater) {
    setFeedPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
    setProfilePosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
    setBookmarkPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
    setLikedPosts((prev) => prev.map((post) => (post.id === postId ? updater(post) : post)));
  }

  function replacePostAcrossViews(nextPost) {
    const enriched = {
      ...nextPost,
      ...normalizeCommentsForUi(nextPost.comments || []),
      commentsPage: 1,
      loadedRootCount: Array.isArray(nextPost.comments)
        ? Math.min(nextPost.comments.length, ROOT_COMMENTS_LIMIT)
        : 0,
      rootCommentsTotal: Array.isArray(nextPost.comments) ? nextPost.comments.length : 0,
    };

    setFeedPosts((prev) =>
      prev.map((post) =>
        post.id === enriched.id ? { ...enriched, showDelete: post.showDelete } : post
      )
    );

    setProfilePosts((prev) =>
      prev.map((post) =>
        post.id === enriched.id ? { ...enriched, showDelete: true } : post
      )
    );

    setBookmarkPosts((prev) =>
      prev.map((post) =>
        post.id === enriched.id ? { ...enriched, showDelete: post.showDelete } : post
      )
    );

    setLikedPosts((prev) =>
      prev.map((post) =>
        post.id === enriched.id ? { ...enriched, showDelete: post.showDelete } : post
      )
    );
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

      replacePostAcrossViews(res.post);
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

      updatePostAcrossViews(postId, (post) => ({
        ...post,
        isBookmarkedByMe: res.isBookmarkedByMe,
        bookmarksCount: res.bookmarksCount,
      }));

      if (!res.isBookmarkedByMe) {
        setBookmarkPosts((prev) => prev.filter((post) => post.id !== postId));
      }
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

  function setNotificationCommentText(notificationId, value) {
    setNotificationCommentDrafts((prev) => ({
      ...prev,
      [notificationId]: value,
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

      replacePostAcrossViews(res.post);

      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  }

  async function handleReplyFromNotification(notification) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    const postId = notification?.post?.id;
    if (!postId) {
      setError("Post not available.");
      return;
    }

    const text = String(notificationCommentDrafts[notification.id] || "").trim();
    if (!text) return;

    try {
      setCommentingNotificationId(notification.id);

      const body = { text };

      if (
        ["comment_post", "reply_comment", "mention_comment"].includes(notification.type) &&
        notification.commentId
      ) {
        body.parentComment = notification.commentId;
      }

      const res = await apiFetch(`/api/community/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify(body),
      });

      replacePostAcrossViews(res.post);

      setNotificationCommentDrafts((prev) => ({
        ...prev,
        [notification.id]: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to reply from notification.");
    } finally {
      setCommentingNotificationId("");
    }
  }

  async function handleReply(postId, parentCommentId, text) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({
          text,
          parentComment: parentCommentId,
        }),
      });

      replacePostAcrossViews(res.post);
    } catch (err) {
      setError(err.message || "Failed to add reply.");
    }
  }

  async function handleLoadComments(postId) {
    try {
      setLoadingCommentsFor(postId);

      const target =
        feedPosts.find((post) => post.id === postId) ||
        profilePosts.find((post) => post.id === postId) ||
        bookmarkPosts.find((post) => post.id === postId) ||
        likedPosts.find((post) => post.id === postId);

      const nextPage = (target?.commentsPage || 1) + 1;

      const res = await apiFetch(
        `/api/community/${postId}/comments?page=${nextPage}&limit=${ROOT_COMMENTS_LIMIT}`
      );

      const comments = res.comments || [];
      const total = res.pagination?.total || comments.length;

      updatePostAcrossViews(postId, (post) => ({
        ...post,
        comments: [...(post.comments || []), ...comments],
        commentsPage: nextPage,
        loadedRootCount: (post.loadedRootCount || 0) + comments.length,
        rootCommentsTotal: total,
        hasMoreComments: res.pagination?.hasMore || false,
      }));
    } catch (err) {
      setError(err.message || "Failed to load more comments.");
    } finally {
      setLoadingCommentsFor("");
    }
  }

  async function handleLoadReplies(postId, commentId) {
    try {
      setLoadingRepliesId(commentId);

      const target =
        feedPosts.find((post) => post.id === postId) ||
        profilePosts.find((post) => post.id === postId) ||
        bookmarkPosts.find((post) => post.id === postId) ||
        likedPosts.find((post) => post.id === postId);

      const targetComment = findCommentById(target?.comments || [], commentId);
      const currentReplyCount = targetComment?.replies?.length || 0;
      const nextPage = Math.floor(currentReplyCount / REPLY_LIMIT) + 1;

      const res = await apiFetch(
        `/api/community/${postId}/comments/${commentId}/replies?page=${nextPage}&limit=${REPLY_LIMIT}`
      );

      const newReplies = res.replies || [];

      updatePostAcrossViews(postId, (post) => ({
        ...post,
        comments: mergeRepliesByCommentId(
          post.comments || [],
          commentId,
          newReplies,
          res.pagination?.hasMore || false
        ),
      }));
    } catch (err) {
      setError(err.message || "Failed to load replies.");
    } finally {
      setLoadingRepliesId("");
    }
  }

  async function handleDelete(postId) {
    try {
      await apiFetch(`/api/community/${postId}`, {
        method: "DELETE",
      });

      setFeedPosts((prev) => prev.filter((post) => post.id !== postId));
      setProfilePosts((prev) => prev.filter((post) => post.id !== postId));
      setBookmarkPosts((prev) => prev.filter((post) => post.id !== postId));
      setLikedPosts((prev) => prev.filter((post) => post.id !== postId));

      setProfileStats((prev) => ({
        ...prev,
        postsCount: Math.max((prev.postsCount || 1) - 1, 0),
      }));
    } catch (err) {
      setError(err.message || "Failed to delete post.");
    }
  }

  async function handleToggleFollow() {
    if (!selectedProfileId || !isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const res = await apiFetch(`/api/community/profile/${selectedProfileId}/follow`, {
        method: "POST",
      });

      setSelectedProfile(res.profile || null);
    } catch (err) {
      setError(err.message || "Failed to update follow status.");
    }
  }

  const sharedProps = {
    onLike: handleLike,
    onBookmark: handleBookmark,
    onDelete: handleDelete,
    onComment: handleComment,
    onReply: handleReply,
    onLoadComments: handleLoadComments,
    onLoadReplies: handleLoadReplies,
    commentDrafts,
    setCommentText,
    loadingCommentsFor,
    loadingRepliesId,
  };

  return (
    <div className="container communityPage">
      {error ? <div className="communityPageAlert">{error}</div> : null}

      <div className="communityPageLayout">
        <CommunitySidebar
          me={me}
          profileStats={profileStats}
          activeView={activeView}
          unreadNotificationsCount={unreadNotificationsCount}
          onChangeView={(view) => {
            if (view === "profile") {
              setSelectedProfileId(me?.id || "");
            }
            setActiveView(view);
          }}
        />

        <main className="communityPageMain">
          {activeView === "home" ? (
            <CommunityFeedView
              search={search}
              setSearch={setSearch}
              onApplySearch={applySearch}
              posts={feedPosts}
              loading={loadingMain}
              pagination={feedPagination}
              loadingMore={loadingFeedMore}
              onLoadMore={loadMoreFeed}
              {...sharedProps}
            />
          ) : null}

          {activeView === "profile" ? (
            <CommunityProfileView
              profile={selectedProfile}
              isOwnProfile={String(selectedProfileId) === String(me?.id)}
              composer={composer}
              setComposer={setComposer}
              submitting={submitting}
              onCreatePost={handleCreatePost}
              posts={profilePosts}
              pagination={profilePagination}
              loading={loadingProfile}
              loadingMore={loadingProfileMore}
              onLoadMore={() => loadProfileView(selectedProfileId, false)}
              onToggleFollow={handleToggleFollow}
              {...sharedProps}
            />
          ) : null}

          {activeView === "bookmarks" ? (
            <CommunityBookmarksView
              posts={bookmarkPosts}
              pagination={bookmarkPagination}
              loading={loadingBookmarks}
              loadingMore={loadingBookmarksMore}
              onLoadMore={() => loadBookmarks(false)}
              {...sharedProps}
            />
          ) : null}

          {activeView === "likes" ? (
            <CommunityLikedView
              posts={likedPosts}
              pagination={likedPagination}
              loading={loadingLikes}
              loadingMore={loadingLikesMore}
              onLoadMore={() => loadLikes(false)}
              {...sharedProps}
            />
          ) : null}

          {activeView === "notifications" ? (
            <CommunityNotificationsView
              notifications={notifications}
              pagination={notificationsPagination}
              loading={loadingNotifications}
              loadingMore={loadingNotificationsMore}
              onLoadMore={() => loadNotifications(false)}
              notificationCommentDrafts={notificationCommentDrafts}
              setNotificationCommentText={setNotificationCommentText}
              onReplyFromNotification={handleReplyFromNotification}
              commentingNotificationId={commentingNotificationId}
            />
          ) : null}
        </main>
      </div>
    </div>
  );
}