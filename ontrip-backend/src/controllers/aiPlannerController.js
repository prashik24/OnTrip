import OpenAI from "openai";
import Provider from "../models/Provider.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
            images: safeArray(provider.travelPlanner?.images).map((img) => img?.url).filter(Boolean),
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
    const cleanDestinationLower = normalizeText(cleanDestination);

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

    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        message: "AI key not configured. Showing provider-based fallback plan.",
        plan: fallback,
        recommendedTravelProviders: travelProviders.slice(0, 4),
        recommendedVehicleProviders: vehicleProviders.slice(0, 4),
      });
    }

    const prompt = `
You are a travel planning assistant for a platform called OnTrip.

Create a smart, practical trip plan in JSON only.

User request:
- Destination: ${cleanDestination}
- Days: ${Number(days)}
- Budget: ${Number(budget)}
- People: ${Number(peopleCount)}
- Travel style: ${travelStyle}
- Start city: ${startCity || "Not provided"}

Available providers on the platform:
${JSON.stringify(
  {
    travelProviders,
    vehicleProviders,
  },
  null,
  2
)}

Return ONLY valid JSON in this exact shape:
{
  "title": "string",
  "summary": "string",
  "whyRecommended": "string",
  "itinerary": [
    {
      "day": 1,
      "title": "string",
      "items": ["string", "string", "string"]
    }
  ],
  "budgetBreakdown": [
    { "label": "Stay", "amount": 0 }
  ],
  "transportAdvice": "string",
  "travelProviderIds": ["providerId"],
  "vehicleProviderIds": ["providerId"],
  "tips": ["string", "string", "string"]
}

Rules:
- Prefer provider recommendations matching the destination.
- Recommend travel planners if they fit sightseeing/package needs.
- Recommend vehicle providers if local transport or day trips make sense.
- Keep itinerary realistic and easy to understand.
- Amount values must be numbers.
- travelProviderIds and vehicleProviderIds must come only from provided providers.
- Do not include markdown.
`;

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content:
            "You generate structured travel planning JSON for a marketplace app.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices?.[0]?.message?.content || "{}";
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = fallback;
    }

    const selectedTravelProviders = travelProviders.filter((item) =>
      safeArray(parsed.travelProviderIds).includes(String(item._id))
    );

    const selectedVehicleProviders = vehicleProviders.filter((item) =>
      safeArray(parsed.vehicleProviderIds).includes(String(item._id))
    );

    return res.json({
      message: "AI trip plan generated successfully.",
      plan: {
        ...fallback,
        ...parsed,
      },
      recommendedTravelProviders:
        selectedTravelProviders.length > 0
          ? selectedTravelProviders
          : travelProviders.slice(0, 4),
      recommendedVehicleProviders:
        selectedVehicleProviders.length > 0
          ? selectedVehicleProviders
          : vehicleProviders.slice(0, 4),
    });
  } catch (error) {
    console.error("generateAiTripPlan error", error);
    return res.status(500).json({
      message: error?.message || "Failed to generate AI trip plan.",
    });
  }
}