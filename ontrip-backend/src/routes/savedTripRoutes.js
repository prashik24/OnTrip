import { Router } from "express";
import {
  createSavedTrip,
  deleteSavedTrip,
  getMySavedTrips,
  getSavedTripById,
} from "../controllers/savedTripController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);

router.get("/", getMySavedTrips);
router.get("/:id", getSavedTripById);
router.post("/", createSavedTrip);
router.delete("/:id", deleteSavedTrip);

export default router;