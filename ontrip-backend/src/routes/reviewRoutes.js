import express from "express";
import { addReviewFromBooking, getReviewsByProvider } from "../controllers/reviewController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.post("/from-booking", protect, upload.array("images", 4), addReviewFromBooking);
router.get("/:providerId", getReviewsByProvider);

export default router;