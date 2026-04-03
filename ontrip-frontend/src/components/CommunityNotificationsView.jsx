import LoadingSpinner from "./LoadingSpinner";
import "./CommunityNotificationsView.css";

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

function getPostPreview(item) {
  const text = String(item.post?.text || "").trim();
  if (!text) return "";
  return text;
}

function getCommentPreview(item) {
  const text = String(item.commentText || "").trim();
  if (!text) return "Comment text not available.";
  return text;
}

function getPostMedia(item) {
  return Array.isArray(item.post?.media) ? item.post.media : [];
}

function canReplyToNotification(item) {
  return item.type === "comment_post" || item.type === "mention_comment";
}

function NotificationPostCard({ item }) {
  const media = getPostMedia(item);
  const hasText = Boolean(String(item.post?.text || "").trim());

  return (
    <div className="communityNotificationsPostCard">
      <div className="communityNotificationsPostHead">
        <strong>Post</strong>
      </div>

      {hasText ? (
        <div className="communityNotificationsPostText">{getPostPreview(item)}</div>
      ) : null}

      {media.length ? (
        <div
          className={`communityNotificationsMediaGrid ${
            media.length === 1 ? "single" : media.length === 2 ? "double" : "multi"
          }`}
        >
          {media.map((mediaItem, index) =>
            mediaItem.type === "video" ? (
              <video
                key={`${mediaItem.url}-${index}`}
                src={mediaItem.url}
                controls
                className="communityNotificationsPostMedia"
              />
            ) : (
              <img
                key={`${mediaItem.url}-${index}`}
                src={mediaItem.url}
                alt={`notification-post-${index + 1}`}
                className="communityNotificationsPostMedia"
              />
            )
          )}
        </div>
      ) : null}

      {!hasText && !media.length ? (
        <div className="communityNotificationsPostText">
          Post content not available.
        </div>
      ) : null}
    </div>
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
                    <NotificationPostCard item={item} />
                  ) : null}

                  {item.type === "mention_post" && item.post?.id ? (
                    <NotificationPostCard item={item} />
                  ) : null}

                  {item.type === "comment_post" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Comment</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? <NotificationPostCard item={item} /> : null}
                    </div>
                  ) : null}

                  {item.type === "reply_comment" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Reply</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? <NotificationPostCard item={item} /> : null}
                    </div>
                  ) : null}

                  {item.type === "mention_comment" ? (
                    <div className="communityNotificationsPreviewStack">
                      <div className="communityNotificationsPreviewBox">
                        <strong>Comment</strong>
                        <p>{getCommentPreview(item)}</p>
                      </div>
                      {item.post?.id ? <NotificationPostCard item={item} /> : null}
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
                      />
                      <button
                        type="button"
                        onClick={() => onReplyFromNotification(item)}
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