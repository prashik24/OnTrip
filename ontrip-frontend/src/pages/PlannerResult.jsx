import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import html2pdf from "html2pdf.js";
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
      const line = L.polyline(mapData.routeCoords, { weight: 5 }).addTo(map);
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

function TravelModeCard({ title, data }) {
  if (!data) return null;

  return (
    <div className="plannerResultBlock">
      <div className="plannerResultBlockTitle">{title}</div>
      <div className="plannerResultProviderTitle">
        {data.optionName || `${title} option`}
      </div>

      <div className="plannerResultTravelSimpleGrid">
        <div className="plannerResultTravelSimpleItem">
          <span>Time</span>
          <strong>{data.estimatedTime || "Not available"}</strong>
        </div>
        <div className="plannerResultTravelSimpleItem">
          <span>Price</span>
          <strong>{data.estimatedPrice?.perPerson || "Not available"}</strong>
        </div>
        <div className="plannerResultTravelSimpleItem">
          <span>Total</span>
          <strong>{data.estimatedPrice?.total || "Not available"}</strong>
        </div>
        <div className="plannerResultTravelSimpleItem">
          <span>Availability</span>
          <strong>{data.availabilityName || "Not available"}</strong>
        </div>
      </div>
    </div>
  );
}

export default function PlannerResult() {
  const navigate = useNavigate();
  const location = useLocation();
  const formFromState = location.state?.form;
  const pdfRef = useRef(null);

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
  const [pdfLoading, setPdfLoading] = useState(false);

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
            priorityMode: form.priorityMode || "balanced",
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

  function copyPlan() {
    if (!result?.plan) return;
    const text =
      result.plan.shareText ||
      `${result.plan.title}\n${result.plan.summary}\n${
        result.routeSummary?.routeOrder?.join(" → ") || ""
      }`;
    navigator.clipboard.writeText(text);
  }

  function shareLink() {
    navigator.clipboard.writeText(window.location.href);
  }

  function savePlan() {
    if (!result?.plan) return;
    localStorage.setItem("saved_trip_plan", JSON.stringify(result));
  }

  async function downloadPdf() {
    if (!pdfRef.current || !result?.plan || pdfLoading) return;

    try {
      setPdfLoading(true);

      const safeDestination = String(form?.destination || "Trip")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9-_]/g, "");

      const opt = {
        margin: [10, 8, 10, 8],
        filename: `${safeDestination || "Trip"}-Plan.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".plannerResultBlock", ".plannerResultPlaceCard", ".plannerResultItineraryCard"],
        },
      };

      await html2pdf().set(opt).from(pdfRef.current).save();
    } catch (error) {
      console.error("PDF download failed:", error);
      setMsg("Failed to download PDF. Please try again.");
    } finally {
      setPdfLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Generating trip plan..." />;
  }

  return (
    <div className="container plannerResultPage">
      <div className="plannerResultOuter">
        <div className="plannerResultHead plannerResultHeadRow noPrint">
          <div>
            <h1>{result?.plan?.title || "Generated Trip Plan"}</h1>
            <p>Clean result page with route order, map, weather, and live AI help.</p>
          </div>

          <div className="plannerResultTopActions">
            <button className="plannerResultSecondaryBtn" onClick={() => navigate("/planner")}>
              Edit Inputs
            </button>
            <button className="plannerResultSecondaryBtn" onClick={copyPlan}>
              Copy Summary
            </button>
            <button className="plannerResultSecondaryBtn" onClick={shareLink}>
              Share Link
            </button>
            <button className="plannerResultSecondaryBtn" onClick={savePlan}>
              Save Trip
            </button>
            <button
              className="plannerResultPrimaryBtn"
              onClick={downloadPdf}
              disabled={pdfLoading}
            >
              {pdfLoading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </div>

        {msg && <div className="plannerResultMessage noPrint">{msg}</div>}

        {!result?.plan ? (
          <div className="plannerResultEmpty">No plan available.</div>
        ) : (
          <div ref={pdfRef} className="plannerPdfContent">
            <div className="plannerResultPdfTitle">
              <h1>{result?.plan?.title || "Generated Trip Plan"}</h1>
              <p>{result?.plan?.summary || ""}</p>
            </div>

            <div className="plannerResultOnly">
              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Trip Summary</div>
                <div className="plannerResultMutedBox">{result.plan.summary}</div>
              </div>

              <div className="plannerResultThreeCol">
                <TravelModeCard title="Airplane" data={result.plan.travelModes?.airplane} />
                <TravelModeCard title="Railway" data={result.plan.travelModes?.railway} />
                <TravelModeCard title="Road" data={result.plan.travelModes?.road} />
              </div>

              {result.plan.travelModes?.bestOption ? (
                <div className="plannerResultBlock plannerResultBestTravelBlock">
                  <div className="plannerResultBlockTitle">Best Travel Option for Your Budget</div>

                  <div className="plannerResultBestTravelTop">
                    <div>
                      <div className="plannerResultBestTravelBadge">
                        {result.plan.travelModes.bestOption.title}
                      </div>
                      <div className="plannerResultProviderTitle">
                        {result.plan.travelModes.bestOption.optionName}
                      </div>
                    </div>

                    <div className="plannerResultBestTravelPrice">
                      {result.plan.travelModes.bestOption.estimatedPrice?.perPerson || ""}
                    </div>
                  </div>

                  <div className="plannerResultTravelSimpleGrid">
                    <div className="plannerResultTravelSimpleItem">
                      <span>Time</span>
                      <strong>
                        {result.plan.travelModes.bestOption.estimatedTime || "Not available"}
                      </strong>
                    </div>
                    <div className="plannerResultTravelSimpleItem">
                      <span>Total</span>
                      <strong>
                        {result.plan.travelModes.bestOption.estimatedPrice?.total ||
                          "Not available"}
                      </strong>
                    </div>
                  </div>

                  <div className="plannerResultMutedBox">
                    {result.plan.travelModes.bestOption.reason}
                  </div>
                </div>
              ) : null}

              <div className="plannerResultFourCol">
                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Route Summary</div>
                  <div className="plannerResultInfoLine">
                    Start: <strong>{result.routeSummary?.startLabel}</strong>
                  </div>
                  <div className="plannerResultInfoLine">
                    Total route distance: <strong>{result.routeSummary?.totalDistanceText}</strong>
                  </div>
                  <div className="plannerResultInfoLine">
                    Total route time: <strong>{result.routeSummary?.totalDurationText}</strong>
                  </div>
                  <div className="plannerResultMutedBox">
                    {result.routeSummary?.routeOrder?.join(" → ")}
                  </div>
                </div>

                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Trip Difficulty</div>
                  <div className="plannerResultDifficultyBadge">
                    {result.plan.tripDifficulty?.level}
                  </div>
                  <div className="plannerResultMutedBox">
                    {result.plan.tripDifficulty?.reason}
                  </div>
                </div>

                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Local Transport Recommendation</div>
                  <div className="plannerResultProviderTitle">
                    {result.plan.localTransport?.bestLocalMode}
                  </div>
                  <div className="plannerResultMutedBox">
                    {result.plan.localTransport?.note}
                  </div>
                </div>

                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Best Time to Visit</div>
                  <div className="plannerResultMutedBox">{result.plan.bestTimeToVisit}</div>
                </div>
              </div>

              {result?.mapData ? (
                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Route Map</div>
                  <PlannerMap mapData={result.mapData} />
                </div>
              ) : null}

              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Day-wise Fast Route Plan</div>

                {result.plan.itinerary?.length ? (
                  <div className="plannerResultItineraryGrid">
                    {result.plan.itinerary.map((dayItem, index) => (
                      <div className="plannerResultItineraryCard" key={index}>
                        <div className="plannerResultItineraryHeader">
                          <div>
                            <div className="plannerResultProviderTitle">Day {dayItem.day}</div>
                            <div className="plannerResultProviderMeta">{dayItem.title}</div>
                          </div>
                          <div className="plannerResultDayBadge">
                            {dayItem.totalDistanceText || "0 km"}
                          </div>
                        </div>

                        <div className="plannerResultTravelMiniGrid">
                          <div className="plannerResultTravelMiniBox">
                            <div className="plannerResultMiniLabel">Recommended Start</div>
                            <div>{dayItem.recommendedDayStart || "8:00 AM"}</div>
                          </div>
                          <div className="plannerResultTravelMiniBox">
                            <div className="plannerResultMiniLabel">Travel Time</div>
                            <div>{dayItem.totalTravelTimeText || "Not available"}</div>
                          </div>
                        </div>

                        <div className="plannerResultMutedBox">
                          {dayItem.routeOrderText || "Not available"}
                        </div>

                        {dayItem.optimizationNote ? (
                          <div className="plannerResultMutedBox">{dayItem.optimizationNote}</div>
                        ) : null}

                        {dayItem.placeSequence?.length ? (
                          <div className="plannerResultSequenceList">
                            {dayItem.placeSequence.map((place, idx) => (
                              <div className="plannerResultSequenceItem" key={idx}>
                                <div className="plannerResultSequenceCount">
                                  {place.order || idx + 1}
                                </div>
                                <div className="plannerResultSequenceContent">
                                  <div className="plannerResultSequenceTitle">{place.name}</div>
                                  <div className="plannerResultSequenceMeta">
                                    Start: {place.recommendedStartTime} • Explore:{" "}
                                    {place.exploreTimeText}
                                  </div>
                                  <div className="plannerResultSequenceMeta">
                                    From previous: {place.distanceFromPreviousText} •{" "}
                                    {place.durationFromPreviousText}
                                  </div>
                                  <div className="plannerResultSequenceMeta">
                                    Timings: {place.openingHours} • Closed: {place.closedDay}
                                  </div>
                                  <div className="plannerResultSequenceMeta">
                                    Best slot: {place.bestSlot}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="plannerResultMutedBox">No day-wise route available.</div>
                )}
              </div>

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
                          : place.crowdLabel || "Moderate crowd";

                      return (
                        <div className="plannerResultPlaceCard" key={`${place.name}-${index}`}>
                          <div className="plannerResultPlaceTop">
                            <div className="plannerResultPlaceIndex">
                              {place.order || index + 1}
                            </div>
                            <div>
                              <div className="plannerResultProviderTitle">{place.name}</div>
                              <div className="plannerResultMutedBox">{place.reason}</div>
                            </div>
                          </div>

                          <div className="plannerResultPlaceFacts">
                            <span>Time: {place.exploreTimeText}</span>
                            <span>{crowdLabel}</span>
                            <span>Best slot: {place.bestSlot}</span>
                          </div>

                          <div className="plannerResultCostBox">
                            <div>Entry: {money(place.estimatedCostINR?.entryFee)}</div>
                            <div>
                              Food/Local: {money(place.estimatedCostINR?.foodAndLocalTravel)}
                            </div>
                            <div>Total stop cost: {money(place.estimatedCostINR?.total)}</div>
                            <div>Opening: {place.openingHours}</div>
                            <div>Closed day: {place.closedDay}</div>
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

              <div className="plannerResultTwoCol">
                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Hotel Suggestions</div>
                  <div className="plannerResultInfoLine">
                    Best area: <strong>{result.plan.hotels?.bestAreaToStay}</strong>
                  </div>
                  <div className="plannerResultInfoLine">
                    Budget stay: <strong>{result.plan.hotels?.budgetStay}</strong>
                  </div>
                  <div className="plannerResultInfoLine">
                    Balanced stay: <strong>{result.plan.hotels?.balancedStay}</strong>
                  </div>
                  <div className="plannerResultInfoLine">
                    Premium stay: <strong>{result.plan.hotels?.premiumStay}</strong>
                  </div>
                  <div className="plannerResultMutedBox">{result.plan.hotels?.note}</div>
                </div>

                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Packing Suggestions</div>
                  <ul className="plannerResultList">
                    {(result.plan.packingSuggestions || []).map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="plannerResultTwoCol">
                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Food Plan</div>
                  <div className="plannerResultFoodGrid">
                    {(result.plan.foodPlan || []).map((item) => (
                      <div className="plannerResultFoodCard" key={item.day}>
                        <div className="plannerResultProviderTitle">Day {item.day}</div>
                        <div className="plannerResultInfoLine">
                          Breakfast: <strong>{item.breakfast}</strong>
                        </div>
                        <div className="plannerResultInfoLine">
                          Lunch: <strong>{item.lunch}</strong>
                        </div>
                        <div className="plannerResultInfoLine">
                          Dinner: <strong>{item.dinner}</strong>
                        </div>
                        <div className="plannerResultInfoLine">
                          Must try: <strong>{item.mustTry}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="plannerResultBlock">
                  <div className="plannerResultBlockTitle">Backup Places</div>
                  <div className="plannerResultFoodGrid">
                    {(result.plan.backupPlaces || []).map((item, idx) => (
                      <div className="plannerResultFoodCard" key={idx}>
                        <div className="plannerResultProviderTitle">{item.nearPlace}</div>
                        <ul className="plannerResultList">
                          {(item.backupOptions || []).map((opt, i) => (
                            <li key={i}>{opt}</li>
                          ))}
                        </ul>
                        <div className="plannerResultMutedBox">{item.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Full Budget Breakdown</div>

                <div className="plannerResultBudgetStatus">
                  <div className="plannerResultBudgetTop">
                    <div className="plannerResultBudgetPill">
                      Given Budget: {money(result.plan.budgetStatus?.totalBudget)}
                    </div>
                    <div className="plannerResultBudgetPill isSoft">
                      Estimated Total: {money(result.plan.budgetStatus?.estimatedTotal)}
                    </div>
                  </div>

                  <div
                    className={`plannerResultBudgetSummary ${
                      result.plan.budgetStatus?.isSufficient ? "isGood" : "isWarn"
                    }`}
                  >
                    {result.plan.budgetStatus?.statusText}
                  </div>

                  {!result.plan.budgetStatus?.isSufficient ? (
                    <div className="plannerResultBudgetExtra">
                      Extra required:{" "}
                      <strong>{money(result.plan.budgetStatus?.extraRequired)}</strong>
                    </div>
                  ) : (
                    <div className="plannerResultBudgetExtra">
                      Remaining after estimate:{" "}
                      <strong>{money(result.plan.budgetStatus?.savingsLeft)}</strong>
                    </div>
                  )}
                </div>

                <ul className="plannerResultList">
                  {(result.plan.budgetBreakdown || []).map((item, idx) => (
                    <li key={idx}>
                      {item.label}: {money(item.amount)}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plannerResultBlock">
                <div className="plannerResultBlockTitle">Day-wise Cost</div>
                <div className="plannerResultFoodGrid">
                  {(result.plan.dayWiseCosts || []).map((item) => (
                    <div className="plannerResultFoodCard" key={item.day}>
                      <div className="plannerResultProviderTitle">Day {item.day}</div>
                      <div className="plannerResultInfoLine">
                        Expected spend: <strong>{money(item.amount)}</strong>
                      </div>
                      <div className="plannerResultMutedBox">{item.note}</div>
                    </div>
                  ))}
                </div>
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
                          className="plannerResultPrimaryBtn noPrint"
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
                          className="plannerResultPrimaryBtn noPrint"
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

              <div className="plannerResultBlock noPrint">
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
          </div>
        )}
      </div>
    </div>
  );
}