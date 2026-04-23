import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./AiTravelChat.css";

function formatLabel(value = "") {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function money(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function buildProviderContext(providers = []) {
  return providers.map((provider) => ({
    id: provider._id,
    businessName: provider.businessName || "",
    listingType: provider.listingType || "",
    city: provider.city || "",
    state: provider.state || "",
    description: provider.description || "",
    ratingAverage: provider.ratingAverage || 0,
    ratingCount: provider.ratingCount || 0,
    serviceImage: provider.serviceImage?.url || "",
    vehicles: Array.isArray(provider.vehicles)
      ? provider.vehicles.map((vehicle) => ({
          id: vehicle._id,
          vehicleType: vehicle.vehicleType || "",
          title: vehicle.title || "",
          price: vehicle.price || 0,
          priceUnit: vehicle.priceUnit || "per_day",
          capacity: vehicle.capacity || 1,
          fuelType: vehicle.fuelType || "",
          withDriver: !!vehicle.withDriver,
          images: vehicle.images || [],
        }))
      : [],
    travelPlans:
      Array.isArray(provider.travelPlans) && provider.travelPlans.length > 0
        ? provider.travelPlans.map((trip) => ({
            id: trip._id,
            plannerMode: trip.plannerMode || "",
            packageTitle: trip.packageTitle || "",
            durationText: trip.durationText || "",
            days: trip.days || 1,
            priceFrom: trip.priceFrom || 0,
            pricePerPerson: trip.pricePerPerson || 0,
            placesCovered: trip.placesCovered || [],
            inclusions: trip.inclusions || [],
            exclusions: trip.exclusions || [],
            images: trip.images || [],
          }))
        : provider.travelPlanner &&
          (provider.travelPlanner.packageTitle ||
            provider.travelPlanner.durationText ||
            provider.travelPlanner.images?.length)
        ? [
            {
              id: provider.travelPlanner._id || "legacy-trip",
              plannerMode: provider.travelPlanner.plannerMode || "",
              packageTitle: provider.travelPlanner.packageTitle || "",
              durationText: provider.travelPlanner.durationText || "",
              days: provider.travelPlanner.days || 1,
              priceFrom: provider.travelPlanner.priceFrom || 0,
              pricePerPerson: provider.travelPlanner.pricePerPerson || 0,
              placesCovered: provider.travelPlanner.placesCovered || [],
              inclusions: provider.travelPlanner.inclusions || [],
              exclusions: provider.travelPlanner.exclusions || [],
              images: provider.travelPlanner.images || [],
            },
          ]
        : [],
  }));
}

function getProviderImage(provider) {
  if (provider?.listingType === "travel_planner") {
    if (provider?.travelPlans?.[0]?.images?.[0]?.url) {
      return provider.travelPlans[0].images[0].url;
    }
    if (provider?.travelPlanner?.images?.[0]?.url) {
      return provider.travelPlanner.images[0].url;
    }
  }

  if (provider?.listingType === "vehicle" && provider?.vehicles?.[0]?.images?.[0]?.url) {
    return provider.vehicles[0].images[0].url;
  }

  return provider?.serviceImage?.url || "";
}

function ProviderCard({ provider }) {
  const imageUrl = getProviderImage(provider);
  const isVehicle = provider.listingType === "vehicle";
  const primaryVehicle = provider.vehicles?.[0] || null;
  const primaryTrip =
    (provider.travelPlans && provider.travelPlans[0]) ||
    provider.travelPlanner ||
    null;

  return (
    <div className="aiTravelChatProviderCard">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={provider.businessName}
          className="aiTravelChatProviderImage"
        />
      ) : (
        <div className="aiTravelChatProviderImage aiTravelChatProviderImagePlaceholder">
          No Image
        </div>
      )}

      <div className="aiTravelChatProviderBody">
        <div className="aiTravelChatProviderTop">
          <div>
            <h3>{provider.businessName}</h3>
            <p>
              {provider.city}
              {provider.state ? `, ${provider.state}` : ""} •{" "}
              {isVehicle ? "Vehicle Service" : "Travel Planner"}
            </p>
          </div>

          <div className="aiTravelChatBadge">
            ⭐ {Number(provider.ratingAverage || 0).toFixed(1)} (
            {provider.ratingCount || 0})
          </div>
        </div>

        {provider.description ? (
          <div className="aiTravelChatProviderDesc">{provider.description}</div>
        ) : null}

        {isVehicle ? (
          <div className="aiTravelChatMiniGrid">
            <div className="aiTravelChatMiniInfo">
              <span>Vehicle</span>
              <strong>
                {primaryVehicle?.title || formatLabel(primaryVehicle?.vehicleType || "-")}
              </strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Price</span>
              <strong>
                {money(primaryVehicle?.price || 0)} /{" "}
                {formatLabel(primaryVehicle?.priceUnit || "per_day")}
              </strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Capacity</span>
              <strong>{primaryVehicle?.capacity || 1}</strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Driver</span>
              <strong>{primaryVehicle?.withDriver ? "Available" : "No"}</strong>
            </div>
          </div>
        ) : (
          <div className="aiTravelChatMiniGrid">
            <div className="aiTravelChatMiniInfo">
              <span>Package</span>
              <strong>{primaryTrip?.packageTitle || "Travel Package"}</strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Duration</span>
              <strong>{primaryTrip?.durationText || `${primaryTrip?.days || 1} Days`}</strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Price From</span>
              <strong>{money(primaryTrip?.priceFrom || primaryTrip?.pricePerPerson || 0)}</strong>
            </div>
            <div className="aiTravelChatMiniInfo">
              <span>Mode</span>
              <strong>{formatLabel(primaryTrip?.plannerMode || "-")}</strong>
            </div>
          </div>
        )}

        <a className="bookingCheckoutBtn aiTravelChatLinkBtn" href={`/providers/${provider._id}`}>
          View Provider
        </a>
      </div>
    </div>
  );
}

export default function AiTravelChat() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text:
        "Hi, ask me about vehicle services, travel planners, package prices, places covered, city-wise options, budget suggestions, or which provider fits your trip better.",
    },
  ]);

  const bottomRef = useRef(null);

  useEffect(() => {
    let ignore = false;

    async function loadProviders() {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch("/api/providers");
        if (ignore) return;

        setProviders(Array.isArray(data?.providers) ? data.providers : []);
      } catch (err) {
        if (!ignore) {
          setMsg(err.message || "Failed to load providers.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadProviders();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const providerContext = useMemo(() => buildProviderContext(providers), [providers]);

  const stats = useMemo(() => {
    const vehicleProviders = providers.filter((item) => item.listingType === "vehicle");
    const travelProviders = providers.filter(
      (item) => item.listingType === "travel_planner"
    );

    const totalVehicles = vehicleProviders.reduce(
      (sum, item) => sum + (item.vehicles?.length || 0),
      0
    );

    const totalTrips = travelProviders.reduce((sum, item) => {
      const plans =
        Array.isArray(item.travelPlans) && item.travelPlans.length > 0
          ? item.travelPlans.length
          : item.travelPlanner &&
            (item.travelPlanner.packageTitle ||
              item.travelPlanner.durationText ||
              item.travelPlanner.images?.length)
          ? 1
          : 0;

      return sum + plans;
    }, 0);

    return {
      totalProviders: providers.length,
      vehicleProviders: vehicleProviders.length,
      travelProviders: travelProviders.length,
      totalVehicles,
      totalTrips,
    };
  }, [providers]);

  async function handleAsk(e) {
    e.preventDefault();

    const cleanMessage = String(message || "").trim();
    if (!cleanMessage) return;

    if (!isLoggedIn()) {
      setMsg("Please login first to use AI travel chat.");
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: cleanMessage,
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setMessage("");
    setSending(true);
    setMsg("");

    try {
      const data = await apiFetch("/api/ai-planner/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
          plan: {
            pageTitle: "OnTrip AI Travel Chat",
            description:
              "Answer using provider listings, vehicle details, travel planner packages, prices, durations, capacities, cities, and general travel guidance.",
            catalogStats: stats,
            providers: providerContext,
            generalInformation: {
              notes: [
                "Vehicle providers may have multiple vehicles with different price units.",
                "Travel planners may have multiple packages with places covered, inclusions, exclusions, price from, and price per person.",
                "Prefer direct, practical, short answers.",
              ],
            },
          },
          history: nextMessages.slice(-8).map((item) => ({
            role: item.role,
            content: item.text,
          })),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text:
            data?.reply ||
            "I could not generate a reply right now. Please try again.",
        },
      ]);
    } catch (err) {
      setMsg(err.message || "Failed to get AI reply.");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading AI travel chat..." />;
  }

  return (
    <div className="bookingCheckoutPage aiTravelChatPage container">
      <div className="bookingCheckoutHead">
        <h1>AI Travel Chat</h1>
        <p>
          Chat with AI about provider listings, vehicle prices, travel planner
          packages, cities, places covered, inclusions, exclusions, capacity,
          and general trip guidance.
        </p>
      </div>

      {msg ? <div className="bookingCheckoutMessage">{msg}</div> : null}

      <div className="aiTravelChatTopStats bookingCheckoutGrid">
        <div className="bookingCheckoutCard">
          <label>Total Providers</label>
          <div className="aiTravelChatStatValue">{stats.totalProviders}</div>
        </div>

        <div className="bookingCheckoutCard">
          <label>Vehicle Services</label>
          <div className="aiTravelChatStatValue">{stats.vehicleProviders}</div>
        </div>

        <div className="bookingCheckoutCard">
          <label>Travel Planners</label>
          <div className="aiTravelChatStatValue">{stats.travelProviders}</div>
        </div>

        <div className="bookingCheckoutCard">
          <label>Total Vehicles / Trips</label>
          <div className="aiTravelChatStatValue">
            {stats.totalVehicles} / {stats.totalTrips}
          </div>
        </div>
      </div>

      <div className="aiTravelChatLayout">
        <section className="bookingCheckoutCard aiTravelChatChatCard">
          <div className="aiTravelChatChatHead">
            <div>
              <h2>Ask AI</h2>
              <p>
                Example: best vehicle in Goa, cheapest trip package, compare two
                providers, or which plan is good for family travel.
              </p>
            </div>
          </div>

          <div className="aiTravelChatMessages">
            {messages.map((item) => (
              <div
                key={item.id}
                className={`aiTravelChatBubble ${
                  item.role === "user"
                    ? "aiTravelChatBubbleUser"
                    : "aiTravelChatBubbleAssistant"
                }`}
              >
                <div className="aiTravelChatBubbleRole">
                  {item.role === "user" ? "You" : "OnTrip AI"}
                </div>
                <div className="aiTravelChatBubbleText">{item.text}</div>
              </div>
            ))}

            {sending ? (
              <div className="aiTravelChatBubble aiTravelChatBubbleAssistant">
                <div className="aiTravelChatBubbleRole">OnTrip AI</div>
                <div className="aiTravelChatBubbleText">Thinking...</div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>

          <form className="aiTravelChatForm" onSubmit={handleAsk}>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about prices, package details, provider comparison, city-wise options, budget, routes..."
            />
            <button className="bookingCheckoutBtn" type="submit" disabled={sending}>
              {sending ? "Sending..." : "Send to AI"}
            </button>
          </form>
        </section>

        <aside className="aiTravelChatSidebar">
          <div className="bookingCheckoutCard">
            <div className="aiTravelChatSideHead">
              <h2>Available Providers</h2>
              <p>
                Live page context for AI includes provider details, vehicles,
                prices, trips, and city information.
              </p>
            </div>

            <div className="aiTravelChatProviderList">
              {providers.length ? (
                providers.map((provider) => (
                  <ProviderCard key={provider._id} provider={provider} />
                ))
              ) : (
                <div className="bookingCheckoutMessage">
                  No providers available right now.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}