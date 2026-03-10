import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./Providers.css";

export default function Providers() {
  const [providers, setProviders] = useState([]);
  const [providerType, setProviderType] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [msg, setMsg] = useState("");

  async function loadProviders() {
    try {
      setMsg("");

      const params = new URLSearchParams();
      if (providerType) params.set("providerType", providerType);
      if (city) params.set("city", city);
      if (q) params.set("q", q);

      const data = await apiFetch(`/api/providers?${params.toString()}`);
      setProviders(data.providers || []);
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function loadReviews(providerId) {
    try {
      const data = await apiFetch(`/api/reviews/${providerId}`);
      setReviews(data.reviews || []);
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    loadProviders();
  }, []);

  async function submitReview(e) {
    e.preventDefault();

    try {
      setMsg("");

      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          providerId: selectedId,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        }),
      });

      setReviewForm({ rating: 5, comment: "" });
      await loadReviews(selectedId);
      await loadProviders();
      setMsg("Review added successfully");
    } catch (err) {
      setMsg(err.message);
    }
  }

  const selectedProvider = providers.find((p) => p._id === selectedId);

  return (
    <div className="container providersPage">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Vehicle & Tour Providers</h2>
          <p className="pageSub">
            Find bus, jeep, car, bike, scooty, cycle services and tour planners with rating and reviews.
          </p>
        </div>

        <div className="filters card">
          <select
            className="select"
            value={providerType}
            onChange={(e) => setProviderType(e.target.value)}
          >
            <option value="">All Types</option>
            <option value="vehicle">Vehicle</option>
            <option value="tour">Tour</option>
          </select>

          <input
            className="input"
            placeholder="City"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          />

          <input
            className="input"
            placeholder="Search service..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />

          <button className="btn btnPrimary" onClick={loadProviders}>
            Search
          </button>
        </div>
      </div>

      {msg && <div className="note">{msg}</div>}

      <div className="providersGrid">
        {providers.map((p) => (
          <article key={p._id} className="providerCard card">
            <div className="providerTop">
              <div className="providerType">
                {p.providerType === "vehicle" ? "Vehicle" : "Tour"}
              </div>

              <div className="providerRating">
                ⭐ {p.ratingAverage || 0} ({p.ratingCount || 0})
              </div>
            </div>

            <div className="providerName">{p.businessName}</div>
            <div className="providerDesc">{p.description || "No description available."}</div>

            <div className="providerMeta">
              <span className="pill">{p.city}</span>
              <span className="pill">₹{p.price}</span>

              {p.providerType === "vehicle" ? (
                <>
                  <span className="pill">{p.vehicleType}</span>
                  <span className="pill">Capacity: {p.capacity}</span>
                  {p.withDriver && <span className="pill">With driver</span>}
                </>
              ) : (
                <>
                  <span className="pill">{p.tripMode}</span>
                  {p.durationText && <span className="pill">{p.durationText}</span>}
                </>
              )}
            </div>

            {p.providerType === "tour" && p.includes?.length > 0 && (
              <div className="providerIncludes">
                <div className="miniTitle">Includes</div>
                <div className="tagRow">
                  {p.includes.map((item, i) => (
                    <span className="tag" key={i}>{item}</span>
                  ))}
                </div>
              </div>
            )}

            <div className="providerActions">
              <button
                className="btn"
                onClick={async () => {
                  setSelectedId(p._id);
                  await loadReviews(p._id);
                }}
              >
                View Reviews
              </button>
            </div>
          </article>
        ))}
      </div>

      {selectedProvider && (
        <div className="reviewWrap card">
          <div className="sectionTitle">
            Reviews for {selectedProvider.businessName}
          </div>

          <form className="reviewForm" onSubmit={submitReview}>
            <select
              className="select"
              value={reviewForm.rating}
              onChange={(e) =>
                setReviewForm((s) => ({ ...s, rating: e.target.value }))
              }
            >
              <option value={5}>5 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={2}>2 Stars</option>
              <option value={1}>1 Star</option>
            </select>

            <textarea
              className="textarea"
              rows={3}
              placeholder="Write your review..."
              value={reviewForm.comment}
              onChange={(e) =>
                setReviewForm((s) => ({ ...s, comment: e.target.value }))
              }
            />

            <button className="btn btnPrimary" type="submit">
              Add Review
            </button>
          </form>

          <div className="reviewList">
            {reviews.length > 0 ? (
              reviews.map((r) => (
                <div key={r._id} className="reviewCard">
                  <div className="reviewHead">
                    <div className="reviewUser">{r.user?.name || "User"}</div>
                    <div className="reviewStars">⭐ {r.rating}</div>
                  </div>
                  <div className="reviewText">{r.comment || "No comment"}</div>
                </div>
              ))
            ) : (
              <div className="empty">No reviews yet.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}