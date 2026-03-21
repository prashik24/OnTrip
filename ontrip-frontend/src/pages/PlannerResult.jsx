import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./PlannerResult.css";

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
      text: "Ask about route order, weather, best visiting time, or what to pack.",
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
    <div className="container plannerResultPage">
      <div className="plannerResultOuter">
        <div className="plannerResultHead plannerResultHeadRow">
          <div>
            <h1>{result?.plan?.title || "Generated Trip Plan"}</h1>
            <p>Clean result page with route order, map, weather, and live AI help.</p>
          </div>

          <button className="plannerResultSecondaryBtn" onClick={() => navigate("/planner")}>
            Edit Inputs
          </button>
        </div>

        {msg && <div className="plannerResultMessage">{msg}</div>}

        {!result?.plan ? (
          <div className="plannerResultEmpty">No plan available.</div>
        ) : (
          <div className="plannerResultOnly">
            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Trip Summary</div>
              <div className="plannerResultMutedBox">{result.plan.summary}</div>
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Why this place is famous</div>
              <div className="plannerResultMutedBox">{result.plan.destinationWhyFamous}</div>
            </div>

            <div className="plannerResultThreeCol">
              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Airplane</div>
                <div className="plannerResultProviderTitle">
                  {result.plan.travelModes?.airplane?.optionName}
                </div>
                <div className="plannerResultMetaStrong">
                  Time: {result.plan.travelModes?.airplane?.estimatedTime}
                </div>
                <div className="plannerResultMutedBox">
                  {result.plan.travelModes?.airplane?.details}
                </div>
                <div className="plannerResultTravelNote">
                  {result.plan.travelModes?.airplane?.note}
                </div>
              </div>

              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Railway</div>
                <div className="plannerResultProviderTitle">
                  {result.plan.travelModes?.railway?.optionName}
                </div>
                <div className="plannerResultMetaStrong">
                  Time: {result.plan.travelModes?.railway?.estimatedTime}
                </div>
                <div className="plannerResultMutedBox">
                  {result.plan.travelModes?.railway?.details}
                </div>
                <div className="plannerResultTravelNote">
                  {result.plan.travelModes?.railway?.note}
                </div>
              </div>

              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Road</div>
                <div className="plannerResultProviderTitle">
                  {result.plan.travelModes?.road?.optionName}
                </div>
                <div className="plannerResultMetaStrong">
                  Time: {result.plan.travelModes?.road?.estimatedTime}
                </div>
                <div className="plannerResultMutedBox">
                  {result.plan.travelModes?.road?.details}
                </div>
                <div className="plannerResultTravelNote">
                  {result.plan.travelModes?.road?.note}
                </div>
              </div>
            </div>

            {result?.mapData ? (
              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Route Map</div>
                <PlannerMap mapData={result.mapData} />
              </div>
            ) : null}

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Places to Explore</div>
              {result.famousPlaces?.length ? (
                <div className="plannerResultPlacesGrid">
                  {result.famousPlaces.map((place, index) => {
                    const crowdLabel =
                      place.crowdLevel === "low"
                        ? "Low crowd"
                        : place.crowdLevel === "high"
                        ? "High crowd"
                        : "Moderate crowd";

                    return (
                      <div className="plannerResultPlaceCard" key={`${place.name}-${index}`}>
                        <div className="plannerResultPlaceTop">
                          <div className="plannerResultPlaceIndex">{place.order || index + 1}</div>

                          <div>
                            <div className="plannerResultProviderTitle">{place.name}</div>
                            <div className="plannerResultMutedBox">{place.reason}</div>
                          </div>
                        </div>

                        <div className="plannerResultPlaceFacts">
                          <span>Time: {place.exploreTimeText}</span>
                          <span>{crowdLabel}</span>
                          <span>Weather fit: {place.weatherSuitability}</span>
                        </div>

                        <div className="plannerResultCostBox">
                          <div>Entry: {money(place.estimatedCostINR?.entryFee)}</div>
                          <div>Food/Local: {money(place.estimatedCostINR?.foodAndLocalTravel)}</div>
                          <div>Total stop cost: {money(place.estimatedCostINR?.total)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="plannerResultMutedBox">No places available.</div>
              )}

              <div className="plannerResultMutedBox">
                Total estimated sightseeing spend for listed places:{" "}
                <strong>{money(totalSightCost)}</strong>
              </div>
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Budget breakdown</div>
              <ul className="plannerResultList">
                {(result.plan.budgetBreakdown || []).map((item, idx) => (
                  <li key={idx}>
                    {item.label}: {money(item.amount)}
                  </li>
                ))}
              </ul>
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Transport advice</div>
              <div className="plannerResultMutedBox">{result.plan.transportAdvice}</div>
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Recommended Travel Planners</div>
              {result.recommendedTravelProviders?.length ? (
                <div className="plannerResultProviderGrid">
                  {result.recommendedTravelProviders.map((item) => (
                    <div className="plannerResultProviderCard" key={item._id}>
                      <div className="plannerResultProviderTitle">{item.businessName}</div>
                      <div className="plannerResultProviderMeta">
                        {item.city} • ⭐ {item.ratingAverage || 0}
                      </div>
                      <div className="plannerResultProviderText">
                        {item.travelPlanner?.packageTitle ||
                          item.description ||
                          "Travel planner"}
                      </div>
                      <button
                        className="plannerResultPrimaryBtn"
                        onClick={() => navigate(`/providers/${item._id}`)}
                      >
                        View Planner
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="plannerResultMutedBox">No matching travel planners found.</div>
              )}
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Recommended Vehicle Services</div>
              {result.recommendedVehicleProviders?.length ? (
                <div className="plannerResultProviderGrid">
                  {result.recommendedVehicleProviders.map((item) => (
                    <div className="plannerResultProviderCard" key={item._id}>
                      <div className="plannerResultProviderTitle">{item.businessName}</div>
                      <div className="plannerResultProviderMeta">
                        {item.city} • ⭐ {item.ratingAverage || 0}
                      </div>
                      <div className="plannerResultProviderText">
                        {(item.vehicles || [])
                          .slice(0, 2)
                          .map(
                            (vehicle) =>
                              `${vehicle.title || vehicle.vehicleType} - ${money(vehicle.price)}`
                          )
                          .join(", ") || "Vehicle service"}
                      </div>
                      <button
                        className="plannerResultPrimaryBtn"
                        onClick={() => navigate(`/providers/${item._id}`)}
                      >
                        View Vehicles
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="plannerResultMutedBox">No matching vehicle providers found.</div>
              )}
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Ask AI about this plan</div>
              <div className="plannerResultChatBox">
                <div className="plannerResultChatMessages">
                  {chatMessages.map((item, index) => (
                    <div
                      key={index}
                      className={`plannerResultChatBubble ${
                        item.role === "user" ? "isUser" : "isBot"
                      }`}
                    >
                      {item.text}
                    </div>
                  ))}
                </div>

                <div className="plannerResultChatComposer">
                  <input
                    className="plannerResultInput"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about weather, timing, packing, route, best season..."
                    onKeyDown={(e) => {
                      if (e.key === "Enter") sendChat();
                    }}
                  />
                  <button
                    className="plannerResultPrimaryBtn"
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
    </div>
  );
}