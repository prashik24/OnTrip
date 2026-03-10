import { useMemo, useState } from "react";
import PlaceCard from "../components/PlaceCard";
import { places } from "../data/places";
import "./Explore.css";
import { useNavigate } from "react-router-dom";

export default function Explore() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");
  const navigate = useNavigate();

  const tags = useMemo(() => ["All", ...Array.from(new Set(places.map(p => p.tag)))], []);

  const filtered = useMemo(() => {
    return places.filter((p) => {
      const okTag = tag === "All" || p.tag === tag;
      const okQ =
        q.trim() === "" ||
        (p.name + " " + p.region + " " + p.short).toLowerCase().includes(q.toLowerCase());
      return okTag && okQ;
    });
  }, [q, tag]);

  function onSelect(place) {
    // for now, take user to planner with a “prefill” query param
    navigate(`/planner?place=${encodeURIComponent(place.name)}`);
  }

  return (
    <div className="container explore">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Explore Places</h2>
          <p className="pageSub">
            Catalog of famous + hidden places. Later this will be powered by AI + real community ratings.
          </p>
        </div>

        <div className="filters card">
          <input
            className="input"
            placeholder="Search city, region, vibes..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select className="select" value={tag} onChange={(e) => setTag(e.target.value)}>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="gridPlaces">
        {filtered.map((p) => (
          <PlaceCard key={p.id} place={p} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
