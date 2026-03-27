import { useMemo, useState } from "react";
import { states } from "../data/states";
import StateCard from "../components/StateCard";
import CustomSelect from "../components/CustomSelect";
import "./Explore.css";

const placeTypeOptions = [
  { value: "all", label: "All places" },
  { value: "heritage", label: "Heritage" },
  { value: "beach", label: "Beach" },
  { value: "mountain", label: "Mountain" },
  { value: "spiritual", label: "Spiritual" },
  { value: "city", label: "City" },
  { value: "nature", label: "Nature" },
  { value: "adventure", label: "Adventure" },
];

export default function Explore() {
  const [query, setQuery] = useState("");
  const [placeType, setPlaceType] = useState("all");

  const filteredStates = useMemo(() => {
    const q = query.trim().toLowerCase();

    return states.filter((state) => {
      const searchHaystack = [
        state.name,
        state.region,
        state.tag,
        state.short,
        state.whyFamous,
        ...(state.highlights || []),
        ...(state.places || []).flatMap((place) => [
          place.name,
          place.tag,
          place.short,
          place.whyFamous,
          ...(place.topAttractions || []),
        ]),
      ]
        .join(" ")
        .toLowerCase();

      const matchesQuery = !q || searchHaystack.includes(q);

      const matchesType =
        placeType === "all" ||
        state.tag?.toLowerCase().includes(placeType) ||
        (state.highlights || []).some((item) =>
          item.toLowerCase().includes(placeType)
        ) ||
        (state.places || []).some(
          (place) =>
            place.tag?.toLowerCase().includes(placeType) ||
            place.short?.toLowerCase().includes(placeType) ||
            place.whyFamous?.toLowerCase().includes(placeType)
        );

      return matchesQuery && matchesType;
    });
  }, [query, placeType]);

  return (
    <div className="container explorePage">
      <div className="exploreHero">
        <div className="exploreHeroContent">
          <div className="exploreHeroBadge">Explore India</div>
          <h1>Discover states, cities, and iconic destinations</h1>
          <p>
            Explore rich culture, beaches, mountains, spiritual cities, food
            trails, nature escapes, and heritage destinations across India.
          </p>

          <div className="exploreFiltersRow">
            <div className="exploreSearchWrap">
              <input
                className="exploreSearch"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search states or places"
              />
            </div>

            <div className="exploreTypeWrap">
              <CustomSelect
                value={placeType}
                onChange={(e) => setPlaceType(e.target.value)}
                options={placeTypeOptions}
                placeholder="Choose type"
                name="placeType"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="exploreSection">
        <div className="exploreSectionHead">
          <div>
            <h2>Popular Indian States</h2>
            <p>Browse states and open a deeper page to explore more subplaces.</p>
          </div>
        </div>

        {filteredStates.length ? (
          <div className="exploreStateGrid">
            {filteredStates.map((state) => (
              <StateCard key={state.id} state={state} />
            ))}
          </div>
        ) : (
          <div className="exploreEmpty">No matching state or place found.</div>
        )}
      </div>
    </div>
  );
}