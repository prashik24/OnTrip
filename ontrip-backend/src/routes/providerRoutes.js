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

/*
  IMPORTANT:
  Specific routes like /mine must come BEFORE /:id
  Otherwise "mine" is treated like an id.
*/

// Public routes
router.get("/", getProviders);

// Protected routes
router.get("/mine", protect, getMyProviders);
router.post("/", protect, upload.any(), createProvider);
router.put("/:id", protect, upload.any(), updateProvider);
router.delete("/:id", protect, deleteProvider);

// Public single route - keep LAST
router.get("/:id", getProviderById);

export default router;