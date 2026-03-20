import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Planner.css";

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
    } catch (err) {
      setMsg(err.message || "Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Generating AI trip plan..." />;
  }

  return (
    <div className="container planner">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">AI Trip Planner</h2>
          <p className="pageSub">
            Generate itinerary, travel suggestions, and provider recommendations based on your destination.
          </p>
        </div>
      </div>

      {msg && <div className="plannerMessage">{msg}</div>}

      <div className="grid2">
        <div className="card formCard">
          <div className="sectionTitle">Trip Inputs</div>

          <label className="label">Destination</label>
          <input
            className="input"
            value={form.destination}
            onChange={(e) => update("destination", e.target.value)}
            placeholder="e.g., Jaipur"
          />

          <div className="row2">
            <div>
              <label className="label">Days</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.days}
                onChange={(e) => update("days", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Budget (₹)</label>
              <input
                className="input"
                type="number"
                min="1000"
                value={form.budget}
                onChange={(e) => update("budget", e.target.value)}
              />
            </div>
          </div>

          <div className="row2">
            <div>
              <label className="label">People</label>
              <input
                className="input"
                type="number"
                min="1"
                value={form.peopleCount}
                onChange={(e) => update("peopleCount", e.target.value)}
              />
            </div>

            <div>
              <label className="label">Travel Style</label>
              <select
                className="select"
                value={form.travelStyle}
                onChange={(e) => update("travelStyle", e.target.value)}
              >
                <option>Budget</option>
                <option>Balanced</option>
                <option>Comfort</option>
                <option>Luxury</option>
              </select>
            </div>
          </div>

          <label className="label">Start City (optional)</label>
          <input
            className="input"
            value={form.startCity}
            onChange={(e) => update("startCity", e.target.value)}
            placeholder="e.g., Delhi"
          />

          <button className="btn btnPrimary planBtn" onClick={generatePlan}>
            Generate AI Plan
          </button>
        </div>

        <div className="card planCard">
          <div className="sectionTitle">Generated Plan</div>

          {!result?.plan ? (
            <div className="empty">
              Enter trip details and generate a plan to see AI itinerary and provider recommendations.
            </div>
          ) : (
            <>
              <div className="planTitle">{result.plan.title}</div>

              <div className="planBlock">
                <div className="blockTitle">Trip Summary</div>
                <div className="mutedBox">{result.plan.summary}</div>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Why this plan</div>
                <div className="mutedBox">{result.plan.whyRecommended}</div>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Day-wise itinerary</div>
                <div className="plannerDayList">
                  {(result.plan.itinerary || []).map((day) => (
                    <div className="plannerDayItem" key={day.day}>
                      <div className="plannerDayHeading">
                        Day {day.day}: {day.title}
                      </div>
                      <ul className="list">
                        {(day.items || []).map((item, idx) => (
                          <li key={idx}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Budget breakdown</div>
                <ul className="list">
                  {(result.plan.budgetBreakdown || []).map((item, idx) => (
                    <li key={idx}>
                      {item.label}: ₹{item.amount}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Transport advice</div>
                <div className="mutedBox">{result.plan.transportAdvice}</div>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Recommended Travel Planners</div>
                {result.recommendedTravelProviders?.length ? (
                  <div className="plannerProviderGrid">
                    {result.recommendedTravelProviders.map((item) => (
                      <div className="plannerProviderCard" key={item._id}>
                        <div className="plannerProviderTitle">{item.businessName}</div>
                        <div className="plannerProviderMeta">
                          {item.city} • ⭐ {item.ratingAverage || 0}
                        </div>
                        <div className="plannerProviderText">
                          {item.travelPlanner?.packageTitle || item.description || "Travel planner"}
                        </div>
                        <button
                          className="btn"
                          onClick={() => navigate(`/providers/${item._id}`)}
                        >
                          View Planner
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mutedBox">No matching travel planners found.</div>
                )}
              </div>

              <div className="planBlock">
                <div className="blockTitle">Recommended Vehicle Services</div>
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
                            .map((vehicle) => `${vehicle.title || vehicle.vehicleType} - ₹${vehicle.price}`)
                            .join(", ") || "Vehicle service"}
                        </div>
                        <button
                          className="btn"
                          onClick={() => navigate(`/providers/${item._id}`)}
                        >
                          View Vehicles
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mutedBox">No matching vehicle providers found.</div>
                )}
              </div>

              <div className="planBlock">
                <div className="blockTitle">Extra Tips</div>
                <ul className="list">
                  {(result.plan.tips || []).map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}