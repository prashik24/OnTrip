import { useState } from "react";
import CommunityComposer from "./CommunityComposer";
import CommunityPostCard from "./CommunityPostCard";
import LoadingSpinner from "./LoadingSpinner";
import "./CommunityProfileView.css";

function getInitial(name = "U") {
  return String(name || "U").trim().charAt(0).toUpperCase();
}

export default function CommunityProfileView({
  profile,
  isOwnProfile,
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
  onOpenProfile,
}) {
  const [pendingDeletePostId, setPendingDeletePostId] = useState("");

  async function handleConfirmDelete() {
    if (!pendingDeletePostId) return;
    await onDelete(pendingDeletePostId);
    setPendingDeletePostId("");
  }

  return (
    <div className="communityProfileView">
      <div className="communityProfileHead">
        <h1>{isOwnProfile ? "My Profile" : "Profile"}</h1>
        <p>
          {isOwnProfile
            ? "Manage your profile and share your travel updates."
            : "See profile details and community activity."}
        </p>
      </div>

      <div className="communityProfileHeroCard">
        <div className="communityProfileTop">
          <div className="communityProfileAvatarWrap">
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
          </div>

          <div className="communityProfileInfo">
            <div className="communityProfileNameRow">
              <div className="communityProfileTitleBlock">
                <h2>{profile?.name || "Profile"}</h2>
                <span className="communityProfileUsername">
                  @
                  {profile?.username ||
                    profile?.email?.split("@")?.[0] ||
                    String(profile?.name || "user")
                      .replace(/\s+/g, "")
                      .toLowerCase()}
                </span>
              </div>

              {!isOwnProfile ? (
                <button
                  type="button"
                  className="communityProfileFollowBtn"
                  onClick={onToggleFollow}
                >
                  {profile?.isFollowing ? "Following" : "Follow"}
                </button>
              ) : (
                <span className="communityProfileRolePill">
                  {profile?.role === "provider" ? "Provider" : "Traveler"}
                </span>
              )}
            </div>

            <p className="communityProfileBio">
              {profile?.bio || "Traveler on OnTrip community"}
            </p>

            <div className="communityProfileMeta">
              <span>{profile?.city || "OnTrip"}</span>
              <span>•</span>
              <span>{profile?.role === "provider" ? "Provider Account" : "Community Member"}</span>
            </div>

            <div className="communityProfileStatsInline">
              <span>
                <strong>{profile?.postsCount || 0}</strong> Posts
              </span>
              <span>•</span>
              <span>
                <strong>{profile?.followersCount || 0}</strong> Followers
              </span>
              <span>•</span>
              <span>
                <strong>{profile?.followingCount || 0}</strong> Following
              </span>
            </div>
          </div>
        </div>
      </div>

      {isOwnProfile ? (
        <CommunityComposer
          title="Create Post"
          composer={composer}
          setComposer={setComposer}
          submitting={submitting}
          onCreatePost={onCreatePost}
        />
      ) : null}

      {loading ? (
        <LoadingSpinner text="Loading profile..." />
      ) : posts.length === 0 ? (
        <div className="communityProfileEmptyState">
          <div className="communityProfileEmptyIcon">📝</div>
          <h3>No posts yet</h3>
          <p>{isOwnProfile ? "Create your first post to show it here." : "No posts to show yet."}</p>
        </div>
      ) : (
        <div className="communityProfilePosts">
          {posts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              showDelete={isOwnProfile}
              pendingDeletePostId={pendingDeletePostId}
              setPendingDeletePostId={setPendingDeletePostId}
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
              className="communityProfileLoadMoreBtn"
              onClick={onLoadMore}
              disabled={loadingMore}
            >
              {loadingMore ? "Loading..." : "Load More"}
            </button>
          ) : null}
        </div>
      )}

      {pendingDeletePostId ? (
        <div
          className="communityProfileDeleteOverlay"
          onClick={() => setPendingDeletePostId("")}
        >
          <div
            className="communityProfileDeleteCard"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>Delete post?</h3>
            <p>This action will remove the post from your profile and community feed.</p>

            <div className="communityProfileDeleteActions">
              <button
                type="button"
                className="communityProfileDeleteCancelBtn"
                onClick={() => setPendingDeletePostId("")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="communityProfileDeleteConfirmBtn"
                onClick={handleConfirmDelete}
              >
                Delete Post
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}