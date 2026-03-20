import { GoogleGenAI } from "@google/genai";
import Provider from "../models/Provider.js";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function extractUsefulProviders(providers = []) {
  return providers.map((provider) => ({
    _id: provider._id,
    businessName: provider.businessName,
    listingType: provider.listingType,
    city: provider.city,
    state: provider.state,
    description: provider.description,
    ratingAverage: provider.ratingAverage || 0,
    ratingCount: provider.ratingCount || 0,
    phone: provider.phone || "",
    whatsapp: provider.whatsapp || "",
    serviceImage: provider.serviceImage?.url || "",
    travelPlanner:
      provider.listingType === "travel_planner"
        ? {
            packageTitle: provider.travelPlanner?.packageTitle || "",
            durationText: provider.travelPlanner?.durationText || "",
            days: provider.travelPlanner?.days || 1,
            priceFrom: provider.travelPlanner?.priceFrom || 0,
            pricePerPerson: provider.travelPlanner?.pricePerPerson || 0,
            placesCovered: safeArray(provider.travelPlanner?.placesCovered),
            inclusions: safeArray(provider.travelPlanner?.inclusions),
            exclusions: safeArray(provider.travelPlanner?.exclusions),
            images: safeArray(provider.travelPlanner?.images)
              .map((img) => img?.url)
              .filter(Boolean),
          }
        : null,
    vehicles:
      provider.listingType === "vehicle"
        ? safeArray(provider.vehicles).map((vehicle) => ({
            _id: vehicle._id,
            vehicleType: vehicle.vehicleType,
            title: vehicle.title || "",
            price: vehicle.price || 0,
            priceUnit: vehicle.priceUnit || "per_day",
            capacity: vehicle.capacity || 1,
            fuelType: vehicle.fuelType || "",
            withDriver: !!vehicle.withDriver,
            image: vehicle.images?.[0]?.url || "",
          }))
        : [],
  }));
}

function buildLocalFallback({
  destination,
  days,
  budget,
  peopleCount,
  travelStyle,
  travelProviders,
  vehicleProviders,
}) {
  const dayPlan = Array.from({ length: Number(days || 1) }).map((_, index) => ({
    day: index + 1,
    title:
      index === 0
        ? `Arrival and city introduction in ${destination}`
        : index === Number(days || 1) - 1
        ? `Relaxed finish and departure from ${destination}`
        : `Explore major attractions and local experiences in ${destination}`,
    items: [
      "Visit a major landmark",
      "Try local food",
      "Explore market or relax",
    ],
  }));

  return {
    title: `${destination} AI Trip Plan`,
    summary: `${destination} trip for ${peopleCount} people, ${days} days, ₹${budget} budget.`,
    whyRecommended: "Balanced plan using your inputs and providers.",
    itinerary: dayPlan,
    budgetBreakdown: [
      { label: "Stay", amount: Math.round(budget * 0.35) },
      { label: "Food", amount: Math.round(budget * 0.2) },
      { label: "Transport", amount: Math.round(budget * 0.2) },
      { label: "Activities", amount: Math.round(budget * 0.15) },
      { label: "Buffer", amount: Math.round(budget * 0.1) },
    ],
    transportAdvice: "Use local providers.",
    travelProviderIds: travelProviders.slice(0, 3).map((i) => String(i._id)),
    vehicleProviderIds: vehicleProviders.slice(0, 3).map((i) => String(i._id)),
    tips: ["Book early", "Compare options", "Keep extra budget"],
  };
}

export async function generateAiTripPlan(req, res) {
  try {
    const {
      destination,
      days = 3,
      budget = 10000,
      peopleCount = 1,
      travelStyle = "Balanced",
    } = req.body || {};

    if (!destination) {
      return res.status(400).json({ message: "Destination required" });
    }

    const providers = await Provider.find({ isActive: true }).limit(20);

    const normalized = extractUsefulProviders(providers);

    const travelProviders = normalized.filter(
      (i) => i.listingType === "travel_planner"
    );
    const vehicleProviders = normalized.filter(
      (i) => i.listingType === "vehicle"
    );

    const fallback = buildLocalFallback({
      destination,
      days,
      budget,
      peopleCount,
      travelStyle,
      travelProviders,
      vehicleProviders,
    });

    // ✅ NO KEY → fallback
    if (!process.env.GEMINI_API_KEY) {
      return res.json({ plan: fallback });
    }

    const prompt = `
Return JSON only.
Destination: ${destination}
Days: ${days}
Budget: ${budget}
People: ${peopleCount}
Style: ${travelStyle}
`;

    let raw = "{}";

    try {
      console.log("🔥 Using Gemini 3");

      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash", // ✅ latest working
        contents: prompt,
      });

      raw = response.text || "{}";

    } catch (err) {
      console.error("❌ AI Failed:", err.message);
      raw = JSON.stringify(fallback);
    }

    let parsed;

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : fallback;
    } catch {
      parsed = fallback;
    }

    return res.json({
      plan: { ...fallback, ...parsed },
      recommendedTravelProviders: travelProviders.slice(0, 4),
      recommendedVehicleProviders: vehicleProviders.slice(0, 4),
    });

  } catch (error) {
    console.error("🔥 ERROR:", error);
    return res.status(500).json({ message: "Failed" });
  }
}