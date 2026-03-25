import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getPlaceByIds } from "../data/states";
import "./PlaceDetails.css";

export default function PlaceDetails() {
  const { stateId, placeId } = useParams();
  const navigate = useNavigate();
  const data = useMemo(() => getPlaceByIds(stateId, placeId), [stateId, placeId]);

  if (!data) {
    return (
      <div className="container placePage">
        <div className="card placeNotFound">
          <h2>Place not found</h2>
          <p>This place page is missing. Please check the route or data.</p>
          <button className="btn btn-primary" onClick={() => navigate("/explore")}>
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  const { state, place } = data;

  return (
    <div className="container placePage">
      <section className="placeHero card">
        <img src={place.image} alt={place.name} className="placeHeroImg" />

        <div className="placeHeroOverlay">
          <div className="placeHeroLeft">
            <span>{state.name}</span>
            <h1>{place.name}</h1>
            <p>{place.short}</p>
          </div>

          <div className="placeHeroRight">
            <div className="card">
              <strong>{place.tag}</strong>
              <span>Category</span>
            </div>
            <div className="card">
              <strong>{place.bestTime}</strong>
              <span>Best Time</span>
            </div>
            <div className="card">
              <strong>₹{place.budgetPerDay}</strong>
              <span>Avg / day</span>
            </div>
          </div>
        </div>
      </section>

      <section className="placeMainGrid">
        <div className="card placeContent">
          <h3>Why {place.name} is famous</h3>
          <p>{place.whyFamous}</p>

          <h3>Top attractions</h3>
          <div className="placeChipWrap">
            {place.topAttractions.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>

          <h3>Ideal for</h3>
          <div className="placeChipWrap">
            {place.idealFor.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </div>

        <div className="card placeQuickInfo">
          <h3>Quick Info</h3>
          <div className="placeInfoList">
            <div>
              <label>State</label>
              <strong>{state.name}</strong>
            </div>
            <div>
              <label>Region</label>
              <strong>{state.region}</strong>
            </div>
            <div>
              <label>Best Time</label>
              <strong>{place.bestTime}</strong>
            </div>
            <div>
              <label>Budget</label>
              <strong>₹{place.budgetPerDay} / day</strong>
            </div>
            <div>
              <label>Travel Type</label>
              <strong>{place.tag}</strong>
            </div>
          </div>

          <button
            className="btn btn-primary placePlanBtn"
            onClick={() =>
              navigate(`/planner?state=${encodeURIComponent(state.name)}&place=${encodeURIComponent(place.name)}`)
            }
          >
            Plan trip for {place.name}
          </button>
        </div>
      </section>

      <section className="placeGallerySection">
        <div className="sectionHead">
          <div>
            <h2>Photo Gallery</h2>
            <p>Large image layout for a richer destination look.</p>
          </div>
          <button className="btn" onClick={() => navigate(`/explore/${state.id}`)}>
            Back to {state.name}
          </button>
        </div>

        <div className="placeGalleryGrid">
          {place.gallery.map((img, index) => (
            <div className="placeGalleryItem card" key={`${place.id}-${index}`}>
              <img src={img} alt={`${place.name} ${index + 1}`} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}