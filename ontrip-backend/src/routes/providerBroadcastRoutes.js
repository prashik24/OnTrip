import express from "express";
import {
  sendProviderBroadcast,
  getProviderBroadcasts,
} from "../controllers/providerBroadcastController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/send", protect, sendProviderBroadcast);
router.get("/my", protect, getProviderBroadcasts);

export default router;