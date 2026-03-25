import "./StateCard.css";

export default function StateCard({ state, onOpen }) {
  return (
    <article className="stateCard card" onClick={() => onOpen(state)}>
      <div className="stateCardMedia">
        <img src={state.coverImage} alt={state.name} />
        <span className="stateBadge">{state.region}</span>
      </div>

      <div className="stateCardBody">
        <div className="stateCardTop">
          <div>
            <h3>{state.name}</h3>
            <p>{state.tagline}</p>
          </div>
          <div className="statePrice">₹{state.budgetPerDay}/day</div>
        </div>

        <p className="stateShort">{state.short}</p>

        <div className="stateMeta">
          <span>Best Time: {state.bestTime}</span>
          <span>{state.places.length} places</span>
        </div>

        <div className="stateHighlights">
          {state.highlights.slice(0, 4).map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>

        <button className="btn btn-primary stateBtn">Explore State</button>
      </div>
    </article>
  );
}