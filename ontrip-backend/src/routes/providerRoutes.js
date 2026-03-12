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

router.get("/", getProviders);
router.get("/mine", protect, getMyProviders);
router.get("/:id", getProviderById);

router.post("/", protect, upload.any(), createProvider);
router.put("/:id", protect, upload.any(), updateProvider);
router.delete("/:id", protect, deleteProvider);

export default router;