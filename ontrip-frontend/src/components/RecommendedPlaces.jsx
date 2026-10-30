import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch, getUser } from "../lib/api";
import "./RecommendedPlaces.css";

export default function RecommendedPlaces({ initialTag = "" }) {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [engineSource, setEngineSource] = useState("");
  const [activeFilter, setActiveFilter] = useState(initialTag || "all");
  const user = getUser();

  const filterOptions = [
    { id: "all", label: "All Picks" },
    { id: "beach", label: "Beaches" },
    { id: "heritage", label: "Heritage" },
    { id: "mountain", label: "Mountains" },
    { id: "culture", label: "Spiritual & Culture" },
  ];

  useEffect(() => {
    let isMounted = true;
    async function fetchRecs() {
      setLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (activeFilter && activeFilter !== "all") {
          queryParams.append("tag", activeFilter);
        }
        queryParams.append("topK", "6");

        const data = await apiFetch(`/api/recommendations/places?${queryParams.toString()}`);
        if (isMounted && data.success) {
          setRecommendations(data.recommendations || []);
          setEngineSource(data.source || "hybrid-engine");
        }
      } catch (err) {
        console.warn("Could not fetch recommendations:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchRecs();
    return () => {
      isMounted = false;
    };
  }, [activeFilter]);

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="recsContainer">
      <div className="recsHeader">
        <div className="recsTitleArea">
          <div className="recsBadge">
            <span className="recsPulse" />
            AI & ML Personalization
          </div>
          <h2 className="recsTitle">
            {user ? `Curated For You, ${user.name || "Traveler"}` : "Smart Destination Recommendations"}
          </h2>
          <p className="recsSubtitle">
            Ranked using a hybrid content-similarity and behavioral interaction vector model.
          </p>
        </div>

        <div className="recsFilterBar">
          {filterOptions.map((f) => (
            <button
              key={f.id}
              className={`recsFilterBtn ${activeFilter === f.id ? "active" : ""}`}
              onClick={() => setActiveFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="recsGrid">
          {[1, 2, 3].map((n) => (
            <div key={n} className="recsCard recsSkeleton" />
          ))}
        </div>
      ) : (
        <div className="recsGrid">
          {recommendations.map((place) => (
            <div key={place.id} className="recsCard">
              <div className="recsImageWrap">
                <img
                  src={place.image || "/images/states/rajasthan-cover.jpg"}
                  alt={place.name}
                  className="recsImage"
                  onError={(e) => {
                    e.target.src = "/images/states/rajasthan-cover.jpg";
                  }}
                />
                <div className="recsOverlay" />
                <div className="recsScoreBadge">
                  {place.matchScore}% Match
                </div>
                {place.tag && <div className="recsTag">{place.tag}</div>}
              </div>

              <div className="recsBody">
                <div className="recsPlaceHeader">
                  <div>
                    <h3 className="recsPlaceName">{place.name}</h3>
                    <span className="recsPlaceState">{place.state || place.region}</span>
                  </div>
                </div>

                <div className="recsReasonBox">
                  <span className="recsReasonText">{place.reason}</span>
                </div>

                <p className="recsShort">{place.short}</p>

                <div className="recsMetaRow">
                  <div className="recsMetaItem">
                    <span className="recsMetaLabel">Best Time</span>
                    <span className="recsMetaVal">{place.bestTime || "Year-round"}</span>
                  </div>
                  <div className="recsMetaItem">
                    <span className="recsMetaLabel">Duration</span>
                    <span className="recsMetaVal">{place.idealDuration || "2-3 Days"}</span>
                  </div>
                </div>

                <div className="recsActions">
                  <Link
                    to={place.stateId ? `/explore/${place.stateId}` : "/explore"}
                    className="recsBtnSecondary"
                  >
                    View Guide
                  </Link>
                  <Link
                    to={`/planner?destination=${encodeURIComponent(place.name)}`}
                    className="recsBtnPrimary"
                  >
                    Plan Trip
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="recsEngineFooter">
        <small>
          Vector Engine:{" "}
          <strong>{engineSource === "python-ml-fastapi" ? "FastAPI Microservice (Live)" : "Native Hybrid Vector Fallback (Zero-Downtime)"}</strong>
        </small>
      </div>
    </section>
  );
}
