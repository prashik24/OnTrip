import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import providerRoutes from "./routes/providerRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";
import bookingRoutes from "./routes/bookingRoutes.js";
import communityRoutes from "./routes/communityRoutes.js";
import aiPlannerRoutes from "./routes/aiPlannerRoutes.js";
import savedTripRoutes from "./routes/savedTripRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import subscriberRoutes from "./routes/subscriberRoutes.js";
import providerBroadcastRoutes from "./routes/providerBroadcastRoutes.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "OnTrip API running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/providers", providerRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/ai-planner", aiPlannerRoutes);
app.use("/api/saved-trips", savedTripRoutes);
app.use("/api/community", communityRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/subscribers", subscriberRoutes);
app.use("/api/provider-broadcasts", providerBroadcastRoutes);

export default app;