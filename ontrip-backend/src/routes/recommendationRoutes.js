import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getPersonalizedRecommendations } from "../controllers/recommendationController.js";

const router = express.Router();

/**
 * Optional authentication middleware:
 * If a valid token is present, attaches req.user.
 * If not present, proceeds as a guest user.
 */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : req.cookies?.token || null;

    if (token && process.env.JWT_SECRET) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.userId).select("-passwordHash");
    }
  } catch (err) {
    // Continue as guest
  }
  next();
}

// GET /api/recommendations/places
router.get("/places", optionalAuth, getPersonalizedRecommendations);

export default router;
