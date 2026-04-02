import CommunityComposer from "./CommunityComposer";
import CommunityPostCard from "./CommunityPostCard";
import "./CommunityProfileView.css";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

export default function CommunityProfileView({
  profile,
  composer,
  setComposer,
  submitting,
  onCreatePost,
  posts,
  pagination,
  loading,
  loadingMore,
  onLoadMore,
  onToggleFollow,
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
    <div className="communityProfileView">
      <div className="communityProfileHead">
        <h1>My Profile</h1>
        <p>Manage your profile activity and your own posts.</p>
      </div>

      <div className="communityProfileHeroCard">
        <div className="communityProfileTop">
          {profile?.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name || "User"}
              className="communityProfileAvatar"
            />
          ) : (
            <div className="communityProfileAvatarFallback">
              {getInitial(profile?.name)}
            </div>
          )}

          <div className="communityProfileInfo">
            <h2>{profile?.name || "Profile"}</h2>
            <p>{profile?.bio || "Traveler on OnTrip community"}</p>

            <div className="communityProfileMeta">
              <span>{profile?.city || "OnTrip"}</span>
              <span>•</span>
              <span>{profile?.role === "provider" ? "Provider" : "Traveler"}</span>
            </div>

            <div className="communityProfileStats">
              <div>
                <strong>{profile?.postsCount || 0}</strong>
                <span>Posts</span>
              </div>
              <div>
                <strong>{profile?.followersCount || 0}</strong>
                <span>Followers</span>
              </div>
              <div>
                <strong>{profile?.followingCount || 0}</strong>
                <span>Following</span>
              </div>
            </div>

            {!profile?.isMe ? (
              <button
                type="button"
                className="communityProfileFollowBtn"
                onClick={onToggleFollow}
              >
                {profile?.isFollowing ? "Following" : "Follow"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {profile?.isMe ? (
        <CommunityComposer
          title="My Post"
          composer={composer}
          setComposer={setComposer}
          submitting={submitting}
          onCreatePost={onCreatePost}
        />
      ) : null}

      {loading ? (
        <div className="communityProfileEmptyState">
          <div className="communityProfileEmptyIcon">📝</div>
          <h3>Loading profile posts</h3>
          <p>Please wait while your posts are loading.</p>
        </div>
      ) : posts.length === 0 ? (
        <div className="communityProfileEmptyState">
          <div className="communityProfileEmptyIcon">📄</div>
          <h3>No posts yet</h3>
          <p>Your posts will appear here after you create one.</p>
        </div>
      ) : (
        <div className="communityProfilePosts">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              showDelete={true}
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
              className="communityProfileLoadMoreBtn"
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