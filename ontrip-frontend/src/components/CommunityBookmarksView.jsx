import CommunityPostCard from "./CommunityPostCard";
import LoadingSpinner from "./LoadingSpinner";
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
  onOpenProfile,
}) {
  return (
    <div className="communityBookmarksView">
      <div className="communityBookmarksHead">
        <h1>Bookmarks</h1>
        <p>All your saved community posts in one place.</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading bookmarks..." />
      ) : posts.length === 0 ? (
        <div className="communityBookmarksEmptyState">
          <div className="communityBookmarksEmptyIcon">📂</div>
          <h3>No bookmarked posts yet</h3>
          <p>Posts you save will appear here.</p>
        </div>
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
              onOpenProfile={onOpenProfile}
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