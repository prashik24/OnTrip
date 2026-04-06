import express from "express";
import { protect } from "../middleware/auth.js";
import { sendProviderBroadcastEmail } from "../controllers/providerBroadcastController.js";

const router = express.Router();

router.post("/send-email", protect, sendProviderBroadcastEmail);

export default router;