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
          <button className="placeBtn placeBtnPrimary" onClick={() => navigate("/explore")}>
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
        </div>
      </section>

      <section className="placeMainSingle">
        <div className="card placeCombinedCard">
          <div className="placeCombinedTop">
            <div className="placeContentBlock">
              <h3>Why {place.name} is famous</h3>
              <p>{place.whyFamous}</p>

              <div className="placeInnerSection">
                <h4>Top attractions</h4>
                <div className="placeChipWrap">
                  {place.topAttractions.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>

              <div className="placeInnerSection">
                <h4>Food to try</h4>
                <div className="placeChipWrap">
                  {place.food.map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="placeQuickBlock">
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
                  <label>Category</label>
                  <strong>{place.tag}</strong>
                </div>
                <div>
                  <label>Best Time</label>
                  <strong>{place.bestTime}</strong>
                </div>
                <div>
                  <label>Ideal Duration</label>
                  <strong>{place.idealDuration}</strong>
                </div>
                <div>
                  <label>Stay Area</label>
                  <strong>{place.stayArea}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="placeActionRow">
            <button
              className="placeBtn placeBtnPrimary"
              onClick={() =>
                navigate(
                  `/planner?state=${encodeURIComponent(state.name)}&place=${encodeURIComponent(place.name)}`
                )
              }
            >
              Plan trip for {place.name}
            </button>

            <button
              className="placeBtn placeBtnSecondary"
              onClick={() => navigate(`/explore/${state.id}`)}
            >
              Back to {state.name}
            </button>
          </div>
        </div>
      </section>

      <section className="placeGallerySection">
        <div className="sectionHead">
          <div>
            <h2>Photo Gallery</h2>
            <p>Explore more views of {place.name}.</p>
          </div>
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