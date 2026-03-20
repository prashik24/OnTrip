import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import CustomSelect from "../components/CustomSelect";
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
    <div className="container plannerPage">
      <div className="plannerHead">
        <div>
          <h1>AI Trip Planner</h1>
          <p>
            Generate itinerary, travel suggestions, and provider
            recommendations based on your destination.
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

          <div className="plannerField">
            <label>Start City (optional)</label>
            <input
              className="plannerInput"
              value={form.startCity}
              onChange={(e) => update("startCity", e.target.value)}
              placeholder="e.g., Delhi"
            />
          </div>

          <button className="plannerPrimaryBtn" onClick={generatePlan}>
            Generate AI Plan
          </button>
        </div>

        <div className="plannerResultCard">
          <div className="plannerSectionTitle">Generated Plan</div>

          {!result?.plan ? (
            <div className="plannerEmpty">
              Enter trip details and generate a plan to see AI itinerary and
              provider recommendations.
            </div>
          ) : (
            <>
              <div className="plannerPlanTitle">{result.plan.title}</div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Trip Summary</div>
                <div className="plannerMutedBox">{result.plan.summary}</div>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Why this plan</div>
                <div className="plannerMutedBox">
                  {result.plan.whyRecommended}
                </div>
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
                <div className="plannerBlockTitle">Budget breakdown</div>
                <ul className="plannerList">
                  {(result.plan.budgetBreakdown || []).map((item, idx) => (
                    <li key={idx}>
                      {item.label}: ₹{item.amount}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">Transport advice</div>
                <div className="plannerMutedBox">
                  {result.plan.transportAdvice}
                </div>
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">
                  Recommended Travel Planners
                </div>
                {result.recommendedTravelProviders?.length ? (
                  <div className="plannerProviderGrid">
                    {result.recommendedTravelProviders.map((item) => (
                      <div className="plannerProviderCard" key={item._id}>
                        <div className="plannerProviderTitle">
                          {item.businessName}
                        </div>
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
                  <div className="plannerMutedBox">
                    No matching travel planners found.
                  </div>
                )}
              </div>

              <div className="plannerBlock">
                <div className="plannerBlockTitle">
                  Recommended Vehicle Services
                </div>
                {result.recommendedVehicleProviders?.length ? (
                  <div className="plannerProviderGrid">
                    {result.recommendedVehicleProviders.map((item) => (
                      <div className="plannerProviderCard" key={item._id}>
                        <div className="plannerProviderTitle">
                          {item.businessName}
                        </div>
                        <div className="plannerProviderMeta">
                          {item.city} • ⭐ {item.ratingAverage || 0}
                        </div>
                        <div className="plannerProviderText">
                          {(item.vehicles || [])
                            .slice(0, 2)
                            .map(
                              (vehicle) =>
                                `${vehicle.title || vehicle.vehicleType} - ₹${
                                  vehicle.price
                                }`
                            )
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
                  <div className="plannerMutedBox">
                    No matching vehicle providers found.
                  </div>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}