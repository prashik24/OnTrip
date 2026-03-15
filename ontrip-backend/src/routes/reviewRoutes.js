import express from "express";
import upload from "../middleware/upload.js";
import { protect } from "../middleware/auth.js";
import {
  addReviewFromBooking,
  getReviewsByProvider,
} from "../controllers/reviewController.js";

const router = express.Router();

router.post("/booking", protect, upload.any(), addReviewFromBooking);
router.get("/:providerId", getReviewsByProvider);

export default router;