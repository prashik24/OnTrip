import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Planner.css";

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

function PlannerMap({ mapData }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapRef.current).setView(mapData.center, 12);
    mapInstanceRef.current = map;

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap",
    }).addTo(map);

    mapData.markers.forEach((item) => {
      L.circleMarker([item.lat, item.lon], {
        radius: 8,
      })
        .addTo(map)
        .bindPopup(
          `<b>${item.order}. ${item.name}</b><br/>${item.exploreTimeText}<br/>${item.reason}`
        );
    });

    if (mapData.routeCoords.length > 1) {
      const line = L.polyline(mapData.routeCoords, {
        weight: 5,
      }).addTo(map);

      map.fitBounds(line.getBounds(), { padding: [20, 20] });
    }

    if (mapData.routeCoords.length === 1) {
      map.setView(mapData.routeCoords[0], 13);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [mapData]);

  return <div ref={mapRef} className="plannerLeafletMap" />;
}

export default function PlannerResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const formFromState = location.state?.form;

  const [form] = useState(() => {
    if (formFromState) return formFromState;

    try {
      const raw = sessionStorage.getItem("planner_form_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: "Ask about route order, weather, best visiting time, budget, or what to pack.",
    },
  ]);

  useEffect(() => {
    async function loadPlan() {
      if (!form?.destination) {
        setMsg("Trip input not found. Please generate again.");
        setLoading(false);
        return;
      }

      try {
        const data = await apiFetch("/api/ai-planner/generate", {
          method: "POST",
          body: JSON.stringify({
            destination: form.destination,
            days: Number(form.days),
            budget: Number(form.budget),
            peopleCount: Number(form.peopleCount),
            travelStyle: form.travelStyle,
            startCity: form.startCity,
            interestFocus: form.interestFocus || [],
          }),
        });

        setResult(data);
        setChatMessages([
          {
            role: "assistant",
            text: `Your ${form.destination} plan is ready. Ask anything about timing, route, weather, or how to reduce travel fatigue.`,
          },
        ]);
      } catch (err) {
        setMsg(err.message || "Failed to generate plan.");
      } finally {
        setLoading(false);
      }
    }

    loadPlan();
  }, [form]);

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
        { role: "assistant", text: data.reply || "Sorry, I could not answer that." },
      ]);
    } catch (err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: err.message || "Chat failed." },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  const totalSightCost = useMemo(() => {
    return (result?.famousPlaces || []).reduce(
      (sum, item) => sum + (item?.estimatedCostINR?.total || 0),
      0
    );
  }, [result]);

  if (loading) {
    return <LoadingSpinner text="Generating trip plan..." />;
  }

  return (
    <div className="container plannerPage">
      <div className="plannerHead plannerHeadRow">
        <div>
          <h1>{result?.plan?.title || "Generated Trip Plan"}</h1>
          <p>Clean result page with route order, map, weather, and live AI help.</p>
        </div>

        <button className="plannerSecondaryBtn" onClick={() => navigate("/planner")}>
          Edit Inputs
        </button>
      </div>

      {msg && <div className="plannerMessage">{msg}</div>}

      {!result?.plan ? (
        <div className="plannerEmpty">No plan available.</div>
      ) : (
        <div className="plannerResultOnly">
          <div className="plannerBlock">
            <div className="plannerBlockTitle">Trip Summary</div>
            <div className="plannerMutedBox">{result.plan.summary}</div>
          </div>

          <div className="plannerBlock">
            <div className="plannerBlockTitle">Why this place is famous</div>
            <div className="plannerMutedBox">{result.plan.destinationWhyFamous}</div>
          </div>

          <div className="plannerThreeCol">
            <div className="plannerBlock">
              <div className="plannerBlockTitle">Airplane</div>
              <div className="plannerProviderTitle">
                {result.plan.travelModes?.airplane?.optionName}
              </div>
              <div className="plannerMetaStrong">
                Time: {result.plan.travelModes?.airplane?.estimatedTime}
              </div>
              <div className="plannerMutedBox">
                {result.plan.travelModes?.airplane?.details}
              </div>
              <div className="plannerTravelNote">
                {result.plan.travelModes?.airplane?.note}
              </div>
            </div>

            <div className="plannerBlock">
              <div className="plannerBlockTitle">Railway</div>
              <div className="plannerProviderTitle">
                {result.plan.travelModes?.railway?.optionName}
              </div>
              <div className="plannerMetaStrong">
                Time: {result.plan.travelModes?.railway?.estimatedTime}
              </div>
              <div className="plannerMutedBox">
                {result.plan.travelModes?.railway?.details}
              </div>
              <div className="plannerTravelNote">
                {result.plan.travelModes?.railway?.note}
              </div>
            </div>

            <div className="plannerBlock">
              <div className="plannerBlockTitle">Road</div>
              <div className="plannerProviderTitle">
                {result.plan.travelModes?.road?.optionName}
              </div>
              <div className="plannerMetaStrong">
                Time: {result.plan.travelModes?.road?.estimatedTime}
              </div>
              <div className="plannerMutedBox">
                {result.plan.travelModes?.road?.details}
              </div>
              <div className="plannerTravelNote">
                {result.plan.travelModes?.road?.note}
              </div>
            </div>
          </div>

          {!!result.weather && (
            <div className="plannerBlock">
              <div className="plannerBlockTitle">Weather & Smart Suggestions</div>
              <div className="plannerInfoRow">
                <span>Weather: {result.weather.current?.description}</span>
                <span>Temp: {result.weather.current?.temp}°C</span>
                <span>Feels Like: {result.weather.current?.feelsLike}°C</span>
                <span>Humidity: {result.weather.current?.humidity}%</span>
                <span>Wind: {result.weather.current?.windSpeed} km/h</span>
              </div>
              <div className="plannerMutedBox">{result.plan.bestTimeToVisit}</div>
            </div>
          )}

          <div className="plannerBlock">
            <div className="plannerBlockTitle">Trip Route Order</div>
            <div className="plannerInfoRow">
              <span>Start: {result.routeSummary?.startLabel}</span>
              <span>Total Distance: {result.routeSummary?.totalDistanceText}</span>
              <span>Total Estimated City Travel: {result.routeSummary?.totalDurationText}</span>
            </div>
            <div className="plannerRouteChips">
              {(result.routeSummary?.routeOrder || []).map((item, index) => (
                <div className="plannerRouteChip" key={`${item}-${index}`}>
                  {index + 1}. {item}
                </div>
              ))}
            </div>
          </div>

          <div className="plannerBlock">
            <div className="plannerBlockTitle">Map Route</div>
            <PlannerMap mapData={result.mapData} />
          </div>

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
            <div className="plannerBlockTitle">Subplaces with explore time</div>
            <div className="plannerPlacesGrid">
              {(result.famousPlaces || []).map((place, index) => (
                <div className="plannerPlaceCard" key={`${place.name}-${index}`}>
                  <div className="plannerPlaceTop">
                    <div className="plannerPlaceIndex">{place.order}</div>
                    <div>
                      <div className="plannerProviderTitle">{place.name}</div>
                      <div className="plannerProviderMeta">
                        {place.category || "Sightseeing"}
                      </div>
                    </div>
                  </div>

                  <div className="plannerMutedBox">{place.reason}</div>

                  <div className="plannerPlaceFacts">
                    <span>Explore time: {place.exploreTimeText}</span>
                    <span>From previous: {place.fromPreviousDistanceText}</span>
                    <span>Travel time: {place.fromPreviousDurationText}</span>
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
                      className="plannerPrimaryBtn"
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
                      className="plannerPrimaryBtn"
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
                  placeholder="Ask about route order, weather, timing, what to carry..."
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
        </div>
      )}
    </div>
  );
}