import { GoogleGenerativeAI } from "@google/generative-ai";
import Provider from "../models/Provider.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

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
      "Start early and visit a major landmark",
      "Try local food at a popular market area",
      "Keep one flexible slot for shopping or rest",
    ],
  }));

  return {
    title: `${destination} AI Trip Plan`,
    summary: `${destination} trip for ${peopleCount} traveler(s), ${days} day(s), ${travelStyle} style, estimated budget around ₹${budget}.`,
    whyRecommended:
      "This plan uses your selected inputs and available providers from the platform to suggest practical travel and transport options.",
    itinerary: dayPlan,
    budgetBreakdown: [
      { label: "Stay", amount: Math.round(Number(budget || 0) * 0.35) },
      { label: "Food", amount: Math.round(Number(budget || 0) * 0.2) },
      { label: "Transport", amount: Math.round(Number(budget || 0) * 0.2) },
      { label: "Activities", amount: Math.round(Number(budget || 0) * 0.15) },
      { label: "Buffer", amount: Math.round(Number(budget || 0) * 0.1) },
    ],
    transportAdvice:
      "Use provider recommendations below for easier local transport and package support.",
    travelProviderIds: travelProviders.slice(0, 3).map((item) => String(item._id)),
    vehicleProviderIds: vehicleProviders.slice(0, 3).map((item) => String(item._id)),
    tips: [
      "Book early for better availability.",
      "Compare vehicle and travel planner options before paying.",
      "Keep buffer budget for local travel and entry tickets.",
    ],
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
      startCity = "",
    } = req.body || {};

    if (!destination || !String(destination).trim()) {
      return res.status(400).json({ message: "Destination is required." });
    }

    const cleanDestination = String(destination).trim();

    const providers = await Provider.find({
      isActive: true,
      $or: [
        { city: new RegExp(cleanDestination, "i") },
        { state: new RegExp(cleanDestination, "i") },
        { businessName: new RegExp(cleanDestination, "i") },
        { description: new RegExp(cleanDestination, "i") },
        { "travelPlanner.packageTitle": new RegExp(cleanDestination, "i") },
        { "travelPlanner.placesCovered": new RegExp(cleanDestination, "i") },
      ],
    })
      .populate("owner", "name")
      .sort({ ratingAverage: -1, ratingCount: -1, createdAt: -1 })
      .limit(20);

    const normalizedProviders = extractUsefulProviders(providers);

    const travelProviders = normalizedProviders.filter(
      (item) => item.listingType === "travel_planner"
    );

    const vehicleProviders = normalizedProviders.filter(
      (item) => item.listingType === "vehicle"
    );

    const fallback = buildLocalFallback({
      destination: cleanDestination,
      days,
      budget,
      peopleCount,
      travelStyle,
      travelProviders,
      vehicleProviders,
    });

    // ✅ if no API key → fallback
    if (!process.env.GEMINI_API_KEY) {
      return res.json({
        message: "AI key not configured. Showing fallback plan.",
        plan: fallback,
        recommendedTravelProviders: travelProviders.slice(0, 4),
        recommendedVehicleProviders: vehicleProviders.slice(0, 4),
      });
    }

    const prompt = `
You are a travel planner.

Return ONLY JSON.

Destination: ${cleanDestination}
Days: ${days}
Budget: ${budget}
People: ${peopleCount}
Style: ${travelStyle}

Return structured JSON with itinerary, budgetBreakdown, tips.
`;

    // ✅ WORKING FREE MODEL
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    const resultAI = await model.generateContent(prompt);
    const raw = resultAI.response.text() || "{}";

    let parsed;

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : fallback;
    } catch {
      parsed = fallback;
    }

    return res.json({
      message: "AI trip plan generated successfully.",
      plan: {
        ...fallback,
        ...parsed,
      },
      recommendedTravelProviders: travelProviders.slice(0, 4),
      recommendedVehicleProviders: vehicleProviders.slice(0, 4),
    });
  } catch (error) {
    console.error("generateAiTripPlan error", error);
    return res.status(500).json({
      message: error?.message || "Failed to generate AI trip plan.",
    });
  }
}