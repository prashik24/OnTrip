import { Link } from "react-router-dom";
import "./PlaceMiniCard.css";

export default function PlaceMiniCard({ stateId, place }) {
  return (
    <Link to={`/explore/${stateId}/${place.id}`} className="placeMiniCard">
      <div className="placeMiniCardImageWrap">
        <img src={place.image} alt={place.name} className="placeMiniCardImage" />
        <div className="placeMiniCardTag">{place.tag}</div>
      </div>

      <div className="placeMiniCardBody">
        <h4>{place.name}</h4>
        <p>{place.short}</p>

        <div className="placeMiniCardMeta">
          <div>
            <strong>Best Time</strong>
            <span>{place.bestTime}</span>
          </div>

          <div>
            <strong>Duration</strong>
            <span>{place.idealDuration}</span>
          </div>
        </div>

        <div className="placeMiniCardAttractions">
          {place.topAttractions.slice(0, 3).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="placeMiniCardAction">View Details</div>
      </div>
    </Link>
  );
}