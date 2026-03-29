import dotenv from "dotenv";
dotenv.config();

import http from "http";
import jwt from "jsonwebtoken";
import { Server } from "socket.io";

import app from "./app.js";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import { registerSocketHandlers } from "./socket/chatSocket.js";

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  const httpServer = http.createServer(app);

  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      credentials: true,
    },
  });

  app.set("io", io);

  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Not authorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("_id name email avatar");

      if (!user) {
        return next(new Error("User not found"));
      }

      socket.user = {
        id: String(user._id),
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
      };

      next();
    } catch (error) {
      next(new Error("Invalid or expired token"));
    }
  });

  registerSocketHandlers(io);

  httpServer.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Server start failed:", error);
  process.exit(1);
});