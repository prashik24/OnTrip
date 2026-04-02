import CommunityPostCard from "./CommunityPostCard";
import "./CommunityBookmarksView.css";

export default function CommunityBookmarksView({
  posts,
  pagination,
  loading,
  loadingMore,
  onLoadMore,
  onLike,
  onBookmark,
  onDelete,
  onComment,
  onReply,
  onLoadComments,
  onLoadReplies,
  commentDrafts,
  setCommentText,
  loadingCommentsFor,
  loadingRepliesId,
}) {
  return (
    <div className="communityBookmarksView">
      <div className="communityBookmarksHeroCard">
        <h1>Bookmarks</h1>
        <p>All your saved community posts in one place.</p>
      </div>

      {loading ? (
        <div className="communityBookmarksEmptyCard">Loading bookmarks...</div>
      ) : posts.length === 0 ? (
        <div className="communityBookmarksEmptyCard">No bookmarked posts yet.</div>
      ) : (
        <div className="communityBookmarksList">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              onLike={onLike}
              onBookmark={onBookmark}
              onDelete={onDelete}
              onComment={onComment}
              onReply={onReply}
              onLoadComments={onLoadComments}
              onLoadReplies={onLoadReplies}
              commentText={commentDrafts[post.id] || ""}
              setCommentText={setCommentText}
              loadingCommentsFor={loadingCommentsFor}
              loadingRepliesId={loadingRepliesId}
            />
          ))}

          {pagination?.hasMore ? (
            <button
              type="button"
              className="communityBookmarksLoadMoreBtn"
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