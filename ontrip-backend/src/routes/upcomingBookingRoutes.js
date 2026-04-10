import express from "express";
import { protect } from "../middleware/auth.js";
import {
  getUserUpcomingBookings,
  getProviderUpcomingBookings,
} from "../controllers/upcomingBookingController.js";

const router = express.Router();

router.get("/user", protect, getUserUpcomingBookings);
router.get("/provider", protect, getProviderUpcomingBookings);

export default router;