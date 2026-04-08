import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getSubscriberStatus,
  subscribeUser,
  unsubscribeUser,
  getAllSubscribersForProvider,
} from "../controllers/subscriberController.js";

const router = express.Router();

router.get("/status", protect, getSubscriberStatus);
router.get("/all", protect, getAllSubscribersForProvider);
router.post("/subscribe", protect, subscribeUser);
router.post("/unsubscribe", protect, unsubscribeUser);

export default router;