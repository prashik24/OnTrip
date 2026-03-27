import { Link } from "react-router-dom";
import "./StateCard.css";

export default function StateCard({ state }) {
  return (
    <Link to={`/explore/${state.id}`} className="stateCard">
      <div className="stateCardImageWrap">
        <img src={state.image} alt={state.name} className="stateCardImage" />
        <div className="stateCardOverlay" />
        <div className="stateCardTag">{state.tag}</div>
      </div>

      <div className="stateCardBody">
        <div className="stateCardTop">
          <h3>{state.name}</h3>
          <span>{state.region}</span>
        </div>

        <p className="stateCardShort">{state.short}</p>

        <div className="stateCardMeta">
          <div>
            <strong>Best Time</strong>
            <span>{state.bestTime}</span>
          </div>

          <div>
            <strong>Places</strong>
            <span>{state.places.length} destinations</span>
          </div>
        </div>

        <div className="stateCardHighlights">
          {state.highlights.slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <div className="stateCardAction">Explore State</div>
      </div>
    </Link>
  );
}