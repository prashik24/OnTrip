import express from "express";
import {
  createProvider,
  updateProvider,
  deleteProvider,
  getProviders,
  getProviderById,
  getMyProviders,
} from "../controllers/providerController.js";
import { protect } from "../middleware/auth.js";
import upload from "../middleware/upload.js";

const router = express.Router();

// Public routes
router.get("/", getProviders);
router.get("/:id", getProviderById);

// Logged-in provider routes
router.get("/mine", protect, getMyProviders);
router.post("/", protect, upload.any(), createProvider);
router.put("/:id", protect, upload.any(), updateProvider);
router.delete("/:id", protect, deleteProvider);

export default router;