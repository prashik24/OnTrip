import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import { downloadTripPdfFromElement } from "../utils/tripPdf";
import "./PlannerResult.css";

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

function PlannerMap({ mapData, itinerary = [], destination = "", focusedPlace = null }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);
  const markerRefs = useRef({});
  const [selectedDay, setSelectedDay] = useState("all");

  const daysList = useMemo(() => {
    if (!Array.isArray(itinerary) || itinerary.length === 0) return [];
    return itinerary.map((item, idx) => item.day || idx + 1);
  }, [itinerary]);

  const activeMarkers = useMemo(() => {
    if (!mapData) return [];

    if (selectedDay === "all") {
      return (mapData.markers || []).filter((m) => m && m.lat && m.lon);
    }

    const currentDayPlan = itinerary.find(
      (item, idx) => (item.day || idx + 1) === selectedDay
    );

    if (
      currentDayPlan &&
      Array.isArray(currentDayPlan.placeSequence) &&
      currentDayPlan.placeSequence.length > 0
    ) {
      return currentDayPlan.placeSequence
        .map((p, idx) => {
          let lat = p.lat;
          let lon = p.lon;
          if (!lat || !lon) {
            const fallback = (mapData.markers || []).find(
              (m) => m.name && m.name.toLowerCase() === p.name?.toLowerCase()
            );
            if (fallback) {
              lat = fallback.lat;
              lon = fallback.lon;
            }
          }
          if (!lat || !lon) return null;
          return {
            name: p.name,
            reason: p.reason,
            order: p.order || idx + 1,
            exploreTimeText: p.exploreTimeText,
            lat,
            lon,
            day: selectedDay,
          };
        })
        .filter(Boolean);
    }

    return (mapData.markers || []).filter((m) => m && m.lat && m.lon);
  }, [mapData, itinerary, selectedDay]);

  const gmapsUrl = useMemo(() => {
    if (!activeMarkers || activeMarkers.length === 0) return "";
    const destContext = destination ? ` ${destination}` : "";

    if (activeMarkers.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        activeMarkers[0].name + destContext
      )}`;
    }

    const origin = encodeURIComponent(activeMarkers[0].name + destContext);
    const dest = encodeURIComponent(
      activeMarkers[activeMarkers.length - 1].name + destContext
    );
    const waypoints = activeMarkers
      .slice(1, -1)
      .map((m) => encodeURIComponent(m.name + destContext))
      .join("|");

    if (waypoints) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypoints}&travelmode=driving`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&travelmode=driving`;
  }, [activeMarkers, destination]);

  useEffect(() => {
    if (!mapRef.current || !mapData) return;

    if (!mapInstanceRef.current) {
      const initialCenter = mapData.center || [20.5937, 78.9629];
      const map = L.map(mapRef.current, {
        scrollWheelZoom: false,
      }).setView(initialCenter, 12);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          subdomains: "abcd",
          attribution:
            '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }
      ).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        layerGroupRef.current = null;
      }
    };
  }, [mapData]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    markerRefs.current = {};

    if (!activeMarkers || activeMarkers.length === 0) return;

    const routeCoords = [];

    activeMarkers.forEach((item, index) => {
      const coord = [item.lat, item.lon];
      routeCoords.push(coord);

      const isStart = index === 0;
      const customIcon = L.divIcon({
        className: "plannerCustomMarker",
        html: `<div class="plannerMapPin ${isStart ? "isStartPin" : ""}"><span class="plannerMapPinNum">${
          item.order || index + 1
        }</span></div>`,
        iconSize: [30, 36],
        iconAnchor: [15, 36],
        popupAnchor: [0, -32],
      });

      const destContext = destination ? ` ${destination}` : "";
      const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
        item.name + destContext
      )}&travelmode=driving`;

      const popupHtml = `
        <div class="plannerMapPopup">
          <div class="plannerMapPopupBadge">${isStart ? "🚩 Starting Point" : `Stop #${item.order || index + 1}`}</div>
          <div class="plannerMapPopupTitle">${item.name}</div>
          ${item.exploreTimeText ? `<div class="plannerMapPopupTime">⏱ ${item.exploreTimeText}</div>` : ""}
          ${item.reason ? `<div class="plannerMapPopupReason">${item.reason}</div>` : ""}
          <a href="${navUrl}" target="_blank" rel="noopener noreferrer" class="plannerMapPopupLink">
            Navigate in Google Maps ↗
          </a>
        </div>
      `;

      const marker = L.marker(coord, { icon: customIcon }).bindPopup(popupHtml);
      marker.addTo(layerGroup);
      markerRefs.current[item.name.toLowerCase()] = marker;
    });

    if (routeCoords.length > 1) {
      const polyline = L.polyline(routeCoords, {
        color: "#00b8f1",
        weight: 4,
        opacity: 0.85,
        dashArray: "6, 8",
        lineJoin: "round",
      }).addTo(layerGroup);

      map.fitBounds(polyline.getBounds(), { padding: [35, 35] });
    } else if (routeCoords.length === 1) {
      map.setView(routeCoords[0], 14);
    }
  }, [activeMarkers, destination]);

  useEffect(() => {
    if (!focusedPlace || !focusedPlace.lat || !focusedPlace.lon) return;

    if (focusedPlace.day && selectedDay !== "all" && selectedDay !== focusedPlace.day) {
      setSelectedDay(focusedPlace.day);
    }

    const timer = setTimeout(() => {
      const map = mapInstanceRef.current;
      if (!map) return;
      map.flyTo([focusedPlace.lat, focusedPlace.lon], 15, {
        duration: 1.2,
      });
      const marker = markerRefs.current[focusedPlace.name?.toLowerCase()];
      if (marker) {
        marker.openPopup();
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [focusedPlace, selectedDay]);

  return (
    <div className="plannerMapWrapper">
      <div className="plannerMapControls">
        <div className="plannerMapTabs">
          <button
            type="button"
            className={`plannerMapTab ${selectedDay === "all" ? "active" : ""}`}
            onClick={() => setSelectedDay("all")}
          >
            All Stops ({mapData?.markers?.length || 0})
          </button>
          {daysList.map((dayNum) => (
            <button
              key={dayNum}
              type="button"
              className={`plannerMapTab ${selectedDay === dayNum ? "active" : ""}`}
              onClick={() => setSelectedDay(dayNum)}
            >
              Day {dayNum}
            </button>
          ))}
        </div>

        {gmapsUrl && (
          <a
            href={gmapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="plannerMapGmapsBtn"
            title="Open turn-by-turn driving route in Google Maps"
          >
            <span>Open Route in Google Maps ↗</span>
          </a>
        )}
      </div>

      <div ref={mapRef} className="plannerLeafletMap" />

      <div className="plannerMapFootNote">
        💡 Click any pin on the map to see details and direct turn-by-turn navigation links.
      </div>
    </div>
  );
}

function TravelModeCard({ title, data }) {
  if (!data) return null;

  return (
    <div className="plannerResultBlock plannerResultTravelModeCard">
      <div className="plannerResultBlockTitle">{title}</div>
      <div className="plannerResultProviderTitle plannerResultProviderTitle-1">
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
  const savedTripData = location.state?.savedTripData || null;
  const tripPrintRef = useRef(null);

  const [form] = useState(() => {
    if (formFromState) return formFromState;

    try {
      const raw = sessionStorage.getItem("planner_form_data");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(!savedTripData);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(savedTripData || null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [focusedPlace, setFocusedPlace] = useState(null);

  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      text: savedTripData
        ? `Your saved ${savedTripData?.plan?.title || form?.destination || "trip"} is open. Ask anything about timing, route, weather, or budget.`
        : "Ask about route order, weather, best visiting time, or what to pack.",
    },
  ]);

  useEffect(() => {
    async function loadPlan() {
      if (savedTripData) {
        setResult(savedTripData);
        setChatMessages([
          {
            role: "assistant",
            text: `Your saved ${
              savedTripData?.plan?.title || form?.destination || "trip"
            } is open. Ask anything about timing, route, weather, or budget.`,
          },
        ]);
        setLoading(false);
        return;
      }

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
  }, [form, savedTripData]);

  async function handleSaveTrip() {
    if (!result?.plan || saveLoading || savedTripData) return;

    try {
      setSaveLoading(true);
      setMsg("");

      await apiFetch("/api/saved-trips", {
        method: "POST",
        body: JSON.stringify({
          title: result?.plan?.title || `${form.destination} Trip`,
          destination: form.destination,
          startCity: form.startCity || "",
          days: Number(form.days),
          budget: Number(form.budget),
          peopleCount: Number(form.peopleCount),
          travelStyle: form.travelStyle,
          tripData: result,
        }),
      });

      setMsg("Trip saved successfully. You can now view it in Profile.");
    } catch (err) {
      setMsg(err.message || "Failed to save trip.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleDownloadPdf() {
    if (!tripPrintRef.current || downloadLoading) return;

    try {
      setDownloadLoading(true);
      await downloadTripPdfFromElement(
        tripPrintRef.current,
        `${form?.destination || result?.plan?.title || "trip-plan"}-plan.pdf`
      );
    } catch {
      setMsg("Failed to download PDF.");
    } finally {
      setDownloadLoading(false);
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

          <div className="plannerResultTopActions">
            <button className="plannerResultSecondaryBtn" onClick={() => navigate("/planner")}>
              Edit Inputs
            </button>

            {!savedTripData && (
              <button
                className="plannerResultSecondaryBtn"
                onClick={handleSaveTrip}
                disabled={saveLoading || !result?.plan}
              >
                {saveLoading ? "Saving..." : "Save Trip"}
              </button>
            )}

            <button
              className="plannerResultPrimaryBtn"
              onClick={handleDownloadPdf}
              disabled={downloadLoading || !result?.plan}
            >
              {downloadLoading ? "Downloading..." : "Download PDF"}
            </button>
          </div>
        </div>

        {msg && <div className="plannerResultMessage">{msg}</div>}

        {!result?.plan ? (
          <div className="plannerResultEmpty">No plan available.</div>
        ) : (
          <div className="plannerResultOnly" ref={tripPrintRef}>
            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Trip Summary</div>
              <div className="plannerResultMutedBox">{result.plan.summary}</div>
            </div>

            <div className="plannerResultBlock">
              <div className="plannerResultBlockTitle">Why this place is famous</div>
              <div className="plannerResultMutedBox">{result.plan.destinationWhyFamous}</div>
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

            {result?.mapData ? (
              <div className="plannerResultBlock" id="planner-route-map">
                <div className="plannerResultBlockTitle">Interactive Route Map</div>
                <PlannerMap
                mapData={result.mapData}
                itinerary={result.plan?.itinerary}
                destination={form?.destination || result.plan?.title || ""}
                focusedPlace={focusedPlace}
              />
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
                          <div className="plannerResultMiniLabel">Travel Time</div>
                          <div>{dayItem.totalTravelTimeText || "Not available"}</div>
                        </div>

                        <div className="plannerResultTravelMiniBox">
                          <div className="plannerResultMiniLabel">Route Order</div>
                          <div>{dayItem.routeOrderText || "Not available"}</div>
                        </div>
                      </div>

                      {dayItem.optimizationNote ? (
                        <div className="plannerResultMutedBox">
                          {dayItem.optimizationNote}
                        </div>
                      ) : null}

                      {dayItem.placeSequence?.length ? (
                        <div className="plannerResultSequenceList">
                          {dayItem.placeSequence.map((place, idx) => (
                            <div className="plannerResultSequenceItem" key={idx}>
                              <div className="plannerResultSequenceCount">
                                {place.order || idx + 1}
                              </div>
                              <div className="plannerResultSequenceContent">
                                <div className="plannerResultSequenceTitle">
                                {place.name}
                                {place.lat && place.lon && (
                                  <button
                                    type="button"
                                    className="plannerViewOnMapBtn"
                                    onClick={() => {
                                      setFocusedPlace({ ...place, day: dayItem.day });
                                      const mapEl = document.getElementById("planner-route-map");
                                      if (mapEl) {
                                        mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                      }
                                    }}
                                  >
                                    📍 View on Map
                                  </button>
                                )}
                              </div>
                                <div className="plannerResultSequenceMeta">
                                  Explore: {place.exploreTimeText}
                                </div>
                                <div className="plannerResultSequenceMeta">
                                  From previous: {place.distanceFromPreviousText} •{" "}
                                  {place.durationFromPreviousText}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ul className="plannerResultList">
                          {(dayItem.items || []).map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      )}
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
                        : "Moderate crowd";

                    return (
                      <div className="plannerResultPlaceCard" key={`${place.name}-${index}`}>
                        <div className="plannerResultPlaceTop">
                          <div className="plannerResultPlaceIndex">{place.order || index + 1}</div>

                          <div>
                            <div className="plannerResultProviderTitle">
                            {place.name}
                            {place.lat && place.lon && (
                              <button
                                type="button"
                                className="plannerViewOnMapBtn"
                                onClick={() => {
                                  setFocusedPlace(place);
                                  const mapEl = document.getElementById("planner-route-map");
                                  if (mapEl) {
                                    mapEl.scrollIntoView({ behavior: "smooth", block: "center" });
                                  }
                                }}
                              >
                                📍 View on Map
                              </button>
                            )}
                          </div>
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