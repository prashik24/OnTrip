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
  if (!ai) throw new Error("Gemini API key missing");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
  });

  return response.text || "";
}

async function generateWithGeminiJson(prompt) {
  if (!ai) throw new Error("Gemini API key missing");

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
    },
  });

  const text = response.text || "{}";
  const parsed = extractJson(text, null);

  if (!parsed) throw new Error("Gemini returned invalid JSON");
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
          messages: [{ role: "user", content: prompt }],
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

  if (!parsed) throw new Error("OpenRouter returned invalid JSON");
  return parsed;
}

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

    if (typeof tempMin === "number") grouped[date].min = Math.min(grouped[date].min, tempMin);
    if (typeof tempMax === "number") grouped[date].max = Math.max(grouped[date].max, tempMax);
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
    const legKm = prev ? haversineKm(prev.lat, prev.lon, place.lat, place.lon) : 0;

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
  const focusText = interestFocus.length ? interestFocus.join(", ") : "general sightseeing";

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
    {
      name: `${destination} Cultural Spot`,
      reason: "Good for local heritage and photos",
      category: focusText,
      exploreTimeText: "1 to 2 hours",
    },
  ];
}

async function generateFamousPlacesWithAI(destination, interestFocus = []) {
  const focusText = interestFocus.length ? interestFocus.join(", ") : "general sightseeing";
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

function estimatePlaceTiming(placeName = "", category = "", crowdLabel = "Moderate") {
  const text = `${placeName} ${category}`.toLowerCase();

  if (text.includes("temple") || text.includes("church")) {
    return {
      openingHours: "6:00 AM - 12:00 PM, 4:00 PM - 8:00 PM",
      closedDay: "Usually open daily",
      bestSlot: crowdLabel === "High" ? "6:30 AM - 8:30 AM" : "7:00 AM - 9:00 AM",
    };
  }

  if (text.includes("museum")) {
    return {
      openingHours: "10:00 AM - 5:00 PM",
      closedDay: "Often Monday",
      bestSlot: "10:30 AM - 12:30 PM",
    };
  }

  if (text.includes("fort") || text.includes("palace")) {
    return {
      openingHours: "9:00 AM - 6:00 PM",
      closedDay: "Usually open daily",
      bestSlot: crowdLabel === "High" ? "9:00 AM - 11:00 AM" : "11:00 AM - 1:00 PM",
    };
  }

  if (text.includes("park") || text.includes("garden") || text.includes("lake")) {
    return {
      openingHours: "6:00 AM - 7:00 PM",
      closedDay: "Usually open daily",
      bestSlot: "6:30 AM - 9:00 AM or 4:30 PM - 6:30 PM",
    };
  }

  return {
    openingHours: "8:00 AM - 6:00 PM",
    closedDay: "Usually open daily",
    bestSlot: crowdLabel === "High" ? "8:00 AM - 10:00 AM" : "10:00 AM - 12:00 PM",
  };
}

function estimateStartTimeByIndex(index) {
  if (index === 0) return "8:00 AM";
  if (index === 1) return "10:30 AM";
  if (index === 2) return "1:00 PM";
  if (index === 3) return "3:30 PM";
  return "5:30 PM";
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

function getBudgetTier(totalBudget, peopleCount) {
  const perPerson = totalBudget / Math.max(1, peopleCount || 1);
  if (perPerson <= 5000) return "budget";
  if (perPerson <= 15000) return "balanced";
  if (perPerson <= 35000) return "comfort";
  return "luxury";
}

function buildModePriceRange(totalBudget, peopleCount, type) {
  const total = Math.max(1000, Number(totalBudget || 0));
  const pax = Math.max(1, Number(peopleCount || 1));
  const perPersonTotal = total / pax;

  if (type === "airplane") {
    const low = Math.max(2500, Math.round(perPersonTotal * 0.28));
    const high = Math.max(low + 1500, Math.round(perPersonTotal * 0.5));
    return {
      perPersonMin: low,
      perPersonMax: high,
      totalMin: low * pax,
      totalMax: high * pax,
      perPerson: `₹${low.toLocaleString("en-IN")} - ₹${high.toLocaleString("en-IN")} per person`,
      total: `₹${(low * pax).toLocaleString("en-IN")} - ₹${(high * pax).toLocaleString("en-IN")} total`,
    };
  }

  if (type === "railway") {
    const low = Math.max(400, Math.round(perPersonTotal * 0.08));
    const high = Math.max(low + 400, Math.round(perPersonTotal * 0.18));
    return {
      perPersonMin: low,
      perPersonMax: high,
      totalMin: low * pax,
      totalMax: high * pax,
      perPerson: `₹${low.toLocaleString("en-IN")} - ₹${high.toLocaleString("en-IN")} per person`,
      total: `₹${(low * pax).toLocaleString("en-IN")} - ₹${(high * pax).toLocaleString("en-IN")} total`,
    };
  }

  const low = Math.max(800, Math.round(perPersonTotal * 0.12));
  const high = Math.max(low + 700, Math.round(perPersonTotal * 0.24));
  return {
    perPersonMin: low,
    perPersonMax: high,
    totalMin: low * pax,
    totalMax: high * pax,
    perPerson: `₹${low.toLocaleString("en-IN")} - ₹${high.toLocaleString("en-IN")} per person`,
    total: `₹${(low * pax).toLocaleString("en-IN")} - ₹${(high * pax).toLocaleString("en-IN")} total`,
  };
}

function estimateStartToDestination(startCity, destination, modeType) {
  const from = startCity || "Nearest city";

  if (modeType === "airplane") {
    return {
      optionName: `${from} to ${destination} flight`,
      estimatedTime: "1.5 hr - 4 hr",
      availabilityName: "Likely available via nearest airport",
    };
  }

  if (modeType === "railway") {
    return {
      optionName: `${from} to ${destination} train route`,
      estimatedTime: "5 hr - 14 hr",
      availabilityName: "Direct or connecting trains likely",
    };
  }

  return {
    optionName: `${from} to ${destination} by road / bus / cab`,
    estimatedTime: "4 hr - 12 hr",
    availabilityName: "Cab, self-drive, or bus usually available",
  };
}

function localTravelModesFallback(startCity, destination, budget, peopleCount) {
  const airplanePrice = buildModePriceRange(budget, peopleCount, "airplane");
  const railwayPrice = buildModePriceRange(budget, peopleCount, "railway");
  const roadPrice = buildModePriceRange(budget, peopleCount, "road");

  const airplaneBase = estimateStartToDestination(startCity, destination, "airplane");
  const railwayBase = estimateStartToDestination(startCity, destination, "railway");
  const roadBase = estimateStartToDestination(startCity, destination, "road");

  return {
    airplane: {
      title: "Airplane",
      ...airplaneBase,
      estimatedPrice: airplanePrice,
      note: "Estimated guidance, not a live flight schedule.",
    },
    railway: {
      title: "Railway",
      ...railwayBase,
      estimatedPrice: railwayPrice,
      note: "Estimated guidance, not a live railway timetable.",
    },
    road: {
      title: "Road",
      ...roadBase,
      estimatedPrice: roadPrice,
      note: "Estimated guidance, not a live road/bus timetable.",
    },
  };
}

function chooseBestTravelMode({ travelModes, budget, peopleCount, travelStyle }) {
  const budgetTier = getBudgetTier(budget, peopleCount);
  const style = String(travelStyle || "").toLowerCase();

  let key = "railway";
  let reason =
    "Railway is usually the best balance of budget, comfort, and practical travel time.";

  if (style === "luxury" || budgetTier === "luxury") {
    key = "airplane";
    reason = "Airplane is best because your budget supports faster and more comfortable travel.";
  } else if (style === "comfort" || budgetTier === "comfort") {
    key = "airplane";
    reason = "Airplane is a strong choice for comfort and time saving.";
  } else if (style === "budget" || budgetTier === "budget") {
    key = "railway";
    reason = "Railway is best because it usually saves more money while staying practical.";
  }

  const mode = travelModes?.[key] || null;

  return {
    key,
    title: mode?.title || "Railway",
    optionName: mode?.optionName || "",
    estimatedTime: mode?.estimatedTime || "",
    estimatedPrice: mode?.estimatedPrice || {
      perPerson: "",
      total: "",
      totalMin: 0,
      totalMax: 0,
    },
    reason,
  };
}

async function buildTravelModesWithAI(startCity, destination, budget, peopleCount, travelStyle) {
  const fallback = localTravelModesFallback(startCity, destination, budget, peopleCount);

  const prompt = `
Return JSON only.

Start city: ${startCity || "Not provided"}
Destination: ${destination}
Total budget INR: ${budget}
People count: ${peopleCount}
Travel style: ${travelStyle}

I need practical but non-live travel suggestions.
Do NOT pretend these are live schedules.
Give likely route names, approximate times, rough price ranges, and likely availability.

Format:
{
  "airplane": {
    "title": "Airplane",
    "optionName": "",
    "estimatedTime": "",
    "estimatedPrice": {
      "perPersonMin": 0,
      "perPersonMax": 0,
      "totalMin": 0,
      "totalMax": 0,
      "perPerson": "",
      "total": ""
    },
    "availabilityName": "",
    "note": ""
  },
  "railway": {
    "title": "Railway",
    "optionName": "",
    "estimatedTime": "",
    "estimatedPrice": {
      "perPersonMin": 0,
      "perPersonMax": 0,
      "totalMin": 0,
      "totalMax": 0,
      "perPerson": "",
      "total": ""
    },
    "availabilityName": "",
    "note": ""
  },
  "road": {
    "title": "Road",
    "optionName": "",
    "estimatedTime": "",
    "estimatedPrice": {
      "perPersonMin": 0,
      "perPersonMax": 0,
      "totalMin": 0,
      "totalMax": 0,
      "perPerson": "",
      "total": ""
    },
    "availabilityName": "",
    "note": ""
  }
}
`;

  const parsed = await generateJsonWithFallback(prompt, fallback);
  const travelModes = {
    ...fallback,
    ...(parsed || {}),
    airplane: {
      ...fallback.airplane,
      ...(parsed?.airplane || {}),
      estimatedPrice: {
        ...fallback.airplane.estimatedPrice,
        ...(parsed?.airplane?.estimatedPrice || {}),
      },
    },
    railway: {
      ...fallback.railway,
      ...(parsed?.railway || {}),
      estimatedPrice: {
        ...fallback.railway.estimatedPrice,
        ...(parsed?.railway?.estimatedPrice || {}),
      },
    },
    road: {
      ...fallback.road,
      ...(parsed?.road || {}),
      estimatedPrice: {
        ...fallback.road.estimatedPrice,
        ...(parsed?.road?.estimatedPrice || {}),
      },
    },
  };

  return {
    ...travelModes,
    bestOption: chooseBestTravelMode({
      travelModes,
      budget,
      peopleCount,
      travelStyle,
    }),
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

function buildDayWiseRoutePlan(days, destination, orderedPlaces, priority = "balanced") {
  const totalDays = Math.max(1, Number(days || 1));
  const totalPlaces = orderedPlaces.length;
  const baseCount = Math.floor(totalPlaces / totalDays);
  const extra = totalPlaces % totalDays;
  let cursor = 0;

  return Array.from({ length: totalDays }).map((_, index) => {
    const countForDay = baseCount + (index < extra ? 1 : 0);
    const dayPlaces = orderedPlaces.slice(cursor, cursor + countForDay);
    cursor += countForDay;

    let dayDistanceKm = 0;
    const placeSequence = dayPlaces.map((place, placeIndex) => {
      const crowdLabel = place.crowdLabel || estimateCrowdLabel(place.order - 1);
      const timing = estimatePlaceTiming(place.name, place.category, crowdLabel);
      const km = placeIndex === 0 ? 0 : num(place.fromPreviousDistanceKm, 0);
      dayDistanceKm += km;

      return {
        order: place.order,
        name: place.name,
        reason: place.reason,
        exploreTimeText: place.exploreTimeText,
        recommendedStartTime: estimateStartTimeByIndex(placeIndex),
        distanceFromPreviousText:
          placeIndex === 0 ? "Start point" : place.fromPreviousDistanceText,
        durationFromPreviousText:
          placeIndex === 0 ? "Start point" : place.fromPreviousDurationText,
        openingHours: timing.openingHours,
        closedDay: timing.closedDay,
        bestSlot: timing.bestSlot,
      };
    });

    return {
      day: index + 1,
      title:
        index === 0
          ? `Day ${index + 1} fast start in ${destination}`
          : index === totalDays - 1
          ? `Day ${index + 1} final efficient cover in ${destination}`
          : `Day ${index + 1} reduced-distance sightseeing route`,
      routeOrderText: placeSequence.map((item) => item.name).join(" → "),
      totalDistanceText: formatDistance(dayDistanceKm),
      totalTravelTimeText: formatDurationFromKm(dayDistanceKm),
      recommendedDayStart:
        index === 0 ? "Start by 8:00 AM" : index === totalDays - 1 ? "Start by 8:30 AM" : "Start by 8:00 AM",
      priorityMode: priority,
      optimizationNote:
        "Places are grouped in nearby sequence to reduce backtracking and help cover more places faster.",
      placeSequence,
      items: placeSequence.map((item) =>
        item.distanceFromPreviousText === "Start point"
          ? `${item.name} • start ${item.recommendedStartTime} • explore ${item.exploreTimeText}`
          : `${item.name} • start ${item.recommendedStartTime} • ${item.distanceFromPreviousText} • ${item.durationFromPreviousText}`
      ),
    };
  });
}

function buildLocalTransportAdvice(budgetTier, travelStyle) {
  if (travelStyle === "Luxury") {
    return {
      bestLocalMode: "Private cab / chauffeur-driven vehicle",
      note: "Best for comfort and direct hotel-to-place travel.",
    };
  }

  if (budgetTier === "budget") {
    return {
      bestLocalMode: "Auto / local bus / shared cab",
      note: "Best to reduce daily transport cost.",
    };
  }

  if (budgetTier === "balanced") {
    return {
      bestLocalMode: "Auto + cab mix",
      note: "Good balance of comfort and price.",
    };
  }

  return {
    bestLocalMode: "Rental cab / self-drive / app cab",
    note: "Good for flexibility and reduced fatigue.",
  };
}

function buildFoodRecommendations(destination, days) {
  return Array.from({ length: Math.max(1, days) }).map((_, index) => ({
    day: index + 1,
    breakfast: `${destination} local breakfast near first sightseeing area`,
    lunch: `${destination} mid-range restaurant near central route`,
    dinner: `${destination} famous local food street / dinner place`,
    mustTry: `${destination} famous local speciality`,
  }));
}

function buildHotelSuggestions(destination, budgetTier) {
  return {
    bestAreaToStay: `Central ${destination} / main sightseeing zone`,
    budgetStay: `${destination} budget hotel / guest house in central area`,
    balancedStay: `${destination} 3-star stay in main city area`,
    premiumStay: `${destination} premium hotel near key landmarks`,
    note:
      budgetTier === "budget"
        ? "Choose central budget stay to save local travel cost."
        : "Choose central area stay to reduce daily travel time.",
  };
}

function buildPackingSuggestions(weather, travelStyle) {
  const suggestions = [
    "ID proof and booking confirmations",
    "Phone charger and power bank",
    "Comfortable walking shoes",
    "Basic medicines",
    "Water bottle",
  ];

  const weatherText = String(weather?.current?.description || "").toLowerCase();

  if (weatherText.includes("rain")) suggestions.push("Umbrella or light raincoat");
  if (weatherText.includes("clear") || weatherText.includes("sun")) suggestions.push("Sunscreen, cap, sunglasses");
  if (weatherText.includes("cold") || weatherText.includes("fog")) suggestions.push("Light jacket or warm layer");

  if (travelStyle === "Luxury") suggestions.push("Extra outfit for premium dining / photos");
  return suggestions;
}

function buildBackupPlaces(orderedPlaces) {
  return orderedPlaces.slice(0, 4).map((place, index) => ({
    nearPlace: place.name,
    backupOptions: [
      `${place.name} nearby market / cafe stop`,
      `${place.name} secondary viewpoint / local attraction`,
    ],
    note:
      index <= 1
        ? "Use as backup if crowd is high or queue is long."
        : "Useful if your main stop gets delayed.",
  }));
}

function buildTripDifficulty(routeSummary, days, orderedPlaces) {
  const totalKm = num(String(routeSummary?.totalDistanceText || "").replace(/[^\d.]/g, ""), 0);
  const totalPlaces = orderedPlaces.length;
  const perDay = totalPlaces / Math.max(1, days);

  if (totalKm > 35 || perDay >= 4) {
    return {
      level: "Tiring",
      reason: "More travel movement and many stops in a day.",
    };
  }

  if (totalKm > 18 || perDay >= 3) {
    return {
      level: "Moderate",
      reason: "Balanced movement with manageable sightseeing load.",
    };
  }

  return {
    level: "Easy",
    reason: "Comfortable movement with lighter daily load.",
  };
}

function buildBudgetAnalysis({ budget, peopleCount, days, famousPlaces, travelModes }) {
  const totalBudget = Math.max(0, Number(budget || 0));
  const pax = Math.max(1, Number(peopleCount || 1));
  const totalDays = Math.max(1, Number(days || 1));

  const bestTravelCost = num(
    travelModes?.bestOption?.estimatedPrice?.totalMin,
    Math.round(totalBudget * 0.18)
  );
  const stayCost = Math.round(totalDays * 1800 * Math.max(1, Math.ceil(pax / 2)));
  const foodCost = Math.round(totalDays * pax * 450);
  const sightseeingCost = safeArray(famousPlaces).reduce(
    (sum, item) => sum + num(item?.estimatedCostINR?.entryFee, 0),
    0
  );
  const localTransportCost = safeArray(famousPlaces).reduce(
    (sum, item) => sum + num(item?.estimatedCostINR?.foodAndLocalTravel, 0),
    0
  );
  const otherCost = Math.round(totalBudget * 0.08);

  const estimatedTotal =
    bestTravelCost + stayCost + foodCost + sightseeingCost + localTransportCost + otherCost;

  const extraRequired = Math.max(0, estimatedTotal - totalBudget);
  const savingsLeft = Math.max(0, totalBudget - estimatedTotal);

  return {
    totalBudget,
    estimatedTotal,
    isSufficient: estimatedTotal <= totalBudget,
    extraRequired,
    savingsLeft,
    statusText:
      estimatedTotal <= totalBudget
        ? `Your given budget looks sufficient. Estimated savings left: ₹${savingsLeft.toLocaleString(
            "en-IN"
          )}.`
        : `Your given budget may be short. Extra amount required: ₹${extraRequired.toLocaleString(
            "en-IN"
          )}.`,
    breakdown: [
      { label: "Travel", amount: bestTravelCost },
      { label: "Stay", amount: stayCost },
      { label: "Food", amount: foodCost },
      { label: "Sightseeing", amount: sightseeingCost },
      { label: "Local Transport", amount: localTransportCost },
      { label: "Other", amount: otherCost },
    ],
  };
}

function buildDayWiseCosts(itinerary, budgetBreakdown) {
  const total = safeArray(budgetBreakdown).reduce((sum, item) => sum + num(item.amount, 0), 0);
  const days = Math.max(1, safeArray(itinerary).length);
  const perDay = Math.round(total / days);

  return safeArray(itinerary).map((day, index) => ({
    day: day.day || index + 1,
    amount: perDay,
    note:
      index === 0
        ? "Higher on arrival and travel movement."
        : index === days - 1
        ? "Keep buffer for return and shopping."
        : "Normal day spending estimate.",
  }));
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
  budgetAnalysis,
  routeSummary,
  priorityMode,
}) {
  const budgetTier = getBudgetTier(budget, peopleCount);
  const itinerary = buildDayWiseRoutePlan(days, destination, orderedPlaces, priorityMode);
  const localTransport = buildLocalTransportAdvice(budgetTier, travelStyle);

  return {
    title: `${destination} Smart Trip Plan`,
    summary: `${destination} trip for ${peopleCount} people over ${days} days with ₹${budget} budget in ${travelStyle} style.`,
    destinationWhyFamous: `${destination} is known for sightseeing, local culture, food, and memorable visitor experiences.`,
    bestTimeToVisit: weather?.current?.description
      ? `Current weather: ${weather.current.description}. Plan outdoor visits accordingly.`
      : `Keep weather flexibility during your sightseeing plan.`,
    travelModes,
    itinerary,
    budgetBreakdown: budgetAnalysis.breakdown,
    budgetStatus: {
      totalBudget: budgetAnalysis.totalBudget,
      estimatedTotal: budgetAnalysis.estimatedTotal,
      isSufficient: budgetAnalysis.isSufficient,
      extraRequired: budgetAnalysis.extraRequired,
      savingsLeft: budgetAnalysis.savingsLeft,
      statusText: budgetAnalysis.statusText,
    },
    dayWiseCosts: buildDayWiseCosts(itinerary, budgetAnalysis.breakdown),
    localTransport,
    hotels: buildHotelSuggestions(destination, budgetTier),
    foodPlan: buildFoodRecommendations(destination, days),
    packingSuggestions: buildPackingSuggestions(weather, travelStyle),
    backupPlaces: buildBackupPlaces(orderedPlaces),
    tripDifficulty: buildTripDifficulty(routeSummary, days, orderedPlaces),
    shareText: `${destination} trip for ${days} days. Route: ${routeSummary.routeOrder.join(" → ")}`,
    transportAdvice:
      "Follow the shown day-wise route order to reduce backtracking. Visit crowded places early and keep nearby stops on the same day.",
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
  budgetAnalysis,
  routeSummary,
  priorityMode,
}) {
  const fallback = null;

  const prompt = `
Return JSON only.

Destination: ${destination}
Days: ${days}
Budget INR: ${budget}
People count: ${peopleCount}
Travel style: ${travelStyle}
Priority mode: ${priorityMode}
User interest focus: ${interestFocus.join(", ") || "general"}

Travel modes:
${JSON.stringify(travelModes, null, 2)}

Weather:
${JSON.stringify(weather || {}, null, 2)}

Ordered places:
${JSON.stringify(orderedPlaces, null, 2)}

Budget analysis:
${JSON.stringify(budgetAnalysis, null, 2)}

Route summary:
${JSON.stringify(routeSummary, null, 2)}

Format:
{
  "title": "",
  "summary": "",
  "destinationWhyFamous": "",
  "bestTimeToVisit": "",
  "travelModes": {
    "airplane": {
      "title": "",
      "optionName": "",
      "estimatedTime": "",
      "estimatedPrice": {
        "perPersonMin": 0,
        "perPersonMax": 0,
        "totalMin": 0,
        "totalMax": 0,
        "perPerson": "",
        "total": ""
      },
      "availabilityName": "",
      "note": ""
    },
    "railway": {
      "title": "",
      "optionName": "",
      "estimatedTime": "",
      "estimatedPrice": {
        "perPersonMin": 0,
        "perPersonMax": 0,
        "totalMin": 0,
        "totalMax": 0,
        "perPerson": "",
        "total": ""
      },
      "availabilityName": "",
      "note": ""
    },
    "road": {
      "title": "",
      "optionName": "",
      "estimatedTime": "",
      "estimatedPrice": {
        "perPersonMin": 0,
        "perPersonMax": 0,
        "totalMin": 0,
        "totalMax": 0,
        "perPerson": "",
        "total": ""
      },
      "availabilityName": "",
      "note": ""
    },
    "bestOption": {
      "key": "",
      "title": "",
      "optionName": "",
      "estimatedTime": "",
      "estimatedPrice": {
        "perPersonMin": 0,
        "perPersonMax": 0,
        "totalMin": 0,
        "totalMax": 0,
        "perPerson": "",
        "total": ""
      },
      "reason": ""
    }
  },
  "itinerary": [
    {
      "day": 1,
      "title": "",
      "routeOrderText": "",
      "totalDistanceText": "",
      "totalTravelTimeText": "",
      "recommendedDayStart": "",
      "optimizationNote": "",
      "placeSequence": [
        {
          "order": 1,
          "name": "",
          "reason": "",
          "exploreTimeText": "",
          "recommendedStartTime": "",
          "distanceFromPreviousText": "",
          "durationFromPreviousText": "",
          "openingHours": "",
          "closedDay": "",
          "bestSlot": ""
        }
      ],
      "items": []
    }
  ],
  "budgetBreakdown": [
    { "label": "Travel", "amount": 0 },
    { "label": "Stay", "amount": 0 },
    { "label": "Food", "amount": 0 },
    { "label": "Sightseeing", "amount": 0 },
    { "label": "Local Transport", "amount": 0 },
    { "label": "Other", "amount": 0 }
  ],
  "budgetStatus": {
    "totalBudget": 0,
    "estimatedTotal": 0,
    "isSufficient": true,
    "extraRequired": 0,
    "savingsLeft": 0,
    "statusText": ""
  },
  "dayWiseCosts": [
    { "day": 1, "amount": 0, "note": "" }
  ],
  "localTransport": {
    "bestLocalMode": "",
    "note": ""
  },
  "hotels": {
    "bestAreaToStay": "",
    "budgetStay": "",
    "balancedStay": "",
    "premiumStay": "",
    "note": ""
  },
  "foodPlan": [
    { "day": 1, "breakfast": "", "lunch": "", "dinner": "", "mustTry": "" }
  ],
  "packingSuggestions": [],
  "backupPlaces": [
    { "nearPlace": "", "backupOptions": [], "note": "" }
  ],
  "tripDifficulty": {
    "level": "",
    "reason": ""
  },
  "shareText": "",
  "transportAdvice": "",
  "tips": []
}

Rules:
- focus strongly on user's selected interests
- create day-wise route sequence to cover places fast and reduce distance
- include opening hours, closed day, and best slot for places
- include recommended start time for each place
- include hotel, food, packing, backups, day-wise cost, local transport, trip difficulty
- keep wording clean and practical
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
  priorityMode = "balanced",
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

  const orderedPlaces = optimizePlaceOrder(startGeo, enrichedPlaces).map((p, index) => {
    const crowdLabel = estimateCrowdLabel(index);
    const timing = estimatePlaceTiming(p.name, p.category, crowdLabel);
    return {
      ...p,
      crowdLabel,
      openingHours: timing.openingHours,
      closedDay: timing.closedDay,
      bestSlot: timing.bestSlot,
    };
  });

  const travelModes = await buildTravelModesWithAI(
    startCity,
    destination,
    budget,
    peopleCount,
    travelStyle
  );

  const routeSummary = buildRouteSummary(startCity || destination, orderedPlaces);

  const budgetAnalysis = buildBudgetAnalysis({
    budget,
    peopleCount,
    days,
    famousPlaces: orderedPlaces,
    travelModes,
  });

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
    budgetAnalysis,
    routeSummary,
    priorityMode,
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
    budgetAnalysis,
    routeSummary,
    priorityMode,
  });

  const plan = {
    ...fallback,
    ...(aiPlan || {}),
    itinerary: safeArray(aiPlan?.itinerary).length ? aiPlan.itinerary : fallback.itinerary,
    budgetBreakdown: safeArray(aiPlan?.budgetBreakdown).length
      ? aiPlan.budgetBreakdown
      : fallback.budgetBreakdown,
    dayWiseCosts: safeArray(aiPlan?.dayWiseCosts).length
      ? aiPlan.dayWiseCosts
      : fallback.dayWiseCosts,
    packingSuggestions: safeArray(aiPlan?.packingSuggestions).length
      ? aiPlan.packingSuggestions
      : fallback.packingSuggestions,
    foodPlan: safeArray(aiPlan?.foodPlan).length ? aiPlan.foodPlan : fallback.foodPlan,
    backupPlaces: safeArray(aiPlan?.backupPlaces).length
      ? aiPlan.backupPlaces
      : fallback.backupPlaces,
    budgetStatus: {
      ...fallback.budgetStatus,
      ...(aiPlan?.budgetStatus || {}),
    },
    localTransport: {
      ...fallback.localTransport,
      ...(aiPlan?.localTransport || {}),
    },
    hotels: {
      ...fallback.hotels,
      ...(aiPlan?.hotels || {}),
    },
    tripDifficulty: {
      ...fallback.tripDifficulty,
      ...(aiPlan?.tripDifficulty || {}),
    },
    travelModes: {
      ...travelModes,
      ...(aiPlan?.travelModes || {}),
      airplane: {
        ...travelModes.airplane,
        ...(aiPlan?.travelModes?.airplane || {}),
        estimatedPrice: {
          ...travelModes.airplane.estimatedPrice,
          ...(aiPlan?.travelModes?.airplane?.estimatedPrice || {}),
        },
      },
      railway: {
        ...travelModes.railway,
        ...(aiPlan?.travelModes?.railway || {}),
        estimatedPrice: {
          ...travelModes.railway.estimatedPrice,
          ...(aiPlan?.travelModes?.railway?.estimatedPrice || {}),
        },
      },
      road: {
        ...travelModes.road,
        ...(aiPlan?.travelModes?.road || {}),
        estimatedPrice: {
          ...travelModes.road.estimatedPrice,
          ...(aiPlan?.travelModes?.road?.estimatedPrice || {}),
        },
      },
      bestOption: {
        ...travelModes.bestOption,
        ...(aiPlan?.travelModes?.bestOption || {}),
        estimatedPrice: {
          ...travelModes.bestOption.estimatedPrice,
          ...(aiPlan?.travelModes?.bestOption?.estimatedPrice || {}),
        },
      },
    },
  };

  const recommendedTravelProviders = providersNormalized
    .filter((p) => p.listingType === "travel_planner")
    .sort((a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination))
    .slice(0, 4);

  const recommendedVehicleProviders = providersNormalized
    .filter((p) => p.listingType === "vehicle")
    .sort((a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination))
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