import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { downloadTripPdfFromElement } from "../utils/tripPdf";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SavedTrips.css";

function money(value) {
  const n = Number(value || 0);
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function SavedTrips() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [savedTrips, setSavedTrips] = useState([]);
  const cardRefs = useRef({});

  useEffect(() => {
    async function loadSavedTrips() {
      try {
        setLoading(true);
        const data = await apiFetch("/api/saved-trips");
        setSavedTrips(data.trips || []);
      } catch (err) {
        setMsg(err.message || "Failed to load saved trips.");
      } finally {
        setLoading(false);
      }
    }

    loadSavedTrips();
  }, []);

  async function handleDeleteTrip(id) {
    try {
      setMsg("");

      await apiFetch(`/api/saved-trips/${id}`, {
        method: "DELETE",
      });

      setSavedTrips((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setMsg(err.message || "Failed to delete trip.");
    }
  }

  async function handleDownloadTrip(trip) {
    const element = cardRefs.current[trip._id];
    if (!element) return;

    try {
      await downloadTripPdfFromElement(
        element,
        `${trip.destination || "saved-trip"}-plan.pdf`
      );
    } catch {
      setMsg("Failed to download PDF.");
    }
  }

  function openTrip(trip) {
    navigate("/planner/result", {
      state: {
        form: {
          destination: trip.destination,
          startCity: trip.startCity,
          days: trip.days,
          budget: trip.budget,
          peopleCount: trip.peopleCount,
          travelStyle: trip.travelStyle,
          interestFocus: [],
        },
        savedTripData: trip.tripData,
      },
    });
  }

  if (loading) {
    return <LoadingSpinner text="Loading saved trips..." />;
  }

  return (
    <div className="savedTripsPage container">
      <div className="savedTripsHead">
        <div>
          <h1>Saved Trips</h1>
          <p>Open, download, or delete your saved AI trip plans.</p>
        </div>

        <button
          className="savedTripsBtn secondary savedTripsBackBtn"
          onClick={() => navigate("/profile")}
        >
          Back to Profile
        </button>
      </div>

      {msg ? <div className="savedTripsMessage">{msg}</div> : null}

      {!savedTrips.length ? (
        <div className="savedTripsEmpty">
          No saved trips found. Save a trip from planner result page first.
        </div>
      ) : (
        <div className="savedTripsGrid">
          {savedTrips.map((trip) => {
            const plan = trip.tripData?.plan || {};
            const budgetStatus = plan?.budgetStatus || {};

            return (
              <div
                key={trip._id}
                className="savedTripCard"
                ref={(el) => {
                  cardRefs.current[trip._id] = el;
                }}
              >
                <div className="savedTripTop active">
                  <div className="savedTripTopLeft">
                    <div className="savedTripTitle">
                      {trip.title || `${trip.destination} Trip`}
                    </div>
                    <div className="savedTripSub">
                      {trip.startCity ? `${trip.startCity} → ` : ""}
                      {trip.destination}
                    </div>
                  </div>

                  <div className="savedTripTopRight">
                    <div className="savedTripPrice">{money(trip.budget)}</div>
                    <div className="savedTripTopStatuses">
                      <span className="savedTripStatusBadge top">{trip.days} Days</span>
                      <span className="savedTripStatusBadge top">
                        {trip.peopleCount} People
                      </span>
                    </div>
                  </div>
                </div>

                <div className="savedTripBody">
                  <div className="savedTripInfo">
                    <div>
                      <strong>Budget</strong>
                      <span>{money(trip.budget)}</span>
                    </div>

                    <div>
                      <strong>Style</strong>
                      <span>{trip.travelStyle}</span>
                    </div>

                    <div>
                      <strong>Saved On</strong>
                      <span>
                        {new Date(trip.createdAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>

                    <div>
                      <strong>Duration</strong>
                      <span>{trip.days} Days</span>
                    </div>
                  </div>

                  <div className="savedTripSummary">
                    {plan.summary || "Saved trip plan"}
                  </div>

                  {plan?.travelModes?.bestOption ? (
                    <div className="savedTripBestBox">
                      <div className="savedTripBestLabel">Best Option</div>
                      <div className="savedTripBestText">
                        {plan.travelModes.bestOption.title} •{" "}
                        {plan.travelModes.bestOption.estimatedTime || "Time not available"}
                      </div>
                    </div>
                  ) : null}

                  {budgetStatus?.statusText ? (
                    <div
                      className={`savedTripBudgetStatus ${
                        budgetStatus.isSufficient ? "isGood" : "isWarn"
                      }`}
                    >
                      {budgetStatus.statusText}
                    </div>
                  ) : null}

                  <div className="savedTripActions">
                    <button
                      className="savedTripsBtn primary"
                      onClick={() => openTrip(trip)}
                    >
                      Open Trip
                    </button>

                    <button
                      className="savedTripsBtn secondary"
                      onClick={() => handleDownloadTrip(trip)}
                    >
                      Download PDF
                    </button>

                    <button
                      className="savedTripsBtn secondary"
                      onClick={() => handleDeleteTrip(trip._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}