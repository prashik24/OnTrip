import { useState } from "react";
import "./CommunityPostCard.css";

const LIKE_ICON =
  "https://img.icons8.com/?size=100&id=33479&format=png&color=000000";
const BOOKMARK_ICON =
  "https://img.icons8.com/?size=100&id=82461&format=png&color=000000";
const COMMENT_ICON =
  "https://img.icons8.com/?size=100&id=11167&format=png&color=000000";
const MESSAGE_ICON =
  "https://img.icons8.com/?size=100&id=63&format=png&color=000000";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CommentNode({
  comment,
  postId,
  depth = 0,
  onReply,
  onLoadReplies,
  loadingRepliesId,
  onOpenProfile,
}) {
  const [replyText, setReplyText] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);

  const hasMoreReplies = Boolean(comment?.hasMoreReplies);
  const commentUserId = comment.user?.id || comment.user?._id || "";

  return (
    <div className={`communityCommentItem depth-${Math.min(depth, 3)}`}>
      <button
        type="button"
        className="communityCommentUserLink"
        onClick={() => onOpenProfile?.(commentUserId)}
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
      </button>

      <div className="communityCommentBody">
        <div className="communityCommentTop">
          <div className="communityCommentNameWrap">
            <button
              type="button"
              className="communityCommentName"
              onClick={() => onOpenProfile?.(commentUserId)}
            >
              {comment.user?.name || "User"}
            </button>
            <span>{formatTime(comment.createdAt)}</span>
          </div>
        </div>

        <div className="communityCommentText">{comment.text}</div>

        <div className="communityCommentActions">
          <button type="button" onClick={() => setShowReplyBox((prev) => !prev)}>
            {showReplyBox ? "Close Reply" : "Reply"}
          </button>

          {hasMoreReplies ? (
            <button
              type="button"
              className="communityCommentLoadBtn"
              onClick={() => onLoadReplies(postId, comment.id)}
              disabled={loadingRepliesId === comment.id}
            >
              {loadingRepliesId === comment.id ? "Loading..." : "Load More Replies"}
            </button>
          ) : null}
        </div>

        {showReplyBox ? (
          <div className="communityReplyComposer">
            <input
              type="text"
              placeholder="Write a reply..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
            />
            <button
              type="button"
              onClick={() => {
                if (!replyText.trim()) return;
                onReply(postId, comment.id, replyText);
                setReplyText("");
                setShowReplyBox(false);
              }}
            >
              Send
            </button>
          </div>
        ) : null}

        {comment.replies?.length ? (
          <div className="communityReplyTree">
            {comment.replies.map((reply) => (
              <CommentNode
                key={reply.id}
                comment={reply}
                postId={postId}
                depth={depth + 1}
                onReply={onReply}
                onLoadReplies={onLoadReplies}
                loadingRepliesId={loadingRepliesId}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommunityPostCard({
  post,
  showDelete = false,
  pendingDeletePostId = "",
  setPendingDeletePostId = () => {},
  onLike,
  onBookmark,
  onDelete,
  onComment,
  onReply,
  onLoadComments,
  onLoadReplies,
  onMessageUser,
  commentText,
  setCommentText,
  loadingCommentsFor,
  loadingRepliesId,
  onOpenProfile,
  me,
}) {
  const authorId = post.author?.id || post.author?._id || "";
  const myId = me?.id || me?._id || "";

  const canDelete = showDelete || post.showDelete || post.isMine;
  const hasMoreComments =
    Boolean(post.hasMoreComments) &&
    Number(post.rootCommentsTotal || 0) > Number(post.loadedRootCount || 0);

  const canMessageAuthor = Boolean(authorId) && String(authorId) !== String(myId);

  return (
    <article className="communityPostCard" id={`community-post-${post.id}`}>
      <div className="communityPostHead">
        <button
          type="button"
          className="communityAuthorLink"
          onClick={() => onOpenProfile?.(authorId)}
        >
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
        </button>

        <div className="communityPostHeadContent">
          <div className="communityPostHeadTop">
            <button
              type="button"
              className="communityAuthorName"
              onClick={() => onOpenProfile?.(authorId)}
            >
              {post.author?.name || "User"}
            </button>

            <span className={`communityRolePill ${post.author?.role || "user"}`}>
              {post.author?.role === "provider" ? "Provider" : "Traveler"}
            </span>

            {canDelete ? (
              <button
                type="button"
                className={`communityDeleteBtn ${
                  pendingDeletePostId === post.id ? "pending" : ""
                }`}
                onClick={() =>
                  setPendingDeletePostId((prev) => (prev === post.id ? "" : post.id))
                }
              >
                {pendingDeletePostId === post.id ? "Close Delete" : "Delete My Post"}
              </button>
            ) : null}
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
            post.media.length === 1 ? "single" : post.media.length === 2 ? "double" : "multi"
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
                alt={`post-${index + 1}`}
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
          <img src={LIKE_ICON} alt="" className="communityActionIcon" />
          <span>{post.likesCount}</span>
        </button>

        <button
          type="button"
          className={`communityActionBtn ${post.isBookmarkedByMe ? "active" : ""}`}
          onClick={() => onBookmark(post.id)}
        >
          <img src={BOOKMARK_ICON} alt="" className="communityActionIcon" />
          <span>{post.isBookmarkedByMe ? "Saved" : "Save"}</span>
        </button>

        {canMessageAuthor ? (
          <button
            type="button"
            className="communityActionBtn communityMessageBtn"
            onClick={() => onMessageUser?.(authorId)}
          >
            <img src={MESSAGE_ICON} alt="" className="communityActionIcon" />
            <span>Message</span>
          </button>
        ) : null}

        <div className="communityActionInfo">
          <img src={COMMENT_ICON} alt="" className="communityActionIcon" />
          <span>{post.commentsCount}</span>
        </div>
      </div>

      <div className="communityCommentsSection">
        <div className="communityCommentsHeading">Comments</div>

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
            {post.comments.map((comment) => (
              <CommentNode
                key={comment.id}
                comment={comment}
                postId={post.id}
                depth={0}
                onReply={onReply}
                onLoadReplies={onLoadReplies}
                loadingRepliesId={loadingRepliesId}
                onOpenProfile={onOpenProfile}
              />
            ))}
          </div>
        ) : (
          <div className="communityNoComments">No comments yet.</div>
        )}

        {hasMoreComments ? (
          <button
            type="button"
            className="communityLoadCommentsBtn"
            onClick={() => onLoadComments(post.id)}
            disabled={loadingCommentsFor === post.id}
          >
            {loadingCommentsFor === post.id ? "Loading..." : "Load More Comments"}
          </button>
        ) : null}
      </div>
    </article>
  );
}