import "./PlaceCard.css";

export default function PlaceCard({ place, onSelect }) {
  return (
    <article className="placeCard">
      <div className="placeTop">
        <div className="placeName">{place.name}</div>
        <div className="placeTag">{place.tag}</div>
      </div>

      <div className="placeMeta">
        <span className="pill">{place.region}</span>
        <span className="pill">Best: {place.bestTime}</span>
        <span className="pill">Budget: ₹{place.budgetPerDay}/day</span>
      </div>

      <div className="placeDesc">{place.short}</div>

      <div className="placeWhy">
        <div className="whyTitle">Why famous</div>
        <div className="whyText">{place.whyFamous}</div>
      </div>

      <div className="placeActions">
        <button className="btn btnPrimary" onClick={() => onSelect?.(place)}>
          Plan trip
        </button>
        <button className="btn" onClick={() => onSelect?.(place)}>
          See details
        </button>
      </div>
    </article>
  );
}
