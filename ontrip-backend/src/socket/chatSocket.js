import jwt from "jsonwebtoken";
import User from "../models/User.js";

const onlineSocketCountByUser = new Map();

async function setUserOnline(io, userId) {
  await User.findByIdAndUpdate(userId, {
    isOnline: true,
    lastSeenAt: new Date(),
  });

  io.emit("presence:update", {
    userId,
    isOnline: true,
    lastSeenAt: new Date(),
  });
}

async function setUserOffline(io, userId) {
  const now = new Date();

  await User.findByIdAndUpdate(userId, {
    isOnline: false,
    lastSeenAt: now,
  });

  io.emit("presence:update", {
    userId,
    isOnline: false,
    lastSeenAt: now,
  });
}

export function registerSocketHandlers(io) {
  io.on("connection", async (socket) => {
    const userId = socket.user?.id;

    if (!userId) {
      socket.disconnect();
      return;
    }

    socket.join(`user:${userId}`);

    const currentCount = onlineSocketCountByUser.get(userId) || 0;
    onlineSocketCountByUser.set(userId, currentCount + 1);

    await setUserOnline(io, userId);

    socket.on("conversation:join", ({ conversationId }) => {
      if (!conversationId) return;
      socket.join(`conversation:${conversationId}`);
    });

    socket.on("conversation:leave", ({ conversationId }) => {
      if (!conversationId) return;
      socket.leave(`conversation:${conversationId}`);
    });

    socket.on("typing:start", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        userId,
        isTyping: true,
      });
    });

    socket.on("typing:stop", ({ conversationId }) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit("typing:update", {
        conversationId,
        userId,
        isTyping: false,
      });
    });

    socket.on("disconnect", async () => {
      const count = onlineSocketCountByUser.get(userId) || 0;
      const nextCount = Math.max(count - 1, 0);

      if (nextCount === 0) {
        onlineSocketCountByUser.delete(userId);
        await setUserOffline(io, userId);
      } else {
        onlineSocketCountByUser.set(userId, nextCount);
      }
    });
  });
}