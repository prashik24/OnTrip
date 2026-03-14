import { useMemo, useState } from "react";
import PlaceCard from "../components/PlaceCard";
import CustomSelect from "../components/CustomSelect";
import { places } from "../data/places";
import "./Explore.css";
import { useNavigate } from "react-router-dom";

export default function Explore() {
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("All");
  const navigate = useNavigate();

  const tags = useMemo(
    () => ["All", ...Array.from(new Set(places.map((p) => p.tag)))],
    []
  );

  const tagOptions = tags.map((t) => ({
    label: t,
    value: t,
  }));

  const filtered = useMemo(() => {
    return places.filter((p) => {
      const okTag = tag === "All" || p.tag === tag;
      const okQ =
        q.trim() === "" ||
        (p.name + " " + p.region + " " + p.short)
          .toLowerCase()
          .includes(q.toLowerCase());
      return okTag && okQ;
    });
  }, [q, tag]);

  function onSelect(place) {
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

          <CustomSelect
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            options={tagOptions}
          />
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