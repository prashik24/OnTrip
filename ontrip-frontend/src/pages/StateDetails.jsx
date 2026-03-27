import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PlaceMiniCard from "../components/PlaceMiniCard";
import { getStateById } from "../data/states";
import "./StateDetails.css";

export default function StateDetails() {
  const { stateId } = useParams();
  const navigate = useNavigate();
  const state = useMemo(() => getStateById(stateId), [stateId]);

  if (!state) {
    return (
      <div className="container statePage">
        <div className="card stateNotFound">
          <h2>State not found</h2>
          <p>This state page is missing. Please check the route or data.</p>
          <button className="btn btn-primary" onClick={() => navigate("/explore")}>
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container statePage">
      <section className="stateHero card">
        <img src={state.image} alt={state.name} className="stateHeroImg" />

        <div className="stateHeroOverlay">
          <div className="stateHeroHead">
            <span>{state.region}</span>
            <h1>{state.name}</h1>
            <p>{state.short}</p>
          </div>
        </div>
      </section>

      <section className="stateInfoGrid">
        <div className="card stateAbout">
          <h3>About {state.name}</h3>
          <p>{state.short}</p>
          <p>{state.whyFamous}</p>
        </div>

        <div className="card stateSideInfo">
          <h3>Highlights</h3>
          <div className="stateChipWrap">
            {state.highlights.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <h3>Famous Food</h3>
          <div className="stateChipWrap">
            {state.famousFood.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="statePlacesSection">
        <div className="sectionHead">
          <div>
            <h2>Top places in {state.name}</h2>
            <p>Open any place to view image gallery, best time, duration and attractions.</p>
          </div>
          <button className="btn" onClick={() => navigate("/planner")}>
            Plan My Trip
          </button>
        </div>

        <div className="statePlacesGrid">
          {state.places.map((place) => (
            <PlaceMiniCard key={place.id} stateId={state.id} place={place} />
          ))}
        </div>
      </section>
    </div>
  );
}