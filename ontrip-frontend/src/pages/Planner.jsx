import { useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { isLoggedIn } from "../lib/api";
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
    interestFocus: [],
    priorityMode: "balanced",
  });

  const [msg, setMsg] = useState("");

  const travelStyleOptions = [
    { label: "Budget", value: "Budget" },
    { label: "Balanced", value: "Balanced" },
    { label: "Comfort", value: "Comfort" },
    { label: "Luxury", value: "Luxury" },
  ];

  const priorityOptions = [
    { label: "Cheapest Plan", value: "cheapest" },
    { label: "Fastest Plan", value: "fastest" },
    { label: "Family Plan", value: "family" },
    { label: "Solo Plan", value: "solo" },
    { label: "Food-Focused Plan", value: "food" },
    { label: "Balanced Plan", value: "balanced" },
  ];

  const interestOptions = [
    { label: "Historical", value: "historical" },
    { label: "Nature", value: "nature" },
    { label: "Temple", value: "temple" },
  ];

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleInterest(value) {
    setForm((prev) => {
      const exists = prev.interestFocus.includes(value);
      return {
        ...prev,
        interestFocus: exists
          ? prev.interestFocus.filter((x) => x !== value)
          : [...prev.interestFocus, value],
      };
    });
  }

  const budgetHint = useMemo(() => {
    const budget = Number(form.budget || 0);
    const days = Number(form.days || 1);
    const people = Number(form.peopleCount || 1);
    const perPersonPerDay = budget / Math.max(1, days * people);

    if (perPersonPerDay < 1200) {
      return {
        level: "warn",
        text: "This budget may be low for transport, stay, and food.",
      };
    }

    if (perPersonPerDay < 2500) {
      return {
        level: "ok",
        text: "This budget is workable for a basic or balanced trip.",
      };
    }

    return {
      level: "good",
      text: "This budget looks good for a comfortable trip.",
    };
  }, [form.budget, form.days, form.peopleCount]);

  function goNext() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (!form.destination.trim()) {
      setMsg("Please enter destination.");
      return;
    }

    sessionStorage.setItem("planner_form_data", JSON.stringify(form));
    navigate("/planner/result", { state: { form } });
  }

  return (
    <div className="container plannerPage">
      <div className="plannerHead">
        <div>
          <h1>AI Smart Trip Planner</h1>
          <p>
            Fill your trip details and generate the plan on the next page for a cleaner look.
          </p>
        </div>
      </div>

      {msg && <div className="plannerMessage">{msg}</div>}

      <div className="plannerSingleWrap">
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

          <div className={`plannerBudgetHint is-${budgetHint.level}`}>
            {budgetHint.text}
          </div>

          <div className="plannerField">
            <label>Focus your trip plan</label>
            <div className="plannerChipWrap">
              {interestOptions.map((item) => {
                const active = form.interestFocus.includes(item.value);
                return (
                  <button
                    key={item.value}
                    type="button"
                    className={`plannerChip ${active ? "isActive" : ""}`}
                    onClick={() => toggleInterest(item.value)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="plannerField">
            <label>Regenerate by priority</label>
            <CustomSelect
              value={form.priorityMode}
              onChange={(e) => update("priorityMode", e.target.value)}
              options={priorityOptions}
              placeholder="Select priority"
            />
          </div>

          <button className="plannerPrimaryBtn" onClick={goNext}>
            Generate Plan
          </button>
        </div>
      </div>
    </div>
  );
}