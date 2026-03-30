import express from "express";
import { protect } from "../middleware/auth.js";
import chatUpload from "../middleware/chatUpload.js";
import {
  getChatUsers,
  getMyConversations,
  getMyGroups,
  getOrCreateConversation,
  createGroupConversation,
  getConversationMessages,
  sendMessage,
  editMessage,
  deleteMessageForMe,
  forwardMessage,
  clearConversationForMe,
  markConversationSeen,
  sendProviderListingCard,
  broadcastProviderUpdate,
} from "../controllers/chatController.js";

const router = express.Router();

router.get("/users", protect, getChatUsers);
router.get("/conversations", protect, getMyConversations);
router.get("/groups", protect, getMyGroups);

router.post("/conversations/open", protect, getOrCreateConversation);
router.post("/conversations/group", protect, createGroupConversation);

router.get(
  "/conversations/:conversationId/messages",
  protect,
  getConversationMessages
);

router.post(
  "/conversations/:conversationId/seen",
  protect,
  markConversationSeen
);

router.delete(
  "/conversations/:conversationId/clear",
  protect,
  clearConversationForMe
);

router.post(
  "/messages",
  protect,
  chatUpload.single("file"),
  sendMessage
);

router.put("/messages/:messageId", protect, editMessage);

router.delete(
  "/messages/:messageId/delete-for-me",
  protect,
  deleteMessageForMe
);

router.post("/messages/:messageId/forward", protect, forwardMessage);

router.post(
  "/provider/send-listing-card",
  protect,
  sendProviderListingCard
);

router.post(
  "/provider/broadcast",
  protect,
  broadcastProviderUpdate
);

export default router;