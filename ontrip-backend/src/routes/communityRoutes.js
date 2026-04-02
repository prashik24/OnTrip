import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getCommunityFeed,
  createCommunityPost,
  togglePostLike,
  togglePostBookmark,
  addPostComment,
  getPostComments,
  getCommentReplies,
  incrementPostShare,
  deleteCommunityPost,
  getMyPosts,
  getBookmarkedPosts,
  getLikedPosts,
  getNotifications,
  markNotificationsRead,
  getUserProfile,
  getUserPosts,
  toggleFollowUser,
  searchPeopleAndTags,
} from "../controllers/communityController.js";

const router = express.Router();

router.get("/feed", getCommunityFeed);
router.get("/discover", searchPeopleAndTags);

router.get("/profile/:userId", getUserProfile);
router.get("/profile/:userId/posts", getUserPosts);
router.post("/profile/:userId/follow", protect, toggleFollowUser);

router.post("/", protect, upload.any(), createCommunityPost);

router.post("/:postId/like", protect, togglePostLike);
router.post("/:postId/bookmark", protect, togglePostBookmark);
router.post("/:postId/comment", protect, addPostComment);
router.get("/:postId/comments", getPostComments);
router.get("/:postId/comments/:commentId/replies", getCommentReplies);
router.post("/:postId/share", protect, incrementPostShare);
router.delete("/:postId", protect, deleteCommunityPost);

router.get("/me/posts", protect, getMyPosts);
router.get("/me/bookmarks", protect, getBookmarkedPosts);
router.get("/me/likes", protect, getLikedPosts);
router.get("/me/notifications", protect, getNotifications);
router.post("/me/notifications/read", protect, markNotificationsRead);

export default router;