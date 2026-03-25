import "./PlaceMiniCard.css";

export default function PlaceMiniCard({ place, onOpen }) {
  return (
    <article className="placeMiniCard card" onClick={() => onOpen(place)}>
      <div className="placeMiniImg">
        <img src={place.image} alt={place.name} />
        <span>{place.tag}</span>
      </div>

      <div className="placeMiniBody">
        <div className="placeMiniTop">
          <h4>{place.name}</h4>
          <strong>₹{place.budgetPerDay}</strong>
        </div>

        <p>{place.short}</p>

        <div className="placeMiniMeta">
          <span>{place.bestTime}</span>
          <span>{place.topAttractions?.length || 0} highlights</span>
        </div>

        <button className="btn btn-primary">View Details</button>
      </div>
    </article>
  );
}