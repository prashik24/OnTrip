import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import "./Providers.css";

const VEHICLE_OPTIONS = ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"];

export default function Providers() {
  const navigate = useNavigate();
  const user = getUser();

  const [providers, setProviders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [myProviders, setMyProviders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [filters, setFilters] = useState({
    q: "",
    city: "",
    type: "",
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  const [form, setForm] = useState({
    businessName: "",
    providerCategory: "vehicle",
    serviceTitle: "",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    description: "",
    pricingText: "",
    priceFrom: "",
    capacity: "",
    withDriver: false,
    deliveryAvailable: false,
    vehicleTypes: [],
    images: [],
    existingImages: [],
  });

  const [msg, setMsg] = useState({ text: "", type: "" });

  const selectedProvider = useMemo(
    () => providers.find((item) => item._id === selected) || null,
    [providers, selected]
  );

  const isOwnerOfSelected =
    user && selectedProvider && String(selectedProvider.owner?._id || selectedProvider.owner) === String(user.id);

  function setMessage(text, type = "success") {
    setMsg({ text, type });
  }

  function clearMessage() {
    setMsg({ text: "", type: "" });
  }

  async function loadProviders() {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.city) params.set("city", filters.city);
      if (filters.type) params.set("type", filters.type);

      const data = await apiFetch(`/api/providers?${params.toString()}`);
      setProviders(data.providers || []);
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function loadMyProviders() {
    if (!isLoggedIn()) return;
    try {
      const data = await apiFetch("/api/providers/mine");
      setMyProviders(data.providers || []);
    } catch {
      // ignore
    }
  }

  async function loadReviews(providerId) {
    try {
      const data = await apiFetch(`/api/reviews/${providerId}`);
      setReviews(data.reviews || []);
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  useEffect(() => {
    loadProviders();
    loadMyProviders();
  }, []);

  async function handleSearch(e) {
    e.preventDefault();
    clearMessage();
    await loadProviders();
  }

  function toggleVehicleType(type) {
    setForm((prev) => {
      const exists = prev.vehicleTypes.includes(type);
      return {
        ...prev,
        vehicleTypes: exists
          ? prev.vehicleTypes.filter((x) => x !== type)
          : [...prev.vehicleTypes, type],
      };
    });
  }

  function resetForm() {
    setForm({
      businessName: "",
      providerCategory: "vehicle",
      serviceTitle: "",
      city: "",
      state: "",
      phone: "",
      whatsapp: "",
      description: "",
      pricingText: "",
      priceFrom: "",
      capacity: "",
      withDriver: false,
      deliveryAvailable: false,
      vehicleTypes: [],
      images: [],
      existingImages: [],
    });
    setEditingId(null);
  }

  function openCreateForm() {
    if (!isLoggedIn()) {
      setMessage("Please login first to register as a provider.", "error");
      navigate("/login");
      return;
    }
    resetForm();
    clearMessage();
    setShowForm(true);
  }

  function openEditForm(item) {
    setForm({
      businessName: item.businessName || "",
      providerCategory: item.providerCategory || "vehicle",
      serviceTitle: item.serviceTitle || "",
      city: item.city || "",
      state: item.state || "",
      phone: item.phone || "",
      whatsapp: item.whatsapp || "",
      description: item.description || "",
      pricingText: item.pricingText || "",
      priceFrom: item.priceFrom || "",
      capacity: item.capacity || "",
      withDriver: !!item.withDriver,
      deliveryAvailable: !!item.deliveryAvailable,
      vehicleTypes: item.vehicleTypes || [],
      images: [],
      existingImages: item.images || [],
    });
    setEditingId(item._id);
    clearMessage();
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function removeExistingImage(index) {
    setForm((prev) => ({
      ...prev,
      existingImages: prev.existingImages.filter((_, i) => i !== index),
    }));
  }

  async function submitProvider(e) {
    e.preventDefault();

    if (!isLoggedIn()) {
      setMessage("Please login first to register as a provider.", "error");
      navigate("/login");
      return;
    }

    try {
      clearMessage();

      const fd = new FormData();
      fd.append("businessName", form.businessName);
      fd.append("providerCategory", form.providerCategory);
      fd.append("serviceTitle", form.serviceTitle);
      fd.append("city", form.city);
      fd.append("state", form.state);
      fd.append("phone", form.phone);
      fd.append("whatsapp", form.whatsapp);
      fd.append("description", form.description);
      fd.append("pricingText", form.pricingText);
      fd.append("priceFrom", form.priceFrom);
      fd.append("capacity", form.capacity);
      fd.append("withDriver", form.withDriver);
      fd.append("deliveryAvailable", form.deliveryAvailable);
      fd.append("vehicleTypes", JSON.stringify(form.vehicleTypes));
      fd.append("existingImages", JSON.stringify(form.existingImages));

      Array.from(form.images || []).forEach((file) => {
        fd.append("images", file);
      });

      const url = editingId ? `/api/providers/${editingId}` : "/api/providers";
      const method = editingId ? "PUT" : "POST";

      const data = await apiFetch(url, {
        method,
        body: fd,
      });

      setMessage(data.message, "success");
      setShowForm(false);
      resetForm();
      await loadProviders();
      await loadMyProviders();
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function submitReview(e) {
    e.preventDefault();

    if (!selectedProvider) return;

    try {
      clearMessage();

      const data = await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          providerId: selectedProvider._id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        }),
      });

      setMessage(data.message, "success");
      setReviewForm({ rating: 5, comment: "" });
      await loadReviews(selectedProvider._id);
      await loadProviders();
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  return (
    <div className="container providersPlatformPage">
      <div className="providersHero card">
        <div>
          <h1 className="providersHeroTitle">Verified Service Providers</h1>
          <p className="providersHeroSub">
            Discover vehicle rentals and travel services in a clean, trusted marketplace.
          </p>
        </div>

        <div className="providersHeroActions">
          <button className="btn btnPrimary" onClick={openCreateForm}>
            Register as Provider
          </button>
          {isLoggedIn() && (
            <button className="btn" onClick={() => navigate("/profile")}>
              Go to Profile
            </button>
          )}
        </div>
      </div>

      {msg.text && (
        <div className={`providerNotice ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="providerFormCard card">
          <div className="providerFormHead">
            <div>
              <h2 className="providerSectionTitle">
                {editingId ? "Edit Provider Listing" : "Create Provider Listing"}
              </h2>
              <p className="providerSectionSub">
                Only logged-in users can create provider listings.
              </p>
            </div>

            <button className="btn" onClick={() => setShowForm(false)} type="button">
              Close
            </button>
          </div>

          <form className="providerFormGrid" onSubmit={submitProvider}>
            <div className="providerFieldFull">
              <label className="label">Business Name</label>
              <input
                className="input"
                value={form.businessName}
                onChange={(e) => setForm((s) => ({ ...s, businessName: e.target.value }))}
                placeholder="Example: City Wheels Rentals"
                required
              />
            </div>

            <div>
              <label className="label">Category</label>
              <select
                className="select"
                value={form.providerCategory}
                onChange={(e) =>
                  setForm((s) => ({ ...s, providerCategory: e.target.value }))
                }
              >
                <option value="vehicle">Vehicle</option>
                <option value="service">Service</option>
              </select>
            </div>

            <div>
              <label className="label">Service Title</label>
              <input
                className="input"
                value={form.serviceTitle}
                onChange={(e) => setForm((s) => ({ ...s, serviceTitle: e.target.value }))}
                placeholder="Optional short title"
              />
            </div>

            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">State</label>
              <input
                className="input"
                value={form.state}
                onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                required
              />
            </div>

            <div>
              <label className="label">WhatsApp</label>
              <input
                className="input"
                value={form.whatsapp}
                onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Price From</label>
              <input
                className="input"
                type="number"
                value={form.priceFrom}
                onChange={(e) => setForm((s) => ({ ...s, priceFrom: e.target.value }))}
              />
            </div>

            <div>
              <label className="label">Capacity</label>
              <input
                className="input"
                type="number"
                value={form.capacity}
                onChange={(e) => setForm((s) => ({ ...s, capacity: e.target.value }))}
              />
            </div>

            <div className="providerFieldFull">
              <label className="label">Pricing Summary</label>
              <input
                className="input"
                value={form.pricingText}
                onChange={(e) => setForm((s) => ({ ...s, pricingText: e.target.value }))}
                placeholder="Example: Car from ₹1800/day, Bike from ₹500/day"
              />
            </div>

            <div className="providerFieldFull">
              <label className="label">Description</label>
              <textarea
                className="textarea"
                rows={4}
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                placeholder="Describe your service professionally"
              />
            </div>

            <div className="providerFieldFull">
              <label className="label">Vehicle Types</label>
              <div className="vehicleTypeGrid">
                {VEHICLE_OPTIONS.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={
                      form.vehicleTypes.includes(type)
                        ? "vehicleTypeBtn active"
                        : "vehicleTypeBtn"
                    }
                    onClick={() => toggleVehicleType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="providerChecks providerFieldFull">
              <label className="providerCheckItem">
                <input
                  type="checkbox"
                  checked={form.withDriver}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, withDriver: e.target.checked }))
                  }
                />
                <span>Available with driver</span>
              </label>

              <label className="providerCheckItem">
                <input
                  type="checkbox"
                  checked={form.deliveryAvailable}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, deliveryAvailable: e.target.checked }))
                  }
                />
                <span>Delivery available</span>
              </label>
            </div>

            <div className="providerFieldFull">
              <label className="label">Upload Images</label>
              <input
                className="input"
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setForm((s) => ({ ...s, images: e.target.files }))}
              />
              <div className="providerFieldHint">
                Upload multiple clear images for a professional listing.
              </div>
            </div>

            {form.existingImages.length > 0 && (
              <div className="providerFieldFull">
                <label className="label">Current Images</label>
                <div className="providerImageGrid">
                  {form.existingImages.map((img, index) => (
                    <div key={`${img.url}-${index}`} className="providerImageItem">
                      <img src={img.url} alt="Provider" />
                      <button
                        type="button"
                        className="removeImageBtn"
                        onClick={() => removeExistingImage(index)}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="providerFormActions providerFieldFull">
              <button className="btn btnPrimary" type="submit">
                {editingId ? "Save Listing" : "Create Listing"}
              </button>
            </div>
          </form>
        </div>
      )}

      {myProviders.length > 0 && (
        <div className="providerOwnedSection">
          <div className="providerSectionHeader">
            <h2 className="providerSectionTitle">My Listings</h2>
          </div>

          <div className="providerCardGrid">
            {myProviders.map((item) => (
              <article key={item._id} className="providerCard card">
                <div className="providerCardTop">
                  <div>
                    <div className="providerCardTitle">{item.businessName}</div>
                    <div className="providerCardMeta">{item.city}</div>
                  </div>
                  <button className="btn" onClick={() => openEditForm(item)}>
                    Edit
                  </button>
                </div>

                <div className="providerTagRow">
                  {(item.vehicleTypes || []).map((type) => (
                    <span className="providerTag" key={type}>
                      {type}
                    </span>
                  ))}
                </div>

                <div className="providerCardDesc">{item.description}</div>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="providerSearchCard card">
        <form className="providerSearchGrid" onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="Search business or service"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />
          <input
            className="input"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters((s) => ({ ...s, city: e.target.value }))}
          />
          <select
            className="select"
            value={filters.type}
            onChange={(e) => setFilters((s) => ({ ...s, type: e.target.value }))}
          >
            <option value="">All vehicle types</option>
            {VEHICLE_OPTIONS.map((type) => (
              <option value={type} key={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="btn btnPrimary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="providerCardGrid">
        {providers.map((item) => (
          <article key={item._id} className="providerCard card">
            <div className="providerCardMedia">
              {item.images?.[0]?.url ? (
                <img src={item.images[0].url} alt={item.businessName} />
              ) : (
                <div className="providerCardMediaEmpty">No Image</div>
              )}
            </div>

            <div className="providerCardBody">
              <div className="providerCardHeader">
                <div>
                  <div className="providerCardTitle">{item.businessName}</div>
                  <div className="providerCardMeta">
                    {item.city} • by {item.owner?.name || "Provider"}
                  </div>
                </div>

                <div className="providerRatingBox">
                  ⭐ {item.ratingAverage || 0} <span>({item.ratingCount || 0})</span>
                </div>
              </div>

              <div className="providerTagRow">
                {(item.vehicleTypes || []).map((type) => (
                  <span className="providerTag" key={type}>
                    {type}
                  </span>
                ))}
              </div>

              <div className="providerPriceText">
                {item.pricingText || (item.priceFrom ? `From ₹${item.priceFrom}` : "Price on request")}
              </div>

              <p className="providerCardDesc">
                {item.description || "No description provided."}
              </p>

              <div className="providerCardActions">
                <button
                  className="btn"
                  onClick={async () => {
                    setSelected(item._id);
                    await loadReviews(item._id);
                  }}
                >
                  View Details
                </button>

                {user && String(item.owner?._id || item.owner) === String(user.id) && (
                  <button className="btn" onClick={() => openEditForm(item)}>
                    Edit
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>

      {selectedProvider && (
        <div className="providerDetailCard card">
          <div className="providerDetailHead">
            <div>
              <h2 className="providerSectionTitle">{selectedProvider.businessName}</h2>
              <p className="providerSectionSub">
                {selectedProvider.city} • {selectedProvider.phone}
              </p>
            </div>
          </div>

          <div className="providerImageGrid">
            {(selectedProvider.images || []).map((img, index) => (
              <div key={`${img.url}-${index}`} className="providerImageItem">
                <img src={img.url} alt={`${selectedProvider.businessName}-${index}`} />
              </div>
            ))}
          </div>

          <div className="providerDetailDesc">{selectedProvider.description}</div>

          <div className="providerTagRow">
            {(selectedProvider.vehicleTypes || []).map((type) => (
              <span key={type} className="providerTag">
                {type}
              </span>
            ))}
          </div>

          <div className="providerReviewSection">
            <div className="providerSectionHeader">
              <h3 className="providerSectionTitle">Reviews</h3>
            </div>

            {!isLoggedIn() ? (
              <div className="providerInlineNote">
                Please login to add a review.
              </div>
            ) : isOwnerOfSelected ? (
              <div className="providerInlineNote">
                You cannot review your own product or service.
              </div>
            ) : (
              <form className="providerReviewForm" onSubmit={submitReview}>
                <select
                  className="select"
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm((s) => ({ ...s, rating: e.target.value }))
                  }
                >
                  <option value={5}>5 stars</option>
                  <option value={4}>4 stars</option>
                  <option value={3}>3 stars</option>
                  <option value={2}>2 stars</option>
                  <option value={1}>1 star</option>
                </select>

                <textarea
                  className="textarea"
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm((s) => ({ ...s, comment: e.target.value }))
                  }
                  placeholder="Write your review"
                />

                <button className="btn btnPrimary" type="submit">
                  Submit Review
                </button>
              </form>
            )}

            <div className="providerReviewList">
              {reviews.length === 0 ? (
                <div className="providerInlineNote">No reviews yet.</div>
              ) : (
                reviews.map((review) => (
                  <div key={review._id} className="providerReviewItem">
                    <div className="providerReviewTop">
                      <div className="providerReviewer">
                        {review.user?.avatar ? (
                          <img src={review.user.avatar} alt={review.user.name} />
                        ) : (
                          <span className="providerReviewerFallback">
                            {review.user?.name?.charAt(0)?.toUpperCase() || "U"}
                          </span>
                        )}
                        <span>{review.user?.name || "User"}</span>
                      </div>
                      <div className="providerReviewRating">⭐ {review.rating}</div>
                    </div>
                    <div className="providerReviewText">{review.comment || "No comment"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}