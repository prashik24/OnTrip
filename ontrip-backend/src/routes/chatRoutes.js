import express from "express";
import { protect } from "../middleware/auth.js";
import chatUpload from "../middleware/chatUpload.js";
import {
  getChatUsers,
  getMyConversations,
  getOrCreateConversation,
  getConversationMessages,
  sendMessage,
  markConversationSeen,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/users", protect, getChatUsers);
router.get("/conversations", protect, getMyConversations);
router.post("/conversations/open", protect, getOrCreateConversation);
router.get("/conversations/:conversationId/messages", protect, getConversationMessages);
router.post("/messages", protect, chatUpload.single("file"), sendMessage);
router.post("/conversations/:conversationId/seen", protect, markConversationSeen);

export default router;