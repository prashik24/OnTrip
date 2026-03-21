import { GoogleGenAI } from "@google/genai";

const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  : null;

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const YOUR_SITE_URL = process.env.YOUR_SITE_URL || "";
const YOUR_SITE_NAME = process.env.YOUR_SITE_NAME || "OnTrip AI Planner";

const GEMINI_MODEL = "gemini-2.5-flash";

/**
 * Put free or low-cost fallback models here.
 * OpenRouter supports model fallback routing with arrays,
 * but here we also do explicit code-level fallback for clarity.
 */
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-exp:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  return response.json();
}

function isQuotaOrRateError(error) {
  const text = String(error?.message || "").toLowerCase();
  return (
    text.includes("429") ||
    text.includes("quota") ||
    text.includes("resource_exhausted") ||
    text.includes("rate limit") ||
    text.includes("too many requests")
  );
}

function extractJson(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        return fallback;
      }
    }
    return fallback;
  }
}

async function generateWithGeminiText(prompt) {
  if (!ai) {
    throw new Error("Gemini API key missing");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return response.text || "";
}

async function generateWithGeminiJson(prompt) {
  if (!ai) {
    throw new Error("Gemini API key missing");
  }

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "{}";
  const parsed = extractJson(text, null);

  if (!parsed) {
    throw new Error("Gemini returned invalid JSON");
  }

  return parsed;
}

async function generateWithOpenRouterText(prompt) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OpenRouter API key missing");
  }

  let lastError = null;

  for (const model of OPENROUTER_MODELS) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": YOUR_SITE_URL,
          "X-Title": YOUR_SITE_NAME,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.4,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`OpenRouter ${model} failed: ${response.status} ${text}`);
      }

      const data = await response.json();
      const content =
        data?.choices?.[0]?.message?.content ||
        data?.choices?.[0]?.text ||
        "";

      if (!content) {
        throw new Error(`OpenRouter ${model} returned empty response`);
      }

      return content;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

async function generateWithOpenRouterJson(prompt) {
  const text = await generateWithOpenRouterText(prompt);
  const parsed = extractJson(text, null);

  if (!parsed) {
    throw new Error("OpenRouter returned invalid JSON");
  }

  return parsed;
}

/**
 * Main AI wrapper:
 * 1) Gemini
 * 2) OpenRouter fallback
 */
async function generateJsonWithFallback(prompt, localFallback = null) {
  try {
    return await generateWithGeminiJson(prompt);
  } catch (geminiError) {
    console.error("Gemini JSON failed:", geminiError.message);

    try {
      return await generateWithOpenRouterJson(prompt);
    } catch (openRouterError) {
      console.error("OpenRouter JSON failed:", openRouterError.message);
      return localFallback;
    }
  }
}

async function generateTextWithFallback(prompt, localFallbackText = "") {
  try {
    return await generateWithGeminiText(prompt);
  } catch (geminiError) {
    console.error("Gemini text failed:", geminiError.message);

    try {
      return await generateWithOpenRouterText(prompt);
    } catch (openRouterError) {
      console.error("OpenRouter text failed:", openRouterError.message);
      return localFallbackText;
    }
  }
}

