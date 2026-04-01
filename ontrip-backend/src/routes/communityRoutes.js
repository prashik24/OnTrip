import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getCommunityFeed,
  createPost,
  getMyCommunityProfile,
  getUserCommunityProfile,
  toggleLikePost,
  toggleBookmarkPost,
  addComment,
  likeComment,
  addReplyToComment,
  toggleFollowUser,
  getNotifications,
  markNotificationsRead,
} from "../controllers/communityController.js";

const router = express.Router();

router.get("/feed", getCommunityFeed);
router.get("/profile/:userId", getUserCommunityProfile);

router.get("/me", protect, getMyCommunityProfile);
router.get("/notifications", protect, getNotifications);

router.post("/post", protect, upload.any(), createPost);
router.post("/post/:postId/like", protect, toggleLikePost);
router.post("/post/:postId/bookmark", protect, toggleBookmarkPost);
router.post("/post/:postId/comment", protect, addComment);
router.post("/post/:postId/comment/:commentId/like", protect, likeComment);
router.post("/post/:postId/comment/:commentId/reply", protect, addReplyToComment);

router.post("/follow/:userId", protect, toggleFollowUser);
router.post("/notifications/read", protect, markNotificationsRead);

export default router;