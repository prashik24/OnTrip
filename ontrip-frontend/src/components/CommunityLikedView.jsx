import CommunityPostCard from "./CommunityPostCard";
import "./CommunityLikedView.css";

export default function CommunityLikedView({
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
    <div className="communityLikedView">
      <div className="communityLikedHeroCard">
        <h1>Liked Posts</h1>
        <p>Posts you liked in the community.</p>
      </div>

      {loading ? (
        <div className="communityLikedEmptyCard">Loading liked posts...</div>
      ) : posts.length === 0 ? (
        <div className="communityLikedEmptyCard">No liked posts yet.</div>
      ) : (
        <div className="communityLikedList">
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
              className="communityLikedLoadMoreBtn"
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