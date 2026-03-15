import express from "express";
import {
  createBookingOrder,
  verifyBookingPayment,
  getMyBookings,
  getProviderBookings,
  updateBookingStatus,
  getBookingById,
  downloadInvoice,
} from "../controllers/bookingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", protect, createBookingOrder);
router.post("/verify-payment", protect, verifyBookingPayment);

router.get("/mine", protect, getMyBookings);
router.get("/provider", protect, getProviderBookings);
router.get("/:id", protect, getBookingById);
router.get("/:id/invoice", protect, downloadInvoice);

router.put("/:id/status", protect, updateBookingStatus);

export default router;