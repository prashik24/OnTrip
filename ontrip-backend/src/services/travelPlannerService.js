import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatDurationFromKm(distanceKm = 0, avgSpeedKmH = 45) {
  if (!distanceKm || !avgSpeedKmH) return "N/A";
  const totalHours = distanceKm / avgSpeedKmH;
  const hrs = Math.floor(totalHours);
  const mins = Math.round((totalHours - hrs) * 60);

  if (hrs <= 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function estimateDistanceKm(index) {
  const base = [4, 7, 11, 6, 9, 13, 5, 8];
  return base[index % base.length];
}

function estimatePlaceCostINR(placeName = "", primaryType = "", rating = 0) {
  const text = `${placeName} ${primaryType}`.toLowerCase();

  if (
    text.includes("fort") ||
    text.includes("museum") ||
    text.includes("palace") ||
    text.includes("monument")
  ) {
    return { entryFee: 150, foodAndLocalTravel: 350, total: 500 };
  }

  if (
    text.includes("temple") ||
    text.includes("ghat") ||
    text.includes("lake") ||
    text.includes("beach")
  ) {
    return { entryFee: 0, foodAndLocalTravel: 300, total: 300 };
  }

  if (
    text.includes("park") ||
    text.includes("garden") ||
    text.includes("zoo")
  ) {
    return { entryFee: 80, foodAndLocalTravel: 300, total: 380 };
  }

  if (rating >= 4.5) {
    return { entryFee: 100, foodAndLocalTravel: 400, total: 500 };
  }

  return { entryFee: 50, foodAndLocalTravel: 300, total: 350 };
}

function estimateCrowdLabel({ userRatingCount = 0, now = new Date() }) {
  const day = now.getDay();
  const hour = now.getHours();

  let score = 0;

  if (userRatingCount > 5000) score += 3;
  else if (userRatingCount > 1000) score += 2;
  else if (userRatingCount > 300) score += 1;

  if (day === 0 || day === 6) score += 2;
  if (hour >= 11 && hour <= 17) score += 1;

  if (score >= 5) return "High";
  if (score >= 3) return "Moderate";
  return "Low";
}

function weatherSuitabilityLabel(weatherMain = "") {
  const text = String(weatherMain).toLowerCase();
  if (text.includes("rain") || text.includes("storm")) {
    return "Carry umbrella or rain protection";
  }
  if (text.includes("snow")) {
    return "Cold weather caution";
  }
  if (text.includes("clear")) {
    return "Great for sightseeing";
  }
  if (text.includes("cloud")) {
    return "Good for outdoor visits";
  }
  return "Check local conditions";
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Request failed ${response.status}: ${text}`);
  }
  return response.json();
}

async function geocodeLocation(cityName) {
  if (!OPENWEATHER_API_KEY || !cityName) return null;

  const url = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
    cityName
  )}&limit=1&appid=${OPENWEATHER_API_KEY}`;

  const data = await fetchJson(url);
  const item = data?.[0];

  if (!item) return null;

  return {
    name: item.name || cityName,
    state: item.state || "",
    country: item.country || "",
    lat: item.lat,
    lon: item.lon,
  };
}

async function getWeatherForCoords(lat, lon) {
  if (!OPENWEATHER_API_KEY || lat == null || lon == null) return null;

  const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}` +
    `&exclude=minutely,alerts&appid=${OPENWEATHER_API_KEY}&units=metric`;

  const data = await fetchJson(url);

  return {
    current: {
      temp: data?.current?.temp ?? null,
      feelsLike: data?.current?.feels_like ?? null,
      humidity: data?.current?.humidity ?? null,
      windSpeed: data?.current?.wind_speed ?? null,
      main: data?.current?.weather?.[0]?.main || "",
      description: data?.current?.weather?.[0]?.description || "",
    },
    hourly: safeArray(data?.hourly).slice(0, 8).map((h) => ({
      dt: h.dt,
      temp: h.temp,
      weather: h?.weather?.[0]?.main || "",
      description: h?.weather?.[0]?.description || "",
    })),
    daily: safeArray(data?.daily).slice(0, 5).map((d) => ({
      dt: d.dt,
      min: d?.temp?.min,
      max: d?.temp?.max,
      weather: d?.weather?.[0]?.main || "",
      description: d?.weather?.[0]?.description || "",
    })),
  };
}

async function generateFamousPlacesWithAI(destination) {
  if (!process.env.GEMINI_API_KEY) {
    return [
      { name: `${destination} Main Landmark`, reason: "Popular tourist attraction" },
      { name: `${destination} City Market`, reason: "Known for local shopping and food" },
      { name: `${destination} Cultural Spot`, reason: "Represents local heritage" },
      { name: `${destination} Famous Temple`, reason: "Important spiritual place" },
      { name: `${destination} Sunset Point`, reason: "Good scenic view" },
    ];
  }

  const prompt = `
Return JSON only.
Give 6 famous tourist places for ${destination}.

Format:
{
  "places": [
    {
      "name": "",
      "reason": ""
    }
  ]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    return safeArray(parsed?.places).slice(0, 6);
  } catch {
    return [
      { name: `${destination} Main Landmark`, reason: "Popular tourist attraction" },
      { name: `${destination} City Market`, reason: "Known for local shopping and food" },
      { name: `${destination} Cultural Spot`, reason: "Represents local heritage" },
      { name: `${destination} Famous Temple`, reason: "Important spiritual place" },
      { name: `${destination} Sunset Point`, reason: "Good scenic view" },
    ];
  }
}

function enrichPlaces(famousPlaces = [], weatherMain = "") {
  return famousPlaces.map((place, index) => {
    const distanceKm = index === 0 ? 5 : estimateDistanceKm(index);
    const cost = estimatePlaceCostINR(place.name, "", 4.3);

    return {
      ...place,
      order: index + 1,
      fromPreviousDistanceKm: distanceKm,
      fromPreviousDurationText: formatDurationFromKm(distanceKm, 30),
      crowdLabel: estimateCrowdLabel({
        userRatingCount: 500 + index * 400,
      }),
      weatherSuitability: weatherSuitabilityLabel(weatherMain),
      estimatedCostINR: cost,
    };
  });
}

function buildReachOptions(startCity, destination) {
  return {
    byAir: {
      summary: startCity
        ? `Fastest option from ${startCity} to ${destination} is usually by flight, then local city transfer.`
        : `Flight is usually the fastest option for long-distance travel to ${destination}.`,
      estimatedTime: "Depends on sector and airport connectivity",
    },
    byRail: {
      summary: startCity
        ? `Rail can be a good budget-friendly option from ${startCity} if direct train connectivity is available.`
        : `Rail can be a practical option depending on route connectivity.`,
      estimatedTime: "Depends on train route",
    },
    byRoad: {
      summary: startCity
        ? `Road travel from ${startCity} to ${destination} depends on road distance and traffic.`
        : `Road travel depends on exact origin and highway route.`,
      estimatedTime: "Depends on road distance",
    },
  };
}

function buildFallbackPlan({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  weather,
  places,
}) {
  const totalDays = Math.max(1, Number(days || 1));

  const itinerary = Array.from({ length: totalDays }).map((_, index) => {
    const dayPlaces = places.slice(index * 2, index * 2 + 2);

    return {
      day: index + 1,
      title:
        index === 0
          ? `Arrival and introduction to ${destination}`
          : index === totalDays - 1
          ? `Relaxed finish and final sightseeing in ${destination}`
          : `Explore major attractions in ${destination}`,
      items:
        dayPlaces.length > 0
          ? dayPlaces.map(
              (p) =>
                `Visit ${p.name} • ${p.reason} • ${p.fromPreviousDurationText} from previous stop`
            )
          : ["Explore local area", "Try local food", "Relax or shopping"],
    };
  });

  return {
    title: `${destination} Smart Trip Plan`,
    summary: `${destination} trip for ${peopleCount} people over ${totalDays} days with ₹${budget} budget in ${travelStyle} style.`,
    whyRecommended:
      "This plan is arranged to reduce travel fatigue, cover famous places, and keep your visit practical and easy.",
    destinationWhyFamous: `${destination} is famous for its culture, food, sightseeing spots, and visitor experiences.`,
    bestTimeToVisit: weather?.current?.description
      ? `Current weather is ${weather.current.description}, so plan outdoor visits accordingly.`
      : `Check local seasonal weather before departure.`,
    reachOptions: buildReachOptions(startCity, destination),
    itinerary,
    budgetBreakdown: [
      { label: "Stay", amount: Math.round(budget * 0.35) },
      { label: "Food", amount: Math.round(budget * 0.2) },
      { label: "Local Transport", amount: Math.round(budget * 0.18) },
      { label: "Sightseeing", amount: Math.round(budget * 0.17) },
      { label: "Buffer", amount: Math.round(budget * 0.1) },
    ],
    transportAdvice:
      "Keep nearby places together on the same day, start early, and visit crowded places in the morning when possible.",
    tips: [
      "Start sightseeing early in the morning.",
      "Keep buffer budget for local transport and food.",
      "Check weather before full-day outdoor plans.",
    ],
  };
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

async function generateStructuredTripPlan({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  places,
  weather,
}) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `
You are an expert travel planner.
Return JSON only.

User input:
- destination: ${destination}
- startCity: ${startCity || "Not provided"}
- days: ${days}
- budgetINR: ${budget}
- peopleCount: ${peopleCount}
- travelStyle: ${travelStyle}

Famous places:
${JSON.stringify(places, null, 2)}

Weather:
${JSON.stringify(weather || {}, null, 2)}

Return this JSON shape:
{
  "title": "",
  "summary": "",
  "whyRecommended": "",
  "destinationWhyFamous": "",
  "bestTimeToVisit": "",
  "reachOptions": {
    "byAir": { "summary": "", "estimatedTime": "" },
    "byRail": { "summary": "", "estimatedTime": "" },
    "byRoad": { "summary": "", "estimatedTime": "" }
  },
  "itinerary": [
    {
      "day": 1,
      "title": "",
      "items": ["", ""]
    }
  ],
  "budgetBreakdown": [
    { "label": "Stay", "amount": 0 }
  ],
  "transportAdvice": "",
  "tips": ["", ""]
}

Rules:
- mention why destination is famous
- mention air, rail, road guidance
- use nearby places together
- keep plan practical and easy
- short and useful
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    return JSON.parse(response.text || "{}");
  } catch {
    return null;
  }
}

export async function answerTripChat({ message, plan, history = [] }) {
  if (!process.env.GEMINI_API_KEY) {
    return "AI chat is unavailable because GEMINI_API_KEY is missing.";
  }

  const prompt = `
You are a helpful travel assistant inside a trip planner.

Trip context:
${JSON.stringify(plan || {}, null, 2)}

Conversation history:
${JSON.stringify(history.slice(-8), null, 2)}

User message:
${message}

Instructions:
- answer only in context of this trip
- help with weather, budget, place order, timing, transport, packing
- keep answer short, clear, practical
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Sorry, I could not answer right now.";
}

export async function buildTripIntelligence({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  providersNormalized,
}) {
  const destinationGeo = await geocodeLocation(destination);
  const weather =
    destinationGeo?.lat != null && destinationGeo?.lon != null
      ? await getWeatherForCoords(destinationGeo.lat, destinationGeo.lon)
      : null;

  const rawPlaces = await generateFamousPlacesWithAI(destination);
  const famousPlaces = enrichPlaces(rawPlaces, weather?.current?.main || "");

  const aiPlan = await generateStructuredTripPlan({
    destination,
    startCity,
    days,
    budget,
    peopleCount,
    travelStyle,
    places: famousPlaces,
    weather,
  });

  const fallback = buildFallbackPlan({
    destination,
    startCity,
    days,
    budget,
    peopleCount,
    travelStyle,
    weather,
    places: famousPlaces,
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
    famousPlaces,
    recommendedTravelProviders,
    recommendedVehicleProviders,
  };
}