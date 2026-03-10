import express from "express";
import { addReview, getReviewsByProvider } from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, addReview);
router.get("/:providerId", getReviewsByProvider);

export default router;