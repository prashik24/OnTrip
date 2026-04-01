import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Community.css";

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
  return String(name).trim().charAt(0).toUpperCase() || "U";
}

function normalizeTagInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().replace(/^#/, ""))
    .filter(Boolean)
    .join(", ");
}

const postTypeOptions = [
  { label: "Normal Post", value: "post" },
  { label: "Question", value: "question" },
  { label: "Trip Story", value: "trip_story" },
  { label: "Provider Offer", value: "provider_offer" },
  { label: "Poll", value: "poll" },
];

const filterOptions = [
  { label: "All Feed", value: "all" },
  { label: "Questions", value: "questions" },
  { label: "Stories", value: "stories" },
  { label: "Provider Offers", value: "offers" },
  { label: "Polls", value: "polls" },
];

function PostCard({
  post,
  me,
  onLike,
  onSave,
  onShare,
  onDelete,
  onComment,
  onVote,
  commentText,
  setCommentText,
}) {
  const canDelete = post.isMine || me?.role === "admin";

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
            <div className="communityPostMeta">
              <span>{post.author?.city || "OnTrip"}</span>
              <span>•</span>
              <span>{formatTime(post.createdAt)}</span>
              {post.postType !== "post" ? (
                <>
                  <span>•</span>
                  <span className="communityPostType">
                    {post.postType === "question"
                      ? "Question"
                      : post.postType === "trip_story"
                      ? "Trip Story"
                      : post.postType === "provider_offer"
                      ? "Provider Offer"
                      : post.postType === "poll"
                      ? "Poll"
                      : "Post"}
                  </span>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {canDelete ? (
          <button
            type="button"
            className="communityPostDelete"
            onClick={() => onDelete(post.id)}
          >
            Delete
          </button>
        ) : null}
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
        <div className="communityLocationLine">📍 {post.locationText}</div>
      ) : null}

      {post.linkedListingTitle ? (
        <div className="communityLinkedCard">
          {post.linkedListingImage ? (
            <img
              src={post.linkedListingImage}
              alt={post.linkedListingTitle}
              className="communityLinkedImage"
            />
          ) : null}
          <div className="communityLinkedBody">
            <strong>{post.linkedListingTitle}</strong>
            <span>
              {post.linkedListingType === "travel_planner"
                ? "Travel Planner"
                : post.linkedListingType === "vehicle"
                ? "Vehicle"
                : ""}
            </span>
            {post.linkedListingPriceText ? (
              <b>{post.linkedListingPriceText}</b>
            ) : null}
            {post.providerId ? (
              <Link to={`/providers/${post.providerId}`} className="communityLinkedBtn">
                View Listing
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {post.poll ? (
        <div className="communityPollBox">
          {(post.poll.options || []).map((option) => (
            <button
              key={option.id}
              type="button"
              className={`communityPollOption ${option.isVotedByMe ? "voted" : ""}`}
              onClick={() => onVote(post.id, option.id)}
            >
              <div className="communityPollTop">
                <span>{option.text}</span>
                <strong>{option.percentage}%</strong>
              </div>
              <div className="communityPollTrack">
                <div
                  className="communityPollFill"
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
              <div className="communityPollVotes">{option.votesCount} votes</div>
            </button>
          ))}
          <div className="communityPollTotal">
            Total votes: {post.poll.totalVotes}
          </div>
        </div>
      ) : null}

      {post.images?.length ? (
        <div
          className={`communityImageGrid ${
            post.images.length === 1 ? "single" : post.images.length === 2 ? "double" : "multi"
          }`}
        >
          {post.images.map((image, index) => (
            <img
              key={`${image.url}-${index}`}
              src={image.url}
              alt="community"
              className="communityPostImage"
            />
          ))}
        </div>
      ) : null}

      <div className="communityActionRow">
        <button
          type="button"
          className={`communityActionBtn ${post.isLikedByMe ? "active" : ""}`}
          onClick={() => onLike(post.id)}
        >
          ❤️ {post.likesCount}
        </button>

        <button
          type="button"
          className={`communityActionBtn ${post.isSavedByMe ? "active" : ""}`}
          onClick={() => onSave(post.id)}
        >
          🔖 {post.savesCount}
        </button>

        <button type="button" className="communityActionBtn" onClick={() => onShare(post.id)}>
          🔁 {post.sharesCount}
        </button>

        <div className="communityActionStatic">💬 {post.commentsCount}</div>
      </div>

      <div className="communityCommentComposer">
        <input
          value={commentText}
          onChange={(e) => setCommentText(post.id, e.target.value)}
          placeholder="Write a comment..."
        />
        <button type="button" onClick={() => onComment(post.id)}>
          Comment
        </button>
      </div>

      {post.comments?.length ? (
        <div className="communityCommentList">
          {post.comments.slice(0, 4).map((comment) => (
            <div key={comment.id} className="communityCommentItem">
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

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [posts, setPosts] = useState([]);
  const [trendingTags, setTrendingTags] = useState([]);
  const [trendingCities, setTrendingCities] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: false,
  });
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [composer, setComposer] = useState({
    postType: "post",
    text: "",
    locationText: "",
    tags: "",
    providerId: "",
    pollOptions: ["", ""],
    images: [],
  });
  const [myProviders, setMyProviders] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});

  const providerOptions = useMemo(() => {
    return [
      { label: "Select your provider listing", value: "" },
      ...myProviders.map((item) => ({
        label: `${item.businessName} — ${
          item.listingType === "travel_planner" ? "Travel Planner" : "Vehicle"
        }`,
        value: item._id,
      })),
    ];
  }, [myProviders]);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError("");

        const requests = [
          apiFetch("/api/community?limit=10&page=1"),
          apiFetch("/api/community/trending"),
        ];

        if (isLoggedIn() && me?.role === "provider") {
          requests.push(apiFetch("/api/providers/mine"));
        }

        const [feedRes, trendRes, providersRes] = await Promise.all(requests);

        setPosts(feedRes.posts || []);
        setPagination(feedRes.pagination || { page: 1, limit: 10, total: 0, hasMore: false });
        setTrendingTags(trendRes.trendingTags || []);
        setTrendingCities(trendRes.trendingCities || []);
        setMyProviders(providersRes?.providers || []);
      } catch (err) {
        setError(err.message || "Failed to load community.");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [me?.role]);

  async function loadPosts(nextPage = 1, append = false) {
    const data = await apiFetch(
      `/api/community?limit=10&page=${nextPage}&filter=${encodeURIComponent(filter)}&q=${encodeURIComponent(search)}`
    );

    setPosts((prev) => (append ? [...prev, ...(data.posts || [])] : data.posts || []));
    setPagination(data.pagination || { page: nextPage, limit: 10, total: 0, hasMore: false });
  }

  async function applyFilters() {
    try {
      setLoading(true);
      setError("");
      await loadPosts(1, false);
    } catch (err) {
      setError(err.message || "Failed to filter posts.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePost() {
    if (!isLoggedIn()) {
      setError("Please login to post in community.");
      return;
    }

    if (
      !composer.text.trim() &&
      composer.images.length === 0 &&
      composer.postType !== "provider_offer" &&
      composer.postType !== "poll"
    ) {
      setError("Write something or upload image.");
      return;
    }

    if (composer.postType === "provider_offer" && !composer.providerId) {
      setError("Select your provider listing.");
      return;
    }

    if (
      composer.postType === "poll" &&
      composer.pollOptions.map((item) => item.trim()).filter(Boolean).length < 2
    ) {
      setError("Add at least 2 poll options.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const fd = new FormData();
      fd.append("postType", composer.postType);
      fd.append("text", composer.text.trim());
      fd.append("locationText", composer.locationText.trim());
      fd.append("tags", normalizeTagInput(composer.tags));

      if (composer.providerId) {
        fd.append("providerId", composer.providerId);
      }

      if (composer.postType === "poll") {
        fd.append(
          "pollOptions",
          JSON.stringify(composer.pollOptions.map((item) => item.trim()).filter(Boolean))
        );
      }

      composer.images.forEach((file) => {
        fd.append("images", file);
      });

      const data = await apiFetch("/api/community", {
        method: "POST",
        body: fd,
      });

      setPosts((prev) => [data.post, ...prev]);
      setComposer({
        postType: "post",
        text: "",
        locationText: "",
        tags: "",
        providerId: "",
        pollOptions: ["", ""],
        images: [],
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
      const data = await apiFetch(`/api/community/${postId}/like`, {
        method: "POST",
      });

      setPosts((prev) =>
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
      setError(err.message || "Failed to update like.");
    }
  }

  async function handleSave(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const data = await apiFetch(`/api/community/${postId}/save`, {
        method: "POST",
      });

      setPosts((prev) =>
        prev.map((post) =>
          String(post.id) === String(postId)
            ? {
                ...post,
                savesCount: data.savesCount,
                isSavedByMe: data.isSavedByMe,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to update save.");
    }
  }

  async function handleShare(postId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const data = await apiFetch(`/api/community/${postId}/share`, {
        method: "POST",
      });

      setPosts((prev) =>
        prev.map((post) =>
          String(post.id) === String(postId)
            ? {
                ...post,
                sharesCount: data.sharesCount,
              }
            : post
        )
      );
    } catch (err) {
      setError(err.message || "Failed to share post.");
    }
  }

  async function handleDelete(postId) {
    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    try {
      await apiFetch(`/api/community/${postId}`, {
        method: "DELETE",
      });

      setPosts((prev) => prev.filter((post) => String(post.id) !== String(postId)));
    } catch (err) {
      setError(err.message || "Failed to delete post.");
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
      const data = await apiFetch(`/api/community/${postId}/comment`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });

      setPosts((prev) =>
        prev.map((post) => (String(post.id) === String(postId) ? data.post : post))
      );

      setCommentDrafts((prev) => ({
        ...prev,
        [postId]: "",
      }));
    } catch (err) {
      setError(err.message || "Failed to add comment.");
    }
  }

  async function handleVote(postId, optionId) {
    if (!isLoggedIn()) {
      setError("Please login first.");
      return;
    }

    try {
      const data = await apiFetch(`/api/community/${postId}/poll-vote`, {
        method: "POST",
        body: JSON.stringify({ optionId }),
      });

      setPosts((prev) =>
        prev.map((post) => (String(post.id) === String(postId) ? data.post : post))
      );
    } catch (err) {
      setError(err.message || "Failed to vote.");
    }
  }

  async function handleLoadMore() {
    if (!pagination.hasMore || loadingMore) return;

    try {
      setLoadingMore(true);
      await loadPosts(pagination.page + 1, true);
    } catch (err) {
      setError(err.message || "Failed to load more posts.");
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="container communityPage">
      <div className="communityHero">
        <div>
          <h1>OnTrip Community</h1>
          <p>Share trip stories, ask questions, discover offers, and connect with travelers.</p>
        </div>

        <div className="communityHeroFilters">
          <CustomSelect
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            options={filterOptions}
            placeholder="Filter feed"
          />
          <input
            className="communitySearch"
            placeholder="Search posts, tags, places..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="communityApplyBtn" type="button" onClick={applyFilters}>
            Apply
          </button>
        </div>
      </div>

      {error ? <div className="communityAlert">{error}</div> : null}

      <div className="communityLayout">
        <aside className="communityLeft">
          <div className="communitySideCard">
            <div className="communitySideTitle">Trending Tags</div>
            <div className="communityTrendList">
              {trendingTags.length === 0 ? (
                <div className="communityMutedCard">No trends yet.</div>
              ) : (
                trendingTags.map((item) => (
                  <button
                    type="button"
                    key={item.tag}
                    className="communityTrendItem"
                    onClick={() => {
                      setSearch(item.tag);
                      setTimeout(() => applyFilters(), 0);
                    }}
                  >
                    <strong>#{item.tag}</strong>
                    <span>{item.count} posts</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="communitySideCard">
            <div className="communitySideTitle">Popular Cities</div>
            <div className="communityTrendList">
              {trendingCities.length === 0 ? (
                <div className="communityMutedCard">No city data yet.</div>
              ) : (
                trendingCities.map((item) => (
                  <div key={item.city} className="communityTrendItem static">
                    <strong>{item.city}</strong>
                    <span>{item.count} posts</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <main className="communityCenter">
          <div className="communityComposerCard">
            <div className="communityComposerTop">
              {me?.avatar ? (
                <img src={me.avatar} alt={me.name} className="communityAvatar large" />
              ) : (
                <div className="communityAvatarFallback large">{getInitial(me?.name)}</div>
              )}

              <div className="communityComposerFields">
                <CustomSelect
                  value={composer.postType}
                  onChange={(e) =>
                    setComposer((prev) => ({ ...prev, postType: e.target.value }))
                  }
                  options={postTypeOptions}
                  placeholder="Select post type"
                />

                <textarea
                  className="communityComposerTextarea"
                  placeholder="Share your travel thought, ask a question, or promote your offer..."
                  value={composer.text}
                  onChange={(e) =>
                    setComposer((prev) => ({ ...prev, text: e.target.value }))
                  }
                  rows={4}
                />

                <div className="communityComposerGrid">
                  <input
                    className="communityInput"
                    placeholder="Location (optional)"
                    value={composer.locationText}
                    onChange={(e) =>
                      setComposer((prev) => ({ ...prev, locationText: e.target.value }))
                    }
                  />

                  <input
                    className="communityInput"
                    placeholder="Tags comma separated (goa, budget, solo)"
                    value={composer.tags}
                    onChange={(e) =>
                      setComposer((prev) => ({ ...prev, tags: e.target.value }))
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
                    placeholder="Select your provider listing"
                  />
                ) : null}

                {composer.postType === "poll" ? (
                  <div className="communityPollComposer">
                    {composer.pollOptions.map((item, index) => (
                      <input
                        key={index}
                        className="communityInput"
                        placeholder={`Poll option ${index + 1}`}
                        value={item}
                        onChange={(e) => {
                          const next = [...composer.pollOptions];
                          next[index] = e.target.value;
                          setComposer((prev) => ({ ...prev, pollOptions: next }));
                        }}
                      />
                    ))}

                    {composer.pollOptions.length < 4 ? (
                      <button
                        type="button"
                        className="communityMiniBtn"
                        onClick={() =>
                          setComposer((prev) => ({
                            ...prev,
                            pollOptions: [...prev.pollOptions, ""],
                          }))
                        }
                      >
                        + Add Option
                      </button>
                    ) : null}
                  </div>
                ) : null}

                <div className="communityComposerActions">
                  <button
                    type="button"
                    className="communityUploadBtn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 Add Photos
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    className="communityHiddenInput"
                    onChange={(e) =>
                      setComposer((prev) => ({
                        ...prev,
                        images: Array.from(e.target.files || []),
                      }))
                    }
                  />

                  <div className="communityFileNames">
                    {composer.images.length > 0
                      ? `${composer.images.length} image(s) selected`
                      : "No images selected"}
                  </div>

                  <button
                    type="button"
                    className="communityPostBtn"
                    onClick={handleCreatePost}
                    disabled={submitting}
                  >
                    {submitting ? "Posting..." : "Post Now"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingSpinner text="Loading community..." />
          ) : posts.length === 0 ? (
            <div className="communityEmptyCard">
              No posts yet. Be the first to share something in the community.
            </div>
          ) : (
            <div className="communityFeed">
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  me={me}
                  onLike={handleLike}
                  onSave={handleSave}
                  onShare={handleShare}
                  onDelete={handleDelete}
                  onComment={handleComment}
                  onVote={handleVote}
                  commentText={commentDrafts[post.id] || ""}
                  setCommentText={setCommentText}
                />
              ))}

              {pagination.hasMore ? (
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
          <div className="communitySideCard">
            <div className="communitySideTitle">Posting Ideas</div>
            <div className="communityIdeaList">
              <div className="communityIdeaItem">Ask trip planning questions</div>
              <div className="communityIdeaItem">Share your travel photos</div>
              <div className="communityIdeaItem">Post provider offers</div>
              <div className="communityIdeaItem">Run a poll for destinations</div>
            </div>
          </div>

          <div className="communitySideCard">
            <div className="communitySideTitle">Community Tips</div>
            <div className="communityInfoList">
              <div>Be clear and helpful in your posts.</div>
              <div>Use tags like #goa #budget #solo.</div>
              <div>Add images to get more engagement.</div>
              <div>Providers can attach listing offers.</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}