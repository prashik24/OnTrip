import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  createMySocialProfile,
  getMySocialProfile,
  updateMySocialProfile,
  getProfileByUsername,
  followUnfollowProfile,
  createSocialPost,
  getHomeFeed,
  getMyPosts,
  getPostsByUsername,
  toggleLikePost,
  toggleBookmarkPost,
  getBookmarkedPosts,
  getLikedPosts,
  addCommentToPost,
  replyToComment,
  toggleLikeComment,
  getPostComments,
  getNotifications,
  markNotificationsRead,
  searchProfilesAndPosts,
} from "../controllers/socialController.js";

const router = express.Router();

// profile
router.post("/profile/create", protect, createMySocialProfile);
router.get("/profile/me", protect, getMySocialProfile);
router.put("/profile/me", protect, updateMySocialProfile);
router.get("/profile/:username", getProfileByUsername);
router.post("/profile/:username/follow", protect, followUnfollowProfile);

// feed + search
router.get("/feed", getHomeFeed);
router.get("/search", searchProfilesAndPosts);

// posts
router.post("/posts", protect, upload.any(), createSocialPost);
router.get("/posts/me", protect, getMyPosts);
router.get("/posts/user/:username", getPostsByUsername);
router.post("/posts/:postId/like", protect, toggleLikePost);
router.post("/posts/:postId/bookmark", protect, toggleBookmarkPost);
router.get("/posts/bookmarks/me", protect, getBookmarkedPosts);
router.get("/posts/liked/me", protect, getLikedPosts);

// comments
router.get("/posts/:postId/comments", protect, getPostComments);
router.post("/posts/:postId/comments", protect, addCommentToPost);
router.post("/posts/:postId/comments/:commentId/reply", protect, replyToComment);
router.post("/posts/:postId/comments/:commentId/like", protect, toggleLikeComment);

// notifications
router.get("/notifications", protect, getNotifications);
router.post("/notifications/read-all", protect, markNotificationsRead);

export default router;