import Provider from "../models/Provider.js";
import {
  answerTripChat,
  buildTripIntelligence,
  extractUsefulProviders,
} from "../services/travelPlannerService.js";

export async function generateAiTripPlan(req, res) {
  try {
    const {
      destination,
      days = 3,
      budget = 10000,
      peopleCount = 1,
      travelStyle = "Balanced",
      startCity = "",
    } = req.body || {};

    if (!destination?.trim()) {
      return res.status(400).json({ message: "Destination required" });
    }

    const providers = await Provider.find({ isActive: true }).limit(100);
    const normalizedProviders = extractUsefulProviders(providers);

    const result = await buildTripIntelligence({
      destination: destination.trim(),
      startCity: startCity.trim(),
      days: Number(days),
      budget: Number(budget),
      peopleCount: Number(peopleCount),
      travelStyle,
      providersNormalized: normalizedProviders,
    });

    return res.json(result);
  } catch (error) {
    console.error("generateAiTripPlan error:", error);
    return res.status(500).json({ message: "Failed to generate trip plan" });
  }
}

export async function chatAiTripPlan(req, res) {
  try {
    const { message, plan, history = [] } = req.body || {};

    if (!message?.trim()) {
      return res.status(400).json({ message: "Message required" });
    }

    const reply = await answerTripChat({
      message: message.trim(),
      plan,
      history,
    });

    return res.json({ reply });
  } catch (error) {
    console.error("chatAiTripPlan error:", error);
    return res.status(500).json({ message: "Failed to answer chat" });
  }
}