import express from "express";
import {
  createProvider,
  getProviders,
  getProviderById,
  getMyProviders,
} from "../controllers/providerController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", getProviders);
router.get("/mine", protect, getMyProviders);
router.get("/:id", getProviderById);
router.post("/", protect, createProvider);

export default router;