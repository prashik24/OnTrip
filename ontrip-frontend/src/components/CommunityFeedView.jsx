import CommunityComposer from "./CommunityComposer";
import CommunityPostCard from "./CommunityPostCard";
import "./CommunityFeedView.css";

export default function CommunityFeedView({
  search,
  setSearch,
  onApplySearch,
  composer,
  setComposer,
  submitting,
  onCreatePost,
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
  loadingNode,
}) {
  return (
    <div className="communityFeedView">
      <div className="communityFeedHeroCard">
        <div className="communityFeedHeroTop">
          <div>
            <h1>Community</h1>
            <p>
              See all posts from all users, share stories, photos, videos, and travel updates.
            </p>
          </div>

          <div className="communityFeedSearchWrap">
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
      </div>

      <CommunityComposer
        composer={composer}
        setComposer={setComposer}
        submitting={submitting}
        onCreatePost={onCreatePost}
      />

      {loading ? (
        <div className="communityFeedEmptyCard">Loading community...</div>
      ) : posts.length === 0 ? (
        <div className="communityFeedEmptyCard">No posts found.</div>
      ) : (
        <div className="communityFeedList">
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
              loadingNode={loadingNode}
            />
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