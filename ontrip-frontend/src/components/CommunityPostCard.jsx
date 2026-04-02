import { useState } from "react";
import { Link } from "react-router-dom";
import "./CommunityPostCard.css";

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
  onReply,
  onLoadReplies,
  loadingRepliesId,
}) {
  const [replyText, setReplyText] = useState("");
  const [showReplyBox, setShowReplyBox] = useState(false);

  return (
    <div className="communityCommentItem">
      <Link to={`/community/profile/${comment.user?.id}`} className="communityCommentUserLink">
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
          <Link to={`/community/profile/${comment.user?.id}`} className="communityCommentName">
            {comment.user?.name || "User"}
          </Link>
          <span>{formatTime(comment.createdAt)}</span>
        </div>

        <div className="communityCommentText">{comment.text}</div>

        <div className="communityCommentActions">
          <button
            type="button"
            onClick={() => setShowReplyBox((prev) => !prev)}
          >
            Reply
          </button>

          {comment.hasMoreReplies ? (
            <button
              type="button"
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
          <div className="communityReplyList">
            {comment.replies.map((reply) => (
              <div className="communityReplyItem" key={reply.id}>
                <Link to={`/community/profile/${reply.user?.id}`} className="communityReplyName">
                  {reply.user?.name || "User"}
                </Link>
                <span className="communityReplyText">{reply.text}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function CommunityPostCard({
  post,
  onLike,
  onBookmark,
  onDelete,
  onComment,
  onReply,
  onLoadComments,
  onLoadReplies,
  commentText,
  setCommentText,
  loadingCommentsFor,
  loadingRepliesId,
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

            {post.isMine ? (
              <button
                type="button"
                className="communityDeleteBtn"
                onClick={() => onDelete(post.id)}
              >
                Delete
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
          {post.comments.map((comment) => (
            <CommentNode
              key={comment.id}
              comment={comment}
              postId={post.id}
              onReply={onReply}
              onLoadReplies={onLoadReplies}
              loadingRepliesId={loadingRepliesId}
            />
          ))}
        </div>
      ) : null}

      {post.hasMoreComments ? (
        <button
          type="button"
          className="communityLoadCommentsBtn"
          onClick={() => onLoadComments(post.id)}
          disabled={loadingCommentsFor === post.id}
        >
          {loadingCommentsFor === post.id ? "Loading..." : "Load More Comments"}
        </button>
      ) : null}
    </article>
  );
}