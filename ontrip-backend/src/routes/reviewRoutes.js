import express from "express";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";
import {
  addReviewFromBooking,
  getReviewsByProvider,
  voteReview,
} from "../controllers/reviewController.js";

const router = express.Router();

router.post("/booking", protect, upload.any(), addReviewFromBooking);
router.post("/:reviewId/vote", protect, voteReview);
router.get("/:providerId", getReviewsByProvider);

export default router;