async function geocodeLocation(query) {
  if (!query) return null;

  await sleep(1100);

  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    query
  )}`;

  const data = await fetchJson(url, {
    headers: {
      "User-Agent": "ontrip-ai-planner/1.0",
      "Accept-Language": "en",
    },
  });

  const item = data?.[0];
  if (!item) return null;

  return {
    name: item.display_name || query,
    lat: Number(item.lat),
    lon: Number(item.lon),
  };
}

/**
 * OpenWeather free endpoints only
 */
async function getWeather(lat, lon) {
  if (!OPENWEATHER_API_KEY || lat == null || lon == null) return null;

  try {
    const currentUrl =
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
      `&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const forecastUrl =
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}` +
      `&appid=${OPENWEATHER_API_KEY}&units=metric`;

    const [currentData, forecastData] = await Promise.all([
      fetchJson(currentUrl),
      fetchJson(forecastUrl),
    ]);

    return {
      current: {
        temp: currentData?.main?.temp ?? null,
        feelsLike: currentData?.main?.feels_like ?? null,
        humidity: currentData?.main?.humidity ?? null,
        windSpeed: currentData?.wind?.speed ?? null,
        description: currentData?.weather?.[0]?.description || "",
        main: currentData?.weather?.[0]?.main || "",
      },
      hourly: safeArray(forecastData?.list)
        .slice(0, 8)
        .map((item) => ({
          dt: item?.dt ?? null,
          temp: item?.main?.temp ?? null,
          description: item?.weather?.[0]?.description || "",
          main: item?.weather?.[0]?.main || "",
        })),
      daily: buildDailyFromForecastList(forecastData?.list || []),
    };
  } catch (error) {
    console.error("getWeather error:", error.message);
    return null;
  }
}

function buildDailyFromForecastList(list = []) {
  const grouped = {};

  for (const item of list) {
    const date = item?.dt_txt?.split(" ")?.[0];
    if (!date) continue;

    if (!grouped[date]) {
      grouped[date] = {
        dt: item?.dt ?? null,
        min: Infinity,
        max: -Infinity,
        description: item?.weather?.[0]?.description || "",
        main: item?.weather?.[0]?.main || "",
      };
    }

    const tempMin = item?.main?.temp_min;
    const tempMax = item?.main?.temp_max;

    if (typeof tempMin === "number") {
      grouped[date].min = Math.min(grouped[date].min, tempMin);
    }

    if (typeof tempMax === "number") {
      grouped[date].max = Math.max(grouped[date].max, tempMax);
    }
  }

  return Object.values(grouped)
    .slice(0, 5)
    .map((day) => ({
      dt: day.dt,
      min: Number.isFinite(day.min) ? day.min : null,
      max: Number.isFinite(day.max) ? day.max : null,
      description: day.description,
      main: day.main,
    }));
}

function weatherSuitabilityLabel(description = "") {
  const text = String(description).toLowerCase();
  if (text.includes("rain") || text.includes("storm")) {
    return "Carry umbrella and keep indoor backup";
  }
  if (text.includes("fog")) {
    return "Start later in the morning if visibility is low";
  }
  if (text.includes("clear")) {
    return "Good for outdoor sightseeing";
  }
  if (text.includes("cloud")) {
    return "Comfortable for outdoor visits";
  }
  return "Check local conditions before long outdoor visits";
}

function estimatePlaceCostINR(placeName = "", type = "") {
  const text = `${placeName} ${type}`.toLowerCase();

  if (text.includes("fort") || text.includes("palace") || text.includes("museum")) {
    return { entryFee: 150, foodAndLocalTravel: 350, total: 500 };
  }
  if (text.includes("temple") || text.includes("ghat") || text.includes("church")) {
    return { entryFee: 0, foodAndLocalTravel: 250, total: 250 };
  }
  if (text.includes("garden") || text.includes("park") || text.includes("lake")) {
    return { entryFee: 80, foodAndLocalTravel: 300, total: 380 };
  }

  return { entryFee: 100, foodAndLocalTravel: 300, total: 400 };
}

function estimateCrowdLabel(index = 0) {
  if (index <= 1) return "High";
  if (index <= 3) return "Moderate";
  return "Low to Moderate";
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatDistance(km = 0) {
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

function formatDurationFromKm(distanceKm = 0, avgSpeedKmH = 28) {
  if (!distanceKm) return "0 min";
  const totalHours = distanceKm / avgSpeedKmH;
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);

  if (hrs <= 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function optimizePlaceOrder(startPoint, places) {
  if (!places.length) return places;

  const remaining = [...places];
  const ordered = [];

  let current = startPoint || remaining[0];

  while (remaining.length) {
    let bestIndex = 0;
    let bestDistance = Infinity;

    remaining.forEach((place, index) => {
      const d = haversineKm(current.lat, current.lon, place.lat, place.lon);
      if (d < bestDistance) {
        bestDistance = d;
        bestIndex = index;
      }
    });

    const next = remaining.splice(bestIndex, 1)[0];
    ordered.push(next);
    current = next;
  }

  return ordered.map((place, index) => {
    const prev = index === 0 ? startPoint : ordered[index - 1];
    const legKm = prev
      ? haversineKm(prev.lat, prev.lon, place.lat, place.lon)
      : 0;

    return {
      ...place,
      order: index + 1,
      fromPreviousDistanceKm: Number(legKm.toFixed(1)),
      fromPreviousDistanceText: formatDistance(legKm),
      fromPreviousDurationText: formatDurationFromKm(legKm),
    };
  });
}

function localPlacesFallback(destination, interestFocus = []) {
  const focusText = interestFocus.length
    ? interestFocus.join(", ")
    : "general sightseeing";

  return [
    {
      name: `${destination} Main Landmark`,
      reason: "Popular and important sightseeing place",
      category: focusText,
      exploreTimeText: "1 to 2 hours",
    },
    {
      name: `${destination} Old City Area`,
      reason: "Good for local culture and food",
      category: focusText,
      exploreTimeText: "2 to 3 hours",
    },
    {
      name: `${destination} Famous Temple`,
      reason: "Important spiritual place",
      category: "temple",
      exploreTimeText: "1 to 1.5 hours",
    },
    {
      name: `${destination} Nature Point`,
      reason: "Relaxing outdoor experience",
      category: "nature",
      exploreTimeText: "1.5 to 2 hours",
    },
    {
      name: `${destination} Market Area`,
      reason: "Useful for local shopping and food exploration",
      category: "shopping",
      exploreTimeText: "1 to 2 hours",
    },
  ];
}

async function generateFamousPlacesWithAI(destination, interestFocus = []) {
  const focusText = interestFocus.length
    ? interestFocus.join(", ")
    : "general sightseeing";

  const fallback = { places: localPlacesFallback(destination, interestFocus) };

  const prompt = `
