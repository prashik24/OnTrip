import express from "express";
import { protect } from "../middleware/auth.js";
import {
  generateAiTripPlan,
  chatAiTripPlan,
} from "../controllers/aiPlannerController.js";

const router = express.Router();

router.post("/generate", protect, generateAiTripPlan);
router.post("/chat", protect, chatAiTripPlan);

export default router;