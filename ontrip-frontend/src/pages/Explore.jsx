import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import CustomSelect from "../components/CustomSelect";
import StateCard from "../components/StateCard";
import { states } from "../data/states";
import "./Explore.css";

export default function Explore() {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("All");
  const navigate = useNavigate();

  const regions = useMemo(
    () => ["All", ...Array.from(new Set(states.map((item) => item.region)))],
    []
  );

  const regionOptions = regions.map((item) => ({
    label: item,
    value: item,
  }));

  const filtered = useMemo(() => {
    return states.filter((state) => {
      const okRegion = region === "All" || state.region === region;
      const query = q.trim().toLowerCase();

      const okQuery =
        query === "" ||
        [
          state.name,
          state.region,
          state.tagline,
          state.short,
          state.whyFamous,
          ...(state.highlights || []),
          ...(state.famousFood || []),
          ...state.places.map((place) => place.name),
          ...state.places.map((place) => place.tag),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);

      return okRegion && okQuery;
    });
  }, [q, region]);

  function onOpenState(state) {
    navigate(`/explore/${state.id}`);
  }

  return (
    <div className="container explorePage">
      <section className="exploreHero card">
        <div className="exploreHeroText">
          <span className="exploreEyebrow">Discover India</span>
          <h1>Explore every Indian state with state-wise places and full details</h1>
          <p>
            Browse all states of India, open each state, then view top subplaces,
            photos, travel info, best time, budget and famous highlights.
          </p>
        </div>

        <div className="exploreFilters card">
          <input
            className="input"
            placeholder="Search state, place, food, vibe..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <CustomSelect
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            options={regionOptions}
          />
        </div>
      </section>

      <section className="exploreStats">
        <div className="card exploreStat">
          <strong>{states.length}</strong>
          <span>States</span>
        </div>
        <div className="card exploreStat">
          <strong>{states.reduce((acc, item) => acc + item.places.length, 0)}</strong>
          <span>Subplaces</span>
        </div>
        <div className="card exploreStat">
          <strong>{filtered.length}</strong>
          <span>Shown now</span>
        </div>
      </section>

      <section className="stateGrid">
        {filtered.map((state) => (
          <StateCard key={state.id} state={state} onOpen={onOpenState} />
        ))}
      </section>
    </div>
  );
}