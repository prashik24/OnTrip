import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getCommunityFeed,
  createCommunityPost,
  togglePostLike,
  togglePostBookmark,
  addPostComment,
  incrementPostShare,
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
router.get("/search", getCommunityFeed);
router.get("/discover", searchPeopleAndTags);

router.get("/profile/:userId", getUserProfile);
router.get("/profile/:userId/posts", getUserPosts);

router.post("/", protect, upload.any(), createCommunityPost);
router.post("/:postId/like", protect, togglePostLike);
router.post("/:postId/bookmark", protect, togglePostBookmark);
router.post("/:postId/comment", protect, addPostComment);
router.post("/:postId/share", protect, incrementPostShare);

router.get("/me/posts", protect, getMyPosts);
router.get("/me/bookmarks", protect, getBookmarkedPosts);
router.get("/me/likes", protect, getLikedPosts);
router.get("/me/notifications", protect, getNotifications);
router.post("/me/notifications/read", protect, markNotificationsRead);

router.post("/profile/:userId/follow", protect, toggleFollowUser);
router.get("/search/all", searchPeopleAndTags);

export default router;