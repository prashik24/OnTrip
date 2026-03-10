import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import "./Planner.css";

export default function Planner() {
  const [params] = useSearchParams();
  const prefillPlace = params.get("place") || "";

  const [form, setForm] = useState({
    destination: prefillPlace,
    days: 4,
    budget: 8000,
    travelStyle: "Balanced",
    startCity: "",
  });

  const mockPlan = useMemo(() => {
    if (!form.destination.trim()) return null;

    return {
      title: `AI Trip Plan for ${form.destination}`,
      routeOrder: [
        "Day 1: Main city highlights + evening market",
        "Day 2: Fort/Monuments + hidden street food lane",
        "Day 3: Nature/Day-trip spot + sunset viewpoint",
        "Day 4: Cultural spots + shopping + return",
      ],
      transport: [
        "Within city: metro / shared auto / local cab",
        "Intercity: train preferred for budget; flight for time",
        "Local day trips: shared cab or bus",
      ],
      whyFamous:
        "History, architecture, culture, local crafts, food and a few hidden gems curated by AI.",
      safetyTips: [
        "Verify local taxi prices with community posts",
        "Prefer prepaid counters at stations",
        "Avoid unknown agents for hotel/hostel deals",
      ],
    };
  }, [form.destination]);

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  return (
    <div className="container planner">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">AI Trip Planner (Frontend Prototype)</h2>
          <p className="pageSub">
            Later we’ll connect GPT to generate real itineraries + travel options + hidden places + history.
          </p>
        </div>
      </div>

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
                onChange={(e) => update("days", Number(e.target.value))}
              />
            </div>
            <div>
              <label className="label">Budget (₹)</label>
              <input
                className="input"
                type="number"
                min="1000"
                value={form.budget}
                onChange={(e) => update("budget", Number(e.target.value))}
              />
            </div>
          </div>

          <label className="label">Start City (optional)</label>
          <input
            className="input"
            value={form.startCity}
            onChange={(e) => update("startCity", e.target.value)}
            placeholder="e.g., Delhi"
          />

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

          <button className="btn btnPrimary planBtn">
            Generate Plan (connect GPT later)
          </button>
        </div>

        <div className="card planCard">
          <div className="sectionTitle">Generated Plan</div>

          {!mockPlan ? (
            <div className="empty">
              Enter a destination to see a sample plan layout.
            </div>
          ) : (
            <>
              <div className="planTitle">{mockPlan.title}</div>

              <div className="planBlock">
                <div className="blockTitle">Best travel order</div>
                <ul className="list">
                  {mockPlan.routeOrder.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Transport options</div>
                <ul className="list">
                  {mockPlan.transport.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Why it’s famous</div>
                <div className="mutedBox">{mockPlan.whyFamous}</div>
              </div>

              <div className="planBlock">
                <div className="blockTitle">Anti-cheat tips</div>
                <ul className="list">
                  {mockPlan.safetyTips.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>

              <div className="note">
                Next step: backend + GPT call + save plan + share plan in community.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