Return JSON only.

Destination: ${destination}
User interest focus: ${focusText}

Generate 6 famous subplaces.
Prioritize the user's focus strongly.

Format:
{
  "places": [
    {
      "name": "",
      "reason": "",
      "category": "",
      "exploreTimeText": ""
    }
  ]
}
`;

  const parsed = await generateJsonWithFallback(prompt, fallback);
  return safeArray(parsed?.places).slice(0, 6);
}

async function enrichPlaces(destination, places, weatherDescription = "") {
  const enriched = [];

  for (const place of places) {
    const geo = await geocodeLocation(`${place.name}, ${destination}`);
    enriched.push({
      ...place,
      lat: geo?.lat ?? null,
      lon: geo?.lon ?? null,
      estimatedCostINR: estimatePlaceCostINR(place.name, place.category),
      weatherSuitability: weatherSuitabilityLabel(weatherDescription),
    });
  }

  return enriched.filter((p) => p.lat != null && p.lon != null);
}

function localTravelModesFallback(startCity, destination) {
  return {
    airplane: {
      title: "Airplane",
      optionName: `${startCity || "Nearest city"} to ${destination} flight`,
      estimatedTime: "Usually fastest for long-distance travel",
      details: "Use nearest airport, then take city cab or local transfer.",
      note: "Estimated guidance, not a live flight schedule.",
    },
    railway: {
      title: "Railway",
      optionName: `${startCity || "Nearest city"} to ${destination} train route`,
      estimatedTime: "Depends on direct train availability",
      details: "Check major express or overnight train options for better comfort.",
      note: "Estimated guidance, not a live railway timetable.",
    },
    road: {
      title: "Road",
      optionName: `${startCity || "Nearest city"} to ${destination} road trip / bus`,
      estimatedTime: "Depends on road distance and traffic",
      details: "Useful when rail or flight access is weak, or for flexible stops.",
      note: "Estimated guidance, not a live bus timetable.",
    },
  };
}

async function buildTravelModesWithAI(startCity, destination) {
  const fallback = localTravelModesFallback(startCity, destination);

  const prompt = `
Return JSON only.

Start city: ${startCity || "Not provided"}
Destination: ${destination}

I need practical but non-live travel suggestions.
Do NOT pretend these are live schedules.
Give likely route names and approximate times.

