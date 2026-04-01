import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SocialLayout.css";
import "./SocialHome.css";

const createPostTypeOptions = [
  { label: "Text Post", value: "text" },
  { label: "Photo Post", value: "photo" },
  { label: "Video Post", value: "video" },
];

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

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function extractUsernameFromProfile(profile) {
  return profile?.username || profile?.handle || "";
}

function buildCommentPaginationMap(posts) {
  const map = {};
  for (const post of posts) {
    map[post.id] = {
      page: 1,
      hasMore: !!post.hasMoreComments,
      loading: false,
    };
  }
  return map;
}

function SocialSidebar({ profile, notificationsCount = 0 }) {
  const username = extractUsernameFromProfile(profile);

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
            <strong>{profile?.displayName || "Your Profile"}</strong>
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
        <NavLink to="/community" end className="socialNavItem">
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
          {notificationsCount > 0 ? (
            <span className="socialNavBadge">{notificationsCount}</span>
          ) : null}
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

function PostCard({
  post,
  me,
  commentDrafts,
  replyDrafts,
  replyBoxOpen,
  commentPaging,
  onLikePost,
  onBookmarkPost,
  onSubmitComment,
  onSetCommentDraft,
  onToggleCommentLike,
  onToggleReplyBox,
  onSetReplyDraft,
  onSubmitReply,
  onLoadMoreComments,
}) {
  const username = post.author?.username || "";
  const pageState = commentPaging[post.id] || { hasMore: false, loading: false };

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
              {username ? (
                <Link to={`/social/profile/${username}`} className="socialInlineLink">
                  @{username}
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

      {post.hashtags?.length ? (
        <div className="socialHashtagRow">
          {post.hashtags.map((tag) => (
            <button key={tag} type="button" className="socialTagBtn">
              #{tag}
            </button>
          ))}
        </div>
      ) : null}

      {post.media?.length ? (
        <div
          className={`socialMediaGrid ${
            post.media.length === 1 ? "single" : post.media.length === 2 ? "double" : "multi"
          }`}
        >
          {post.media.map((item, index) =>
            item.type === "video" ? (
              <video key={`${item.url}-${index}`} className="socialMediaItem" controls>
                <source src={item.url} />
              </video>
            ) : (
              <img
                key={`${item.url}-${index}`}
                src={item.url}
                alt="post media"
                className="socialMediaItem"
              />
            )
          )}
        </div>
      ) : null}

      <div className="socialActionBar">
        <button
          type="button"
          className={`socialActionBtn ${post.isLikedByMe ? "active" : ""}`}
          onClick={() => onLikePost(post.id)}
        >
          ❤️ {post.likesCount}
        </button>

        <button
          type="button"
          className={`socialActionBtn ${post.isBookmarkedByMe ? "active" : ""}`}
          onClick={() => onBookmarkPost(post.id)}
        >
          🔖 {post.bookmarksCount || 0}
        </button>

        <div className="socialActionStatic">💬 {post.commentsCount}</div>
      </div>

      <div className="socialCommentComposer">
        <input
          value={commentDrafts[post.id] || ""}
          onChange={(e) => onSetCommentDraft(post.id, e.target.value)}
          placeholder="Write a comment..."
        />
        <button type="button" onClick={() => onSubmitComment(post.id)}>
          Comment
        </button>
      </div>

      <div className="socialCommentList">
        {(post.comments || []).map((comment) => (
          <div key={comment.id} className="socialCommentItem">
            <div className="socialCommentHead">
              <div className="socialCommentAuthor">
                {comment.user?.avatar ? (
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.name}
                    className="socialCommentAvatar"
                  />
                ) : (
                  <div className="socialCommentAvatarFallback">
                    {getInitial(comment.user?.name)}
                  </div>
                )}

                <div className="socialCommentAuthorText">
                  <strong>{comment.user?.name || "User"}</strong>
                  <span>{formatTime(comment.createdAt)}</span>
                </div>
              </div>

              <div className="socialCommentActions">
                <button
                  type="button"
                  className={`socialTinyBtn ${comment.isLikedByMe ? "active" : ""}`}
                  onClick={() => onToggleCommentLike(post.id, comment.id)}
                >
                  ❤️ {comment.likesCount}
                </button>

                <button
                  type="button"
                  className="socialTinyBtn"
                  onClick={() => onToggleReplyBox(comment.id)}
                >
                  Reply
                </button>
              </div>
            </div>

            <div className="socialCommentText">{comment.text}</div>

            {replyBoxOpen[comment.id] ? (
              <div className="socialReplyComposer">
                <input
                  value={replyDrafts[comment.id] || ""}
                  onChange={(e) => onSetReplyDraft(comment.id, e.target.value)}
                  placeholder="Write a reply..."
                />
                <button type="button" onClick={() => onSubmitReply(post.id, comment.id)}>
                  Send
                </button>
              </div>
            ) : null}

            {(comment.replies || []).length ? (
              <div className="socialReplyList">
                {comment.replies.map((reply) => (
                  <div key={reply.id} className="socialReplyItem">
                    <div className="socialReplyTop">
                      <strong>{reply.user?.name || "User"}</strong>
                      <span>{formatTime(reply.createdAt)}</span>
                    </div>
                    <div className="socialReplyText">{reply.text}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {pageState.hasMore ? (
        <button
          type="button"
          className="socialLoadMoreCommentsBtn"
          onClick={() => onLoadMoreComments(post.id)}
          disabled={pageState.loading}
        >
          {pageState.loading ? "Loading..." : "Load more comments"}
        </button>
      ) : null}
    </article>
  );
}

export default function Community() {
  const me = getUser();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [feed, setFeed] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    hasMore: false,
    limit: 10,
    total: 0,
  });
  const [notificationsCount, setNotificationsCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [loadingMoreFeed, setLoadingMoreFeed] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState({ profiles: [], posts: [] });
  const [searching, setSearching] = useState(false);

  const [quickPost, setQuickPost] = useState({
    postType: "text",
    text: "",
  });

  const [commentDrafts, setCommentDrafts] = useState({});
  const [replyDrafts, setReplyDrafts] = useState({});
  const [replyBoxOpen, setReplyBoxOpen] = useState({});
  const [commentPaging, setCommentPaging] = useState({});

  const searchHasResults =
    (searchResults.profiles || []).length > 0 || (searchResults.posts || []).length > 0;

  const profileUsername = useMemo(() => extractUsernameFromProfile(profile), [profile]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");

        const requests = [apiFetch("/api/social/feed?limit=10&page=1")];

        if (isLoggedIn()) {
          requests.push(apiFetch("/api/social/profile/me"));
          requests.push(apiFetch("/api/social/notifications"));
        }

        const [feedRes, profileRes, notificationsRes] = await Promise.all(requests);

        setFeed(feedRes.posts || []);
        setPagination(feedRes.pagination || { page: 1, hasMore: false, limit: 10, total: 0 });
        setCommentPaging(buildCommentPaginationMap(feedRes.posts || []));

        if (profileRes?.profile) {
          setProfile(profileRes.profile);
        }

        if (notificationsRes?.notifications) {
          setNotificationsCount(
            notificationsRes.notifications.filter((item) => !item.isRead).length
          );
        }
      } catch (err) {
        setError(err.message || "Failed to load community feed.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, []);

  async function handleLoadMoreFeed() {
    if (!pagination.hasMore || loadingMoreFeed) return;

    try {
      setLoadingMoreFeed(true);
      const nextPage = pagination.page + 1;
      const data = await apiFetch(`/api/social/feed?limit=10&page=${nextPage}`);

      setFeed((prev) => [...prev, ...(data.posts || [])]);
      setPagination(data.pagination || pagination);
      setCommentPaging((prev) => ({
        ...prev,
        ...buildCommentPaginationMap(data.posts || []),
      }));
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMoreFeed(false);
    }
  }

  async function handleSearch() {
    if (!search.trim()) {
      setSearchResults({ profiles: [], posts: [] });
      return;
    }

    try {
      setSearching(true);
      const data = await apiFetch(`/api/social/search?q=${encodeURIComponent(search.trim())}`);
      setSearchResults({
        profiles: data.profiles || [],
        posts: data.posts || [],
      });
    } catch (err) {
      setError(err.message || "Failed to search.");
    } finally {
      setSearching(false);
    }
  }

  async function handleQuickCreate() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (!quickPost.text.trim()) {
      setError("Write something first.");
      return;
    }

    try {
      setError("");

      const formData = new FormData();
      formData.append("text", quickPost.text.trim());

      await apiFetch("/api/social/posts", {
        method: "POST",
        body: formData,
      });

      setQuickPost({ postType: "text", text: "" });

      const data = await apiFetch("/api/social/feed?limit=10&page=1");
      setFeed(data.posts || []);
      setPagination(data.pagination || { page: 1, hasMore: false, limit: 10, total: 0 });
      setCommentPaging(buildCommentPaginationMap(data.posts || []));
    } catch (err) {
      setError(err.message || "Failed to create post.");
    }
  }

  async function handleLikePost(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(`/api/social/posts/${postId}/like`, {
        method: "POST",
      });

      setFeed((prev) =>
        prev.map((post) =>
          String(post.id) === String(postId)
            ? {
                ...post,
                likesCount: data.likesCount,
                isLikedByMe: data.isLikedByMe,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to like post.");
    }
  }

  async function handleBookmarkPost(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(`/api/social/posts/${postId}/bookmark`, {
        method: "POST",
      });

      setFeed((prev) =>
        prev.map((post) =>
          String(post.id) === String(postId)
            ? {
                ...post,
                bookmarksCount: data.bookmarksCount,
                isBookmarkedByMe: data.isBookmarkedByMe,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to bookmark post.");
    }
  }

  function setCommentDraft(postId, value) {
    setCommentDrafts((prev) => ({
      ...prev,
      [postId]: value,
    }));
  }

  async function handleSubmitComment(postId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const text = String(commentDrafts[postId] || "").trim();
    if (!text) return;

    try {
      const data = await apiFetch(`/api/social/posts/${postId}/comments`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      setFeed((prev) =>
        prev.map((post) => (String(post.id) === String(postId) ? data.post : post))
      );

      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: "",
      }));

      setCommentPaging((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          hasMore: false,
        },
      }));
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  }

  async function handleToggleCommentLike(postId, commentId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    try {
      const data = await apiFetch(
        `/api/social/posts/${postId}/comments/${commentId}/like`,
        { method: "POST" }
      );

      setFeed((prev) =>
        prev.map((post) => {
          if (String(post.id) !== String(postId)) return post;

          return {
            ...post,
            comments: (post.comments || []).map((comment) =>
              String(comment.id) === String(commentId)
                ? {
                    ...comment,
                    likesCount: data.likesCount,
                    isLikedByMe: data.isLikedByMe,
                  }
                : comment
            ),
          };
        })
      );
    } catch (err) {
      setError(err.message || "Failed to like comment.");
    }
  }

  function handleToggleReplyBox(commentId) {
    setReplyBoxOpen((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  }

  function setReplyDraft(commentId, value) {
    setReplyDrafts((prev) => ({
      ...prev,
      [commentId]: value,
    }));
  }

  async function handleSubmitReply(postId, commentId) {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    const text = String(replyDrafts[commentId] || "").trim();
    if (!text) return;

    try {
      const data = await apiFetch(
        `/api/social/posts/${postId}/comments/${commentId}/reply`,
        {
          method: "POST",
          body: JSON.stringify({ text }),
        }
      );

      setFeed((prev) =>
        prev.map((post) => (String(post.id) === String(postId) ? data.post : post))
      );

      setReplyDrafts((prev) => ({
        ...prev,
        [commentId]: "",
      }));

      setReplyBoxOpen((prev) => ({
        ...prev,
        [commentId]: false,
      }));
    } catch (err) {
      setError(err.message || "Failed to add reply.");
    }
  }

  async function handleLoadMoreComments(postId) {
    const currentState = commentPaging[postId] || { page: 1, hasMore: true, loading: false };
    if (!currentState.hasMore || currentState.loading) return;

    try {
      setCommentPaging((prev) => ({
        ...prev,
        [postId]: {
          ...currentState,
          loading: true,
        },
      }));

      const nextPage = currentState.page + 1;
      const data = await apiFetch(`/api/social/posts/${postId}/comments?page=${nextPage}&limit=5`);

      setFeed((prev) =>
        prev.map((post) =>
          String(post.id) === String(postId)
            ? {
                ...post,
                comments: [...(post.comments || []), ...(data.comments || [])],
                hasMoreComments: data.pagination?.hasMore || false,
              }
            : post
        )
      );

      setCommentPaging((prev) => ({
        ...prev,
        [postId]: {
          page: nextPage,
          hasMore: data.pagination?.hasMore || false,
          loading: false,
        },
      }));
    } catch (err) {
      setError(err.message || "Failed to load more comments.");
      setCommentPaging((prev) => ({
        ...prev,
        [postId]: {
          ...(prev[postId] || {}),
          loading: false,
        },
      }));
    }
  }

  return (
    <div className="container socialPage">
      {error ? <div className="socialAlert">{error}</div> : null}

      <div className="socialLayout">
        <SocialSidebar
          profile={profile}
          notificationsCount={notificationsCount}
        />

        <main className="socialMain">
          <div className="socialCard socialTopBar">
            <div className="socialTopBarLeft">
              <h1>Community</h1>
              <p>Share ideas, photos, videos, and travel stories.</p>
            </div>

            <div className="socialTopBarRight">
              <div className="socialSearchWrap">
                <input
                  className="socialSearchInput"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search people or #hashtags"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                />
                <button type="button" className="socialPrimaryBtn" onClick={handleSearch}>
                  {searching ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </div>

          {search.trim() ? (
            <div className="socialCard socialSearchResultCard">
              <div className="socialSearchSection">
                <h3>People</h3>
                {(searchResults.profiles || []).length === 0 ? (
                  <div className="socialMutedCard">No people found.</div>
                ) : (
                  <div className="socialProfileResultList">
                    {searchResults.profiles.map((item) => (
                      <Link
                        key={item.id}
                        to={`/social/profile/${extractUsernameFromProfile(item)}`}
                        className="socialProfileResultItem"
                      >
                        {item.profileImage ? (
                          <img
                            src={item.profileImage}
                            alt={item.displayName || item.username}
                            className="socialCommentAvatar"
                          />
                        ) : (
                          <div className="socialCommentAvatarFallback">
                            {getInitial(item.displayName || item.username)}
                          </div>
                        )}
                        <div>
                          <strong>{item.displayName || item.username}</strong>
                          <span>@{item.username}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="socialSearchSection">
                <h3>Posts</h3>
                {!searchHasResults ? (
                  <div className="socialMutedCard">No results found.</div>
                ) : (searchResults.posts || []).length === 0 ? (
                  <div className="socialMutedCard">No posts found.</div>
                ) : (
                  <div className="socialMiniPostList">
                    {searchResults.posts.map((item) => (
                      <div key={item.id} className="socialMiniPostItem">
                        <strong>{item.author?.name || "User"}</strong>
                        <p>{item.text || "Media post"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {isLoggedIn() ? (
            <div className="socialCard socialQuickComposerCard">
              <div className="socialQuickComposerTop">
                {profile?.profileImage ? (
                  <img
                    src={profile.profileImage}
                    alt={profile.displayName || profile.username}
                    className="socialProfileAvatar"
                  />
                ) : (
                  <div className="socialProfileAvatarFallback">
                    {getInitial(profile?.displayName || profile?.username)}
                  </div>
                )}

                <div className="socialQuickComposerFields">
                  <CustomSelect
                    value={quickPost.postType}
                    onChange={(e) =>
                      setQuickPost((prev) => ({ ...prev, postType: e.target.value }))
                    }
                    options={createPostTypeOptions}
                    placeholder="Choose type"
                  />

                  <textarea
                    className="socialQuickComposerTextarea"
                    value={quickPost.text}
                    onChange={(e) =>
                      setQuickPost((prev) => ({ ...prev, text: e.target.value }))
                    }
                    placeholder="What's happening in your trip world?"
                    rows={4}
                  />

                  <div className="socialQuickComposerActions">
                    <button
                      type="button"
                      className="socialGhostBtn"
                      onClick={() => navigate("/social/create")}
                    >
                      Advanced Create Post
                    </button>

                    <button
                      type="button"
                      className="socialPrimaryBtn"
                      onClick={handleQuickCreate}
                    >
                      Post Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? (
            <LoadingSpinner text="Loading feed..." />
          ) : feed.length === 0 ? (
            <div className="socialCard socialEmptyState">
              No posts yet. Start the conversation.
            </div>
          ) : (
            <div className="socialFeedList">
              {feed.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  me={me}
                  commentDrafts={commentDrafts}
                  replyDrafts={replyDrafts}
                  replyBoxOpen={replyBoxOpen}
                  commentPaging={commentPaging}
                  onLikePost={handleLikePost}
                  onBookmarkPost={handleBookmarkPost}
                  onSubmitComment={handleSubmitComment}
                  onSetCommentDraft={setCommentDraft}
                  onToggleCommentLike={handleToggleCommentLike}
                  onToggleReplyBox={handleToggleReplyBox}
                  onSetReplyDraft={setReplyDraft}
                  onSubmitReply={handleSubmitReply}
                  onLoadMoreComments={handleLoadMoreComments}
                />
              ))}

              {pagination.hasMore ? (
                <button
                  type="button"
                  className="socialLoadMoreBtn"
                  onClick={handleLoadMoreFeed}
                  disabled={loadingMoreFeed}
                >
                  {loadingMoreFeed ? "Loading..." : "Load More Posts"}
                </button>
              ) : null}
            </div>
          )}
        </main>

        <aside className="socialRightBar">
          <div className="socialCard socialTipsCard">
            <h3>Tips</h3>
            <div className="socialTipsList">
              <div>Use hashtags like #goa #budget #roadtrip</div>
              <div>Photo and video posts get more engagement</div>
              <div>Reply to comments to grow your network</div>
            </div>
          </div>

          <div className="socialCard socialShortcutCard">
            <h3>Quick Shortcuts</h3>
            <div className="socialShortcutList">
              <Link to="/social/create" className="socialShortcutItem">
                Create full post
              </Link>
              <Link
                to={profileUsername ? `/social/profile/${profileUsername}` : "/social/profile/me"}
                className="socialShortcutItem"
              >
                Open profile
              </Link>
              <Link to="/social/bookmarks" className="socialShortcutItem">
                View bookmarks
              </Link>
              <Link to="/social/liked" className="socialShortcutItem">
                View liked posts
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}