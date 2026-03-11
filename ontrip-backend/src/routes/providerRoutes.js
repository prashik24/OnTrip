import express from "express";
import {
  createProvider,
  updateProvider,
  getProviders,
  getProviderById,
  getMyProviders,
} from "../controllers/providerController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

router.get("/", getProviders);
router.get("/mine", protect, getMyProviders);
router.get("/:id", getProviderById);

// IMPORTANT: multer must come before controller
router.post("/", protect, upload.array("images", 10), createProvider);
router.put("/:id", protect, upload.array("images", 10), updateProvider);

export default router;