Format:
{
  "airplane": {
    "title": "Airplane",
    "optionName": "",
    "estimatedTime": "",
    "details": "",
    "note": "Estimated guidance, not a live flight schedule."
  },
  "railway": {
    "title": "Railway",
    "optionName": "",
    "estimatedTime": "",
    "details": "",
    "note": "Estimated guidance, not a live railway timetable."
  },
  "road": {
    "title": "Road",
    "optionName": "",
    "estimatedTime": "",
    "details": "",
    "note": "Estimated guidance, not a live bus timetable."
  }
}
`;

  const parsed = await generateJsonWithFallback(prompt, fallback);
  return {
    ...fallback,
    ...(parsed || {}),
  };
}

function buildRouteSummary(startName, orderedPlaces) {
  let totalKm = 0;
  const routeOrder = [];

  orderedPlaces.forEach((place) => {
    totalKm += num(place.fromPreviousDistanceKm, 0);
    routeOrder.push(place.name);
  });

  return {
    startLabel: startName,
    routeOrder,
    totalDistanceText: formatDistance(totalKm),
    totalDurationText: formatDurationFromKm(totalKm),
  };
}

function buildItinerary(days, destination, orderedPlaces) {
  const totalDays = Math.max(1, Number(days || 1));
  const placesPerDay = Math.max(1, Math.ceil(orderedPlaces.length / totalDays));

  return Array.from({ length: totalDays }).map((_, index) => {
    const dayPlaces = orderedPlaces.slice(
      index * placesPerDay,
      index * placesPerDay + placesPerDay
    );

    return {
      day: index + 1,
      title:
        index === 0
          ? `Arrival and first exploration in ${destination}`
          : index === totalDays - 1
          ? `Final sightseeing and relaxed finish in ${destination}`
          : `Focused sightseeing circuit in ${destination}`,
      items: dayPlaces.map(
        (place) =>
          `${place.name} • explore ${place.exploreTimeText} • from previous stop ${place.fromPreviousDurationText}`
      ),
    };
  });
}

function buildFallbackPlan({
  destination,
  days,
  budget,
  peopleCount,
  travelStyle,
  weather,
  orderedPlaces,
  travelModes,
}) {
  return {
    title: `${destination} Smart Trip Plan`,
    summary: `${destination} trip for ${peopleCount} people over ${days} days with ₹${budget} budget in ${travelStyle} style.`,
    destinationWhyFamous: `${destination} is known for popular sightseeing, local culture, food, and memorable visitor experiences.`,
    bestTimeToVisit: weather?.current?.description
      ? `Current weather: ${weather.current.description}. Plan outdoor visits accordingly.`
      : `Keep weather flexibility during your sightseeing plan.`,
    travelModes,
    itinerary: buildItinerary(days, destination, orderedPlaces),
    budgetBreakdown: [
      { label: "Stay", amount: Math.round(budget * 0.35) },
      { label: "Food", amount: Math.round(budget * 0.2) },
      { label: "Local Transport", amount: Math.round(budget * 0.18) },
      { label: "Sightseeing", amount: Math.round(budget * 0.17) },
      { label: "Buffer", amount: Math.round(budget * 0.1) },
    ],
    transportAdvice:
      "Follow the shown route order to reduce backtracking. Visit crowded places early and keep nearby stops on the same day.",
    tips: [
      "Start early for popular places.",
      "Keep buffer time for traffic and queues.",
      "Carry water and weather-appropriate essentials.",
    ],
  };
}

async function generateStructuredTripPlan({
  destination,
  days,
  budget,
  peopleCount,
  travelStyle,
  weather,
  orderedPlaces,
  travelModes,
  interestFocus,
}) {
  const fallback = null;

  const prompt = `
Return JSON only.

Destination: ${destination}
Days: ${days}
Budget INR: ${budget}
People count: ${peopleCount}
Travel style: ${travelStyle}
User interest focus: ${interestFocus.join(", ") || "general"}

Travel modes:
${JSON.stringify(travelModes, null, 2)}

Weather:
${JSON.stringify(weather || {}, null, 2)}

Ordered places:
${JSON.stringify(orderedPlaces, null, 2)}

Format:
{
  "title": "",
  "summary": "",
  "destinationWhyFamous": "",
  "bestTimeToVisit": "",
  "travelModes": {},
  "itinerary": [],
  "budgetBreakdown": [],
  "transportAdvice": "",
  "tips": []
}

Rules:
- focus strongly on user's selected interests
- keep route order practical
- include place explore times naturally
- do not include a "why this plan" section
- keep airplane, railway, and road wording clean
`;

  return await generateJsonWithFallback(prompt, fallback);
}

export function extractUsefulProviders(providers = []) {
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
          }))
        : [],
  }));
}

function providerMatchScore(provider, destination) {
  const text = [
    provider.businessName,
    provider.city,
    provider.state,
    provider.description,
    provider.travelPlanner?.packageTitle,
    ...(provider.travelPlanner?.placesCovered || []),
  ]
    .join(" ")
    .toLowerCase();

  const dest = String(destination || "").toLowerCase();

  let score = 0;
  if (text.includes(dest)) score += 5;
  if (provider.city?.toLowerCase() === dest) score += 5;
  score += num(provider.ratingAverage);
  score += Math.min(num(provider.ratingCount) / 100, 2);

  return score;
}

export async function answerTripChat({ message, plan, history = [] }) {
  const localFallbackText =
    "I could not reach the AI service right now. Based on your plan, follow the shown route order, keep weather in mind, and visit the most crowded places early in the day.";

  const prompt = `
You are a helpful travel assistant.

Trip context:
${JSON.stringify(plan || {}, null, 2)}

Conversation history:
${JSON.stringify(history.slice(-8), null, 2)}

User message:
${message}

Instructions:
- answer only in this trip context
- help with route order, timing, weather, packing, local transport, and budgeting
- keep reply practical and short
`;

  return await generateTextWithFallback(prompt, localFallbackText);
}

export async function buildTripIntelligence({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  interestFocus = [],
  providersNormalized,
}) {
  const destinationGeo = await geocodeLocation(destination);
  const startGeo = startCity ? await geocodeLocation(startCity) : destinationGeo;

  const weather =
    destinationGeo?.lat != null && destinationGeo?.lon != null
      ? await getWeather(destinationGeo.lat, destinationGeo.lon)
      : null;

  const rawPlaces = await generateFamousPlacesWithAI(destination, interestFocus);
  const enrichedPlaces = await enrichPlaces(
    destination,
    rawPlaces,
    weather?.current?.description || ""
  );

  const orderedPlaces = optimizePlaceOrder(startGeo, enrichedPlaces).map((p, index) => ({
    ...p,
    crowdLabel: estimateCrowdLabel(index),
  }));

  const travelModes = await buildTravelModesWithAI(startCity, destination);
  const routeSummary = buildRouteSummary(startCity || destination, orderedPlaces);

  const aiPlan = await generateStructuredTripPlan({
    destination,
    days,
    budget,
    peopleCount,
    travelStyle,
    weather,
    orderedPlaces,
    travelModes,
    interestFocus,
  });

  const fallback = buildFallbackPlan({
    destination,
    days,
    budget,
    peopleCount,
    travelStyle,
    weather,
    orderedPlaces,
    travelModes,
  });

  const plan = {
    ...fallback,
    ...(aiPlan || {}),
  };

  const recommendedTravelProviders = providersNormalized
    .filter((p) => p.listingType === "travel_planner")
    .sort(
      (a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination)
    )
    .slice(0, 4);

  const recommendedVehicleProviders = providersNormalized
    .filter((p) => p.listingType === "vehicle")
    .sort(
      (a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination)
    )
    .slice(0, 4);

  return {
    plan,
    weather,
    famousPlaces: orderedPlaces,
    routeSummary,
    mapData: {
      center: destinationGeo
        ? [destinationGeo.lat, destinationGeo.lon]
        : orderedPlaces[0]
        ? [orderedPlaces[0].lat, orderedPlaces[0].lon]
        : [20.5937, 78.9629],
      routeCoords: orderedPlaces.map((p) => [p.lat, p.lon]),
      markers: orderedPlaces.map((p) => ({
        name: p.name,
        reason: p.reason,
        order: p.order,
        lat: p.lat,
        lon: p.lon,
        exploreTimeText: p.exploreTimeText,
      })),
    },
    recommendedTravelProviders,
    recommendedVehicleProviders,
  };
}