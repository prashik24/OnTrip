import LoadingSpinner from "./LoadingSpinner";
import "./CommunityNotificationsView.css";

const LIKE_ICON =
  "https://img.icons8.com/?size=100&id=33479&format=png&color=000000";
const BOOKMARK_ICON =
  "https://img.icons8.com/?size=100&id=82461&format=png&color=000000";
const COMMENT_ICON =
  "https://img.icons8.com/?size=100&id=11167&format=png&color=000000";

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
  return String(name || "U").trim().charAt(0).toUpperCase();
}

function getNotificationTitle(item) {
  if (item.type === "like_post") return "Liked your post";
  if (item.type === "comment_post") return "Commented on your post";
  if (item.type === "reply_comment") return "Replied to your comment";
  if (item.type === "mention_post") return "Mentioned you in a post";
  if (item.type === "mention_comment") return "Mentioned you in a comment";
  if (item.type === "follow_user") return "Started following you";
  return "Notification";
}

function getActorLabel(item) {
  return item.actor?.name || "Someone";
}

function getCommentPreview(item) {
  const text = String(item.commentText || "").trim();
  if (!text) return "Comment text not available.";
  return text;
}

function canReplyToNotification(item) {
  return item.type === "comment_post" || item.type === "mention_comment";
}

function getPostTypeLabel(postType) {
  if (postType === "question") return "Question";
  if (postType === "trip_story") return "Trip Story";
  if (postType === "provider_offer") return "Provider Offer";
  return "Post";
}

function NotificationPostCard({ item, onOpenPost }) {
  const post = item.post || {};
  const media = Array.isArray(post.media) ? post.media : [];
  const tags = Array.isArray(post.tags) ? post.tags : [];
  const author = post.author || {};

  return (
    <article
      className="communityPostCard communityNotificationsFullPostCard"
      onClick={() => post?.id && onOpenPost?.(post.id)}
      role={post?.id ? "button" : undefined}
      tabIndex={post?.id ? 0 : undefined}
      onKeyDown={(e) => {
        if (!post?.id) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenPost?.(post.id);
        }
      }}
    >
      <div className="communityPostHead">
        <div className="communityAuthorLink">
          {author?.avatar ? (
            <img
              src={author.avatar}
              alt={author?.name || "User"}
              className="communityPostAvatar"
            />
          ) : (
            <div className="communityPostAvatarFallback">
              {getInitial(author?.name)}
            </div>
          )}
        </div>

        <div className="communityPostHeadContent">
          <div className="communityPostHeadTop">
            <span className="communityAuthorName">
              {author?.name || "User"}
            </span>

            <span className={`communityRolePill ${author?.role || "user"}`}>
              {author?.role === "provider" ? "Provider" : "Traveler"}
            </span>
          </div>

          <div className="communityPostMeta">
            <span>{author?.city || post.locationText || "OnTrip"}</span>
            <span>•</span>
            <span>{formatTime(post.createdAt || item.createdAt)}</span>
            {post.postType ? (
              <>
                <span>•</span>
                <span className="communityPostType">
                  {getPostTypeLabel(post.postType)}
                </span>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {post.text ? <div className="communityPostText">{post.text}</div> : null}

      {tags.length ? (
        <div className="communityTagRow">
          {tags.map((tag) => (
            <span key={tag} className="communityTagChip">
              #{tag}
            </span>
          ))}
        </div>
      ) : null}

      {post.locationText ? (
        <div className="communityLocationText">📍 {post.locationText}</div>
      ) : null}

      {media.length ? (
        <div
          className={`communityMediaGrid ${
            media.length === 1 ? "single" : media.length === 2 ? "double" : "multi"
          }`}
        >
          {media.map((mediaItem, index) =>
            mediaItem.type === "video" ? (
              <video
                key={`${mediaItem.url}-${index}`}
                src={mediaItem.url}
                controls
                className="communityPostMedia"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <img
                key={`${mediaItem.url}-${index}`}
                src={mediaItem.url}
                alt={`notification-post-${index + 1}`}
                className="communityPostMedia"
              />
            )
          )}
        </div>
      ) : null}

      <div className="communityPostActions">
        <div className="communityActionInfo">
          <img src={LIKE_ICON} alt="" className="communityActionIcon" />
          <span>{Number(post.likesCount || 0)}</span>
        </div>

        <div className="communityActionInfo">
          <img src={BOOKMARK_ICON} alt="" className="communityActionIcon" />
          <span>{Number(post.bookmarksCount || 0)}</span>
        </div>

        <div className="communityActionInfo">
          <img src={COMMENT_ICON} alt="" className="communityActionIcon" />
          <span>{Number(post.commentsCount || 0)}</span>
        </div>
      </div>
    </article>
  );
}

export default function CommunityNotificationsView({
  notifications,
  pagination,
  loading,
  loadingMore,
  onLoadMore,
  notificationCommentDrafts,
  setNotificationCommentText,
  onReplyFromNotification,
  commentingNotificationId,
  onOpenPostFromNotification,
}) {
  return (
    <div className="communityNotificationsView">
      <div className="communityNotificationsHead">
        <h1>Notifications</h1>
        <p>Recent updates from your community activity.</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading notifications..." />
      ) : notifications.length === 0 ? (
        <div className="communityNotificationsEmptyState">
          <div className="communityNotificationsEmptyIcon">📭</div>
          <h3>No notifications yet</h3>
          <p>When something new happens, it will appear here.</p>
        </div>
      ) : (
        <div className="communityNotificationsList">
          {notifications.map((item) => {
            const draft = notificationCommentDrafts?.[item.id] || "";
            const canReply = Boolean(item.post?.id) && canReplyToNotification(item);

            return (
              <div
                className={`communityNotificationsCard ${item.isRead ? "read" : "unread"}`}
                key={item.id}
              >
                <div className="communityNotificationsLeft">
                  {item.actor?.avatar ? (
                    <img
                      src={item.actor.avatar}
                      alt={item.actor?.name || "User"}
                      className="communityNotificationsAvatar"
                    />
                  ) : (
                    <div className="communityNotificationsAvatarFallback">
                      {getInitial(item.actor?.name)}
                    </div>
                  )}
                </div>

                <div className="communityNotificationsBody">
                  <div className="communityNotificationsTitleRow">
                    <div className="communityNotificationsTitle">
                      {getNotificationTitle(item)}
                    </div>
                    <div className="communityNotificationsMeta">
                      <span>{formatTime(item.createdAt)}</span>
                    </div>
                  </div>

                  <div className="communityNotificationsActor">
                    {getActorLabel(item)}
                  </div>

                  {item.type === "like_post" && item.post?.id ? (
                    <NotificationPostCard
                      item={item}
                      onOpenPost={onOpenPostFromNotification}
                    />
                  ) : null}

                  {item.type === "mention_post" && item.post?.id ? (
                    <NotificationPostCard
                      item={item}
                      onOpenPost={onOpenPostFromNotification}
                    />
                  ) : null}

                  {item.type === "comment_post" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Comment</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? (
                        <NotificationPostCard
                          item={item}
                          onOpenPost={onOpenPostFromNotification}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {item.type === "reply_comment" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Reply</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? (
                        <NotificationPostCard
                          item={item}
                          onOpenPost={onOpenPostFromNotification}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {item.type === "mention_comment" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Comment</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? (
                        <NotificationPostCard
                          item={item}
                          onOpenPost={onOpenPostFromNotification}
                        />
                      ) : null}
                    </div>
                  ) : null}

                  {canReply ? (
                    <div className="communityNotificationsCommentBox">
                      <input
                        type="text"
                        placeholder="Write a reply..."
                        value={draft}
                        onChange={(e) =>
                          setNotificationCommentText(item.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReplyFromNotification(item);
                        }}
                        disabled={
                          commentingNotificationId === item.id || !draft.trim()
                        }
                      >
                        {commentingNotificationId === item.id
                          ? "Posting..."
                          : "Reply"}
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {pagination?.hasMore ? (
            <button
              type="button"
              className="communityNotificationsLoadMoreBtn"
              onClick={onLoadMore}
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