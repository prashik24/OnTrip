import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value = "") {
  return String(value || "").trim();
}

function num(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function formatDuration(seconds = 0) {
  const totalMins = Math.round(seconds / 60);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs <= 0) return `${mins} min`;
  if (mins === 0) return `${hrs} hr`;
  return `${hrs} hr ${mins} min`;
}

function formatDistance(meters = 0) {
  const km = meters / 1000;
  if (km < 1) return `${Math.round(meters)} m`;
  return `${km.toFixed(km >= 10 ? 0 : 1)} km`;
}

function googleMapsPlaceUrl(query) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function googleMapsDirectionsUrl(origin, destination, waypoints = []) {
  const parts = [
    `https://www.google.com/maps/dir/?api=1`,
    `origin=${encodeURIComponent(origin)}`,
    `destination=${encodeURIComponent(destination)}`,
    `travelmode=driving`,
  ];
  if (waypoints.length) {
    parts.push(`waypoints=${encodeURIComponent(waypoints.join("|"))}`);
  }
  return parts.join("&");
}

function estimatePlaceCostINR(placeName = "", primaryType = "", rating = 0) {
  const text = `${placeName} ${primaryType}`.toLowerCase();

  if (text.includes("fort") || text.includes("museum") || text.includes("palace") || text.includes("monument")) {
    return { entryFee: 150, foodAndLocalTravel: 350, total: 500 };
  }
  if (text.includes("temple") || text.includes("ghat") || text.includes("lake") || text.includes("beach")) {
    return { entryFee: 0, foodAndLocalTravel: 300, total: 300 };
  }
  if (text.includes("park") || text.includes("garden") || text.includes("zoo")) {
    return { entryFee: 80, foodAndLocalTravel: 300, total: 380 };
  }

  if (rating >= 4.5) {
    return { entryFee: 100, foodAndLocalTravel: 400, total: 500 };
  }

  return { entryFee: 50, foodAndLocalTravel: 300, total: 350 };
}

function estimateCrowdLabel({ userRatingCount = 0, now = new Date() }) {
  const day = now.getDay(); // 0 Sunday
  const hour = now.getHours();

  let score = 0;
  if (userRatingCount > 5000) score += 3;
  else if (userRatingCount > 1000) score += 2;
  else if (userRatingCount > 300) score += 1;

  if (day === 0 || day === 6) score += 2; // weekend
  if (hour >= 11 && hour <= 17) score += 1; // daytime rush

  if (score >= 5) return "High";
  if (score >= 3) return "Moderate";
  return "Low";
}

function weatherSuitabilityLabel(weatherMain = "") {
  const text = String(weatherMain).toLowerCase();
  if (text.includes("rain") || text.includes("storm")) return "Carry rain protection";
  if (text.includes("snow")) return "Cold weather caution";
  if (text.includes("clear")) return "Great for sightseeing";
  if (text.includes("cloud")) return "Good for outdoor visits";
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

export async function searchPlaceByText(text) {
  if (!GOOGLE_MAPS_API_KEY) return null;

  const body = {
    textQuery: text,
    languageCode: "en",
    maxResultCount: 1,
  };

  const data = await fetchJson(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName",
      },
      body: JSON.stringify(body),
    }
  );

  const place = data?.places?.[0];
  if (!place) return null;

  return {
    placeId: place.id,
    name: place.displayName?.text || text,
    address: place.formattedAddress || text,
    lat: place.location?.latitude || null,
    lng: place.location?.longitude || null,
    googleMapsUri: place.googleMapsUri || googleMapsPlaceUrl(text),
    rating: num(place.rating),
    userRatingCount: num(place.userRatingCount),
    primaryType: place.primaryTypeDisplayName?.text || "",
  };
}

export async function searchTopPlaces(destination) {
  if (!GOOGLE_MAPS_API_KEY) return [];

  const body = {
    textQuery: `top tourist attractions in ${destination}`,
    languageCode: "en",
    maxResultCount: 8,
  };

  const data = await fetchJson(
    "https://places.googleapis.com/v1/places:searchText",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.location,places.googleMapsUri,places.rating,places.userRatingCount,places.primaryTypeDisplayName",
      },
      body: JSON.stringify(body),
    }
  );

  return safeArray(data?.places).map((place) => {
    const name = place.displayName?.text || "Place";
    const primaryType = place.primaryTypeDisplayName?.text || "";
    const cost = estimatePlaceCostINR(name, primaryType, num(place.rating));

    return {
      placeId: place.id,
      name,
      address: place.formattedAddress || "",
      lat: place.location?.latitude || null,
      lng: place.location?.longitude || null,
      googleMapsUri: place.googleMapsUri || googleMapsPlaceUrl(name),
      rating: num(place.rating),
      userRatingCount: num(place.userRatingCount),
      primaryType,
      estimatedCostINR: cost,
    };
  });
}

export async function getWeatherForCoords(lat, lng) {
  if (!OPENWEATHER_API_KEY || lat == null || lng == null) return null;

  const url =
    `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lng}` +
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

export async function computeRoadRoute(origin, destination, opts = {}) {
  if (!GOOGLE_MAPS_API_KEY || !origin || !destination) return null;

  const body = {
    origin: {
      address: origin,
    },
    destination: {
      address: destination,
    },
    travelMode: opts.travelMode || "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    computeAlternativeRoutes: false,
    languageCode: "en-US",
    units: "METRIC",
  };

  const data = await fetchJson(
    "https://routes.googleapis.com/directions/v2:computeRoutes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask":
          "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.localizedValues,routes.legs",
      },
      body: JSON.stringify(body),
    }
  );

  const route = data?.routes?.[0];
  if (!route) return null;

  const durationSeconds = parseDurationToSeconds(route.duration);

  return {
    distanceMeters: route.distanceMeters || 0,
    durationSeconds,
    distanceText: formatDistance(route.distanceMeters || 0),
    durationText: formatDuration(durationSeconds),
    polyline: route?.polyline?.encodedPolyline || "",
  };
}

export async function computeOptimizedCityRoute(originText, places) {
  if (!GOOGLE_MAPS_API_KEY || !originText || !places?.length) {
    return { optimizedPlaces: places || [], routeSummary: null };
  }

  const limited = places.slice(0, 6);

  const body = {
    origin: { address: originText },
    destination: { address: originText },
    intermediates: limited.map((p) => ({
      address: p.address || p.name,
    })),
    travelMode: "DRIVE",
    routingPreference: "TRAFFIC_AWARE",
    optimizeWaypointOrder: true,
    languageCode: "en-US",
    units: "METRIC",
  };

  try {
    const data = await fetchJson(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.optimizedIntermediateWaypointIndex,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify(body),
      }
    );

    const route = data?.routes?.[0];
    if (!route) {
      return { optimizedPlaces: limited, routeSummary: null };
    }

    const order = safeArray(route.optimizedIntermediateWaypointIndex);
    const optimizedPlaces =
      order.length === limited.length ? order.map((i) => limited[i]) : limited;

    const durationSeconds = parseDurationToSeconds(route.duration);

    return {
      optimizedPlaces,
      routeSummary: {
        distanceMeters: route.distanceMeters || 0,
        durationSeconds,
        distanceText: formatDistance(route.distanceMeters || 0),
        durationText: formatDuration(durationSeconds),
        polyline: route?.polyline?.encodedPolyline || "",
      },
    };
  } catch {
    return { optimizedPlaces: limited, routeSummary: null };
  }
}

function parseDurationToSeconds(durationString = "0s") {
  const match = String(durationString).match(/^(\d+)(?:\.(\d+))?s$/);
  if (!match) return 0;
  return Number(match[1] || 0);
}

export async function enrichPlacesWithLegs(originText, places) {
  const enriched = [];
  let previous = originText;

  for (const place of places) {
    const leg = await computeRoadRoute(previous, place.address || place.name);
    enriched.push({
      ...place,
      routeFromPrevious: leg || {
        distanceText: "N/A",
        durationText: "N/A",
        distanceMeters: 0,
        durationSeconds: 0,
        polyline: "",
      },
      mapQuery: place.address || place.name,
      crowdLabel: estimateCrowdLabel({
        userRatingCount: place.userRatingCount,
      }),
    });
    previous = place.address || place.name;
  }

  return enriched;
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

function buildFallbackPlan({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  weather,
  optimizedPlaces,
  startToDestinationRoad,
}) {
  const dayCount = Math.max(1, num(days, 3));
  const itinerary = Array.from({ length: dayCount }).map((_, index) => {
    const slice = optimizedPlaces.slice(index * 2, index * 2 + 2);

    return {
      day: index + 1,
      title:
        index === 0
          ? `Arrival and introduction to ${destination}`
          : index === dayCount - 1
          ? `Relaxed final experiences in ${destination}`
          : `Major sightseeing in ${destination}`,
      items:
        slice.length > 0
          ? slice.map((p) => `Visit ${p.name} • ${p.routeFromPrevious?.durationText || "N/A"} from previous stop`)
          : ["Local sightseeing", "Food break", "Leisure time"],
    };
  });

  return {
    title: `${destination} Smart Trip Plan`,
    summary: `${destination} trip for ${peopleCount} people over ${dayCount} days with a ₹${budget} budget and ${travelStyle} style.`,
    whyRecommended:
      "This plan balances travel time, popular attractions, route flow, weather suitability, and local provider availability.",
    destinationWhyFamous: `${destination} is known for its important landmarks, local culture, food, and visitor-friendly sightseeing circuits.`,
    bestTimeToVisit:
      weather?.current?.description
        ? `Current condition: ${weather.current.description}.`
        : "Check season and local weather before departure.",
    reachOptions: {
      byAir: {
        summary: startCity
          ? `Fastest option from ${startCity} to ${destination} is usually by flight, then local transfer to hotel/city center.`
          : `Flights are usually the fastest option for long-distance travel to ${destination}.`,
        estimatedTime: "Varies by sector",
      },
      byRail: {
        summary: startCity
          ? `Rail is often a practical budget-friendly option from ${startCity} depending on direct connectivity.`
          : `Rail can be a good option depending on city connectivity.`,
        estimatedTime: "Varies by route",
      },
      byRoad: {
        summary: startToDestinationRoad
          ? `${startToDestinationRoad.distanceText} by road`
          : "Road travel depends on exact origin and route conditions.",
        estimatedTime: startToDestinationRoad?.durationText || "N/A",
      },
    },
    itinerary,
    budgetBreakdown: [
      { label: "Stay", amount: Math.round(budget * 0.35) },
      { label: "Food", amount: Math.round(budget * 0.2) },
      { label: "Local Transport", amount: Math.round(budget * 0.18) },
      { label: "Sightseeing", amount: Math.round(budget * 0.17) },
      { label: "Buffer", amount: Math.round(budget * 0.1) },
    ],
    transportAdvice:
      "Keep nearby attractions in the same block/day, start early for popular places, and reserve evening slots for markets or food streets.",
    tips: [
      "Start early to avoid crowd at top-rated places.",
      "Keep 10–15% budget buffer.",
      "Prefer grouped nearby attractions on the same day.",
    ],
  };
}

export async function generateStructuredTripPlan({
  destination,
  startCity,
  days,
  budget,
  peopleCount,
  travelStyle,
  topPlaces,
  weather,
  startToDestinationRoad,
}) {
  if (!process.env.GEMINI_API_KEY) return null;

  const prompt = `
You are an expert India travel planner.
Return JSON only.

Create a practical trip plan.

User input:
- destination: ${destination}
- startCity: ${startCity || "Not provided"}
- days: ${days}
- budgetINR: ${budget}
- peopleCount: ${peopleCount}
- travelStyle: ${travelStyle}

Known places:
${JSON.stringify(topPlaces, null, 2)}

Road route from start city to destination:
${JSON.stringify(startToDestinationRoad || {}, null, 2)}

Weather:
${JSON.stringify(weather || {}, null, 2)}

Required JSON shape:
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
- mention practical air, rail, road advice
- itinerary must minimize travel fatigue
- use nearby places together on the same day
- stay within budget
- keep answer short and useful
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    return JSON.parse(text);
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
Only answer about this trip and nearby travel decisions.

Trip context:
${JSON.stringify(plan || {}, null, 2)}

Conversation history:
${JSON.stringify(history.slice(-8), null, 2)}

User message:
${message}

Instructions:
- answer in simple language
- help with route order, costs, weather, packing, timing, and which place to visit first
- if user asks outside this trip, redirect back to trip context
- keep it short, practical, and clear
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
  });

  return response.text || "Sorry, I could not answer that right now.";
}

export function buildMapsEmbedDirections({ origin, destination, waypoints = [] }) {
  const key = process.env.GOOGLE_MAPS_API_KEY || "";
  if (!key || !origin || !destination) return "";

  let url =
    `https://www.google.com/maps/embed/v1/directions?key=${encodeURIComponent(key)}` +
    `&origin=${encodeURIComponent(origin)}` +
    `&destination=${encodeURIComponent(destination)}` +
    `&mode=driving`;

  if (waypoints.length) {
    url += `&waypoints=${encodeURIComponent(waypoints.join("|"))}`;
  }

  return url;
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
  const destinationPlace = await searchPlaceByText(destination);
  const startPlace = startCity ? await searchPlaceByText(startCity) : null;
  const rawTopPlaces = await searchTopPlaces(destination);
  const weather =
    destinationPlace?.lat != null && destinationPlace?.lng != null
      ? await getWeatherForCoords(destinationPlace.lat, destinationPlace.lng)
      : null;

  const routeToDestination =
    startCity && destination
      ? await computeRoadRoute(startCity, destination)
      : null;

  const optimized = await computeOptimizedCityRoute(destination, rawTopPlaces);
  const optimizedPlaces = await enrichPlacesWithLegs(
    destination,
    optimized.optimizedPlaces
  );

  const aiPlan = await generateStructuredTripPlan({
    destination,
    startCity,
    days,
    budget,
    peopleCount,
    travelStyle,
    topPlaces: optimizedPlaces,
    weather,
    startToDestinationRoad: routeToDestination,
  });

  const fallback = buildFallbackPlan({
    destination,
    startCity,
    days,
    budget,
    peopleCount,
    travelStyle,
    weather,
    optimizedPlaces,
    startToDestinationRoad: routeToDestination,
  });

  const plan = {
    ...fallback,
    ...(aiPlan || {}),
  };

  const travelProviders = providersNormalized
    .filter((p) => p.listingType === "travel_planner")
    .sort((a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination))
    .slice(0, 4);

  const vehicleProviders = providersNormalized
    .filter((p) => p.listingType === "vehicle")
    .sort((a, b) => providerMatchScore(b, destination) - providerMatchScore(a, destination))
    .slice(0, 4);

  const startLabel = startCity || destination;
  const mapEmbedUrl = buildMapsEmbedDirections({
    origin: startLabel,
    destination,
    waypoints: optimizedPlaces.slice(0, 4).map((p) => p.address || p.name),
  });

  const directionsUrl = googleMapsDirectionsUrl(
    startLabel,
    destination,
    optimizedPlaces.slice(0, 4).map((p) => p.address || p.name)
  );

  const enrichedPlaces = optimizedPlaces.map((p) => ({
    ...p,
    weatherSuitability: weatherSuitabilityLabel(weather?.current?.main || ""),
  }));

  return {
    plan,
    destinationMeta: destinationPlace,
    startMeta: startPlace,
    weather,
    startToDestinationRoad: routeToDestination,
    cityCircuitRoute: optimized.routeSummary,
    famousPlaces: enrichedPlaces,
    mapEmbedUrl,
    directionsUrl,
    recommendedTravelProviders: travelProviders,
    recommendedVehicleProviders: vehicleProviders,
  };
}