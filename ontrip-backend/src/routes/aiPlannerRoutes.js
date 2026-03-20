import express from "express";
import { protect } from "../middleware/auth.js";
import { generateAiTripPlan } from "../controllers/aiPlannerController.js";

const router = express.Router();

// protected because planner is part of user trip workflow
router.post("/generate", protect, generateAiTripPlan);

export default router;