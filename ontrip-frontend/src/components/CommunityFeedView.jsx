import CommunityPostCard from "./CommunityPostCard";
import LoadingSpinner from "./LoadingSpinner";
import "./CommunityFeedView.css";

export default function CommunityFeedView({
  search,
  setSearch,
  onApplySearch,
  posts,
  loading,
  pagination,
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
  focusedPostId,
}) {
  return (
    <div className="communityFeedView">
      <div className="communityFeedTop">
        <div className="communityFeedTitleWrap">
          <h1>Community Main</h1>
          <p>See all posts from all users in one place.</p>
        </div>

        <div className="communityFeedSearchBar">
          <input
            type="text"
            placeholder="Search hashtags or people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={onApplySearch}>
            Search
          </button>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading community..." />
      ) : posts.length === 0 ? (
        <div className="communityFeedEmptyState">
          <div className="communityFeedEmptyIcon">📭</div>
          <h3>No posts found</h3>
          <p>Try a different search or come back later for new posts.</p>
        </div>
      ) : (
        <div className="communityFeedList">
          {posts.map((post) => (
            <div
              key={post.id}
              id={`community-post-${post.id}`}
              className={`communityFeedTarget ${
                focusedPostId === post.id ? "communityFeedTargetActive" : ""
              }`}
            >
              <CommunityPostCard
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
            </div>
          ))}

          {pagination?.hasMore ? (
            <button
              type="button"
              className="communityFeedLoadMoreBtn"
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