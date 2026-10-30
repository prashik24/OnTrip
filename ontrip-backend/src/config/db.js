import mongoose from "mongoose";
import dns from "dns";

// Use public DNS to resolve MongoDB SRV records reliably on Windows/ISPs
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (err) {
  // Ignore if custom DNS cannot be set
}

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    if (error.message.includes("ENOTFOUND") || error.message.includes("ECONNREFUSED")) {
      console.warn("💡 Tip: If using MongoDB Atlas, verify your cluster is active (not paused) on https://cloud.mongodb.com and that your IP is whitelisted (0.0.0.0/0).");
    }
    process.exit(1);
  }
}

export default connectDB;
