import express from "express";
import {
  sendProviderBroadcast,
  getProviderBroadcasts,
  getAllProviderBroadcasts,
} from "../controllers/providerBroadcastController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/send", protect, sendProviderBroadcast);
router.get("/my", protect, getProviderBroadcasts);
router.get("/all", protect, getAllProviderBroadcasts);

export default router;