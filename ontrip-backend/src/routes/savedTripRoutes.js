import express from "express";
import {
  createSavedTrip,
  deleteSavedTrip,
  getMySavedTrips,
  getSavedTripById,
} from "../controllers/savedTripController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getMySavedTrips);
router.get("/:id", protect, getSavedTripById);
router.post("/", protect, createSavedTrip);
router.delete("/:id", protect, deleteSavedTrip);

export default router;