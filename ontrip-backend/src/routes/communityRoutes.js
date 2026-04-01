import express from "express";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  getCommunityPosts,
  getCommunityTrending,
  createCommunityPost,
  togglePostLike,
  togglePostSave,
  addPostComment,
  voteOnPoll,
  incrementPostShare,
  deleteCommunityPost,
} from "../controllers/communityController.js";

const router = express.Router();

router.get("/", getCommunityPosts);
router.get("/trending", getCommunityTrending);

router.post("/", protect, upload.any(), createCommunityPost);
router.post("/:postId/like", protect, togglePostLike);
router.post("/:postId/save", protect, togglePostSave);
router.post("/:postId/comment", protect, addPostComment);
router.post("/:postId/poll-vote", protect, voteOnPoll);
router.post("/:postId/share", protect, incrementPostShare);
router.delete("/:postId", protect, deleteCommunityPost);

export default router;