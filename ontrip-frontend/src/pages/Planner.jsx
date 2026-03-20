import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import CustomSelect from "../components/CustomSelect";
import "./Planner.css";

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function Planner() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const prefillPlace = params.get("place") || "";

  const [form, setForm] = useState({
    destination: prefillPlace,
    days: 4,
    budget: 12000,
    peopleCount: 2,
    travelStyle: "Balanced",
    startCity: "",
  });

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Ask me anything about this trip: best route, best day order, weather, budget, which place to visit first, or what to skip.",
    },
  ]);

  const travelStyleOptions = [
    { label: "Budget", value: "Budget" },
    { label: "Balanced", value: "Balanced" },
    { label: "Comfort", value: "Comfort" },
    { label: "Luxury", value: "Luxury" },
  ];

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function generatePlan() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (!form.destination.trim()) {
      setMsg("Please enter destination.");
      return;
    }

    try {
      setLoading(true);
      setMsg("");
      setResult(null);

      const data = await apiFetch("/api/ai-planner/generate", {
        method: "POST",
        body: JSON.stringify({
          destination: form.destination,
          days: Number(form.days),
          budget: Number(form.budget),
          peopleCount: Number(form.peopleCount),
          travelStyle: form.travelStyle,
          startCity: form.startCity,
        }),
      });

      setResult(data);
      setChatMessages([
        {
          role: "assistant",
          text: `Your ${form.destination} trip is ready. You can now ask: which place should I visit first, what should I pack, what if it rains, or how to reduce cost?`,
        },
      ]);
    } catch (err) {
      setMsg(err.message || "Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  }

  async function sendChat() {
    if (!result?.plan || !chatInput.trim() || chatLoading) return;

    const nextHistory = [...chatMessages, { role: "user", text: chatInput.trim() }];
    const userMessage = chatInput.trim();

    setChatMessages(nextHistory);
    setChatInput("");
    setChatLoading(true);

    try {
      const data = await apiFetch("/api/ai-planner/chat", {
        method: "POST",
        body: JSON.stringify({
          message: userMessage,
          plan: result,
          history: nextHistory,
        }),
      });

      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.reply || "Sorry, I could not answer that.",
        },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: err.message || "Chat failed.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const famousPlaces = result?.famousPlaces || [];
  const weather = result?.weather;
  const route = result?.startToDestinationRoad;

  const totalSightCost = useMemo(() => {
    return famousPlaces.reduce((sum, item) => sum + (item?.estimatedCostINR?.total || 0), 0);
  }, [famousPlaces]);

  if (loading) {
    return <LoadingSpinner text="Generating smart AI trip plan..." />;
  }

  return (
    <div className="container plannerPage">
      <div className="plannerHead">
        <div>
          <h1>AI Smart Trip Planner</h1>
          <p>
            Famous places, route order, travel time, weather insight, local cost,
            Google Maps route, and live AI trip chat — all in one planner.
          </p>
        </div>
      </div>

      {msg && <div className="plannerMessage">{msg}</div>}

      <div className="plannerGrid">
        <div className="plannerFormCard">
          <div className="plannerSectionTitle">Trip Inputs</div>

          <div className="plannerField">
            <label>Destination</label>
            <input
              className="plannerInput"
              value={form.destination}
              onChange={(e) => update("destination", e.target.value)}
              placeholder="e.g., Jaipur"
            />
          </div>

          <div className="plannerField">
            <label>Start City</label>
            <input
              className="plannerInput"
              value={form.startCity}
              onChange={(e) => update("startCity", e.target.value)}
              placeholder="e.g., Delhi"
            />
          </div>

          <div className="plannerRow">
            <div className="plannerField">
              <label>Days</label>
              <input
                className="plannerInput"
                type="number"
                min="1"
                value={form.days}
                onChange={(e) => update("days", e.target.value)}
              />
            </div>

            <div className="plannerField">
              <label>Budget (₹)</label>
              <input
                className="plannerInput"
                type="number"
                min="1000"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>

          <div className="plannerRow">
            <div className="plannerField">
              <label>People</label>
              <input
                className="plannerInput"
                type="number"
                min="1"
                value={form.peopleCount}
                onChange={(e) => update("peopleCount", e.target.value)}
              />
            </div>

            <div className="plannerField">
              <label>Travel Style</label>
              <CustomSelect
                value={form.travelStyle}
                onChange={(e) => update("travelStyle", e.target.value)}
                options={travelStyleOptions}
                placeholder="Select style"
              />
            </div>
          </div>

          <button className="plannerPrimaryBtn" onClick={generatePlan}>
            Generate Smart Plan
          </button>

          <div className="plannerMiniCard">
            <div className="plannerMiniTitle">What this planner now gives</div>
            <ul className="plannerList">
              <li>Why destination is famous</li>
              <li>How to reach by air, rail, road</li>
              <li>Travel time from start city</li>
              <li>Famous places with estimated cost</li>
              <li>Route order to save time</li>
              <li>Live AI question support</li>
            </ul>
          </div>
        </div>

        <div className="plannerResultCard">
          <div className="plannerSectionTitle">Generated Plan</div>

          {!result?.plan ? (
            <div className="plannerEmpty">
              Enter destination and start city to generate a detailed travel plan.
            </div>
          ) : (
            <>
              <div className="plannerPlanTitle">{result.plan.title}</div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Trip Summary</div>
                <div className="plannerMutedBox">{result.plan.summary}</div>
              </div>

              <div className="plannerTwoCol">
                <div className="plannerBlock">
                  <div className="plannerBlockTitle">Why this place is famous</div>
                  <div className="plannerMutedBox">
                    {result.plan.destinationWhyFamous}
                  </div>
                </div>

                <div className="plannerBlock">
                  <div className="plannerBlockTitle">Why this plan</div>
                  <div className="plannerMutedBox">
                    {result.plan.whyRecommended}
                  </div>
                </div>
              </div>

              <div className="plannerThreeCol">
                <div className="plannerBlock">
                  <div className="plannerBlockTitle">By Air</div>
                  <div className="plannerMutedBox">
                    {result.plan.reachOptions?.byAir?.summary}
                  </div>
                  <div className="plannerMetaStrong">
                    Time: {result.plan.reachOptions?.byAir?.estimatedTime || "N/A"}
                  </div>
                </div>

                <div className="plannerBlock">
                  <div className="plannerBlockTitle">By Rail</div>
                  <div className="plannerMutedBox">
                    {result.plan.reachOptions?.byRail?.summary}
                  </div>
                  <div className="plannerMetaStrong">
                    Time: {result.plan.reachOptions?.byRail?.estimatedTime || "N/A"}
                  </div>
                </div>

                <div className="plannerBlock">
                  <div className="plannerBlockTitle">By Road</div>
                  <div className="plannerMutedBox">
                    {result.plan.reachOptions?.byRoad?.summary}
                  </div>
                  <div className="plannerMetaStrong">
                    Time: {result.plan.reachOptions?.byRoad?.estimatedTime || "N/A"}
                  </div>
                </div>
              </div>

              {!!route && (
                <div className="plannerBlock">
                  <div className="plannerBlockTitle">Start City → Destination</div>
                  <div className="plannerInfoRow">
                    <span>Distance: {route.distanceText}</span>
                    <span>Road Travel Time: {route.durationText}</span>
                  </div>
                </div>
              )}

              {!!weather && (
                <div className="plannerBlock">
                  <div className="plannerBlockTitle">Smart Recommendations</div>
                  <div className="plannerInfoRow">
                    <span>Weather: {weather.current?.description || "N/A"}</span>
                    <span>Temp: {weather.current?.temp ?? "N/A"}°C</span>
                    <span>Humidity: {weather.current?.humidity ?? "N/A"}%</span>
                  </div>
                  <div className="plannerMutedBox">
                    {result.plan.bestTimeToVisit}
                  </div>
                </div>
              )}

              {!!result.mapEmbedUrl && (
                <div className="plannerBlock">
                  <div className="plannerBlockTitle">Google Maps Route</div>
                  <div className="plannerMapWrap">
                    <iframe
                      title="Trip route map"
                      src={result.mapEmbedUrl}
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    className="plannerLinkBtn"
                    href={result.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open full route in Google Maps
                  </a>
                </div>
              )}

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Day-wise itinerary</div>
                <div className="plannerDayList">
                  {(result.plan.itinerary || []).map((day) => (
                    <div className="plannerDayItem" key={day.day}>
                      <div className="plannerDayHeading">
                        Day {day.day}: {day.title}
                      </div>
                      <ul className="plannerList">
                        {(day.items || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Famous Places with Route Order</div>
                <div className="plannerPlacesGrid">
                  {famousPlaces.map((place, index) => (
                    <div className="plannerPlaceCard" key={`${place.name}-${index}`}>
                      <div className="plannerPlaceTop">
                        <div className="plannerPlaceIndex">{index + 1}</div>
                        <div>
                          <div className="plannerProviderTitle">{place.name}</div>
                          <div className="plannerProviderMeta">
                            {place.primaryType || "Tourist place"} • ⭐ {place.rating || 0}
                          </div>
                        </div>
                      </div>

                      <div className="plannerMutedBox">
                        Address: {place.address || "N/A"}
                      </div>

                      <div className="plannerPlaceFacts">
                        <span>From previous: {place.routeFromPrevious?.distanceText}</span>
                        <span>Time: {place.routeFromPrevious?.durationText}</span>
                      </div>

                      <div className="plannerPlaceFacts">
                        <span>Crowd: {place.crowdLabel}</span>
                        <span>Weather fit: {place.weatherSuitability}</span>
                      </div>

                      <div className="plannerCostBox">
                        <div>Entry: {money(place.estimatedCostINR?.entryFee)}</div>
                        <div>Food/Local: {money(place.estimatedCostINR?.foodAndLocalTravel)}</div>
                        <div>Total stop cost: {money(place.estimatedCostINR?.total)}</div>
                      </div>

                      <a
                        className="plannerLinkBtn"
                        href={place.googleMapsUri}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on Google Maps
                      </a>
                    </div>
                  ))}
                </div>

                <div className="plannerMutedBox">
                  Total estimated sightseeing spend for listed places:{" "}
                  <strong>{money(totalSightCost)}</strong>
                </div>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Budget breakdown</div>
                <ul className="plannerList">
                  {(result.plan.budgetBreakdown || []).map((item, idx) => (
                    <li key={idx}>
                      {item.label}: {money(item.amount)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Transport advice</div>
                <div className="plannerMutedBox">{result.plan.transportAdvice}</div>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Recommended Travel Planners</div>
                {result.recommendedTravelProviders?.length ? (
                  <div className="plannerProviderGrid">
                    {result.recommendedTravelProviders.map((item) => (
                      <div className="plannerProviderCard" key={item._id}>
                        <div className="plannerProviderTitle">{item.businessName}</div>
                        <div className="plannerProviderMeta">
                          {item.city} • ⭐ {item.ratingAverage || 0}
                        </div>
                        <div className="plannerProviderText">
                          {item.travelPlanner?.packageTitle ||
                            item.description ||
                            "Travel planner"}
                        </div>
                        <button
                          className="plannerProviderBtn"
                          onClick={() => navigate(`/providers/${item._id}`)}
                        >
                          View Planner
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="plannerMutedBox">No matching travel planners found.</div>
                )}
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Recommended Vehicle Services</div>
                {result.recommendedVehicleProviders?.length ? (
                  <div className="plannerProviderGrid">
                    {result.recommendedVehicleProviders.map((item) => (
                      <div className="plannerProviderCard" key={item._id}>
                        <div className="plannerProviderTitle">{item.businessName}</div>
                        <div className="plannerProviderMeta">
                          {item.city} • ⭐ {item.ratingAverage || 0}
                        </div>
                        <div className="plannerProviderText">
                          {(item.vehicles || [])
                            .slice(0, 2)
                            .map((vehicle) => `${vehicle.title || vehicle.vehicleType} - ${money(vehicle.price)}`)
                            .join(", ") || "Vehicle service"}
                        </div>
                        <button
                          className="plannerProviderBtn"
                          onClick={() => navigate(`/providers/${item._id}`)}
                        >
                          View Vehicles
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="plannerMutedBox">No matching vehicle providers found.</div>
                )}
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Extra Tips</div>
                <ul className="plannerList">
                  {(result.plan.tips || []).map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">💬 Chat with AI during trip</div>
                <div className="plannerChatBox">
                  <div className="plannerChatMessages">
                    {chatMessages.map((m, idx) => (
                      <div
                        key={idx}
                        className={`plannerChatBubble ${m.role === "user" ? "isUser" : "isBot"}`}
                      >
                        {m.text}
                      </div>
                    ))}
                  </div>

                  <div className="plannerChatComposer">
                    <input
                      className="plannerInput"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Ask about route, place order, weather, budget, what to carry..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter") sendChat();
                      }}
                    />
                    <button
                      className="plannerPrimaryBtn"
                      onClick={sendChat}
                      disabled={chatLoading}
                    >
                      {chatLoading ? "Sending..." : "Send"}
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}