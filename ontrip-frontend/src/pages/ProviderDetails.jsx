import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import "./Providers.css";

export default function ProviderDetails() {
  const { id } = useParams();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });

  const [bookingForm, setBookingForm] = useState({
    contactName: user?.name || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phone || "",
    bookingDate: "",
    peopleCount: 1,
    destination: "",
    notes: "",
    amount: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setMsg({ text: "", type: "" });

        const providerData = await apiFetch(`/api/providers/${id}`);
        setProvider(providerData.provider);

        const reviewData = await apiFetch(`/api/reviews/${id}`);
        setReviews(reviewData.reviews || []);
      } catch (err) {
        setMsg({ text: err.message || "Failed to load provider details", type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const isOwner = useMemo(() => {
    if (!provider || !user) return false;
    return String(provider.owner?._id || provider.owner) === String(user.id);
  }, [provider, user]);

  const defaultAmount = useMemo(() => {
    if (!provider) return 0;
    return provider.listingType === "vehicle"
      ? provider.vehicles?.[0]?.price || 0
      : provider.travelPlanner?.priceFrom || 0;
  }, [provider]);

  useEffect(() => {
    if (defaultAmount > 0) {
      setBookingForm((prev) => ({
        ...prev,
        amount: prev.amount || String(defaultAmount),
      }));
    }
  }, [defaultAmount]);

  async function submitReview(e) {
    e.preventDefault();

    try {
      const data = await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        }),
      });

      setMsg({ text: data.message, type: "success" });

      const reviewData = await apiFetch(`/api/reviews/${id}`);
      setReviews(reviewData.reviews || []);
      setReviewForm({ rating: 5, comment: "" });
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  async function startBookingPayment(e) {
    e.preventDefault();

    try {
      setMsg({ text: "", type: "" });

      const finalAmount = Number(bookingForm.amount || defaultAmount);

      const data = await apiFetch("/api/bookings/create-order", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          ...bookingForm,
          peopleCount: Number(bookingForm.peopleCount),
          amount: finalAmount,
        }),
      });

      const options = {
        key: data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "OnTrip",
        description: provider.businessName,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verify = await apiFetch("/api/bookings/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                bookingId: data.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            setMsg({ text: verify.message, type: "success" });
          } catch (err) {
            setMsg({ text: err.message, type: "error" });
          }
        },
        prefill: {
          name: bookingForm.contactName,
          email: bookingForm.contactEmail,
          contact: bookingForm.contactPhone,
        },
        theme: {
          color: "#00b8f1",
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    }
  }

  if (loading) {
    return (
      <div className="container providerPlatformPage">
        <div className="providerNote">Loading provider details...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="container providerPlatformPage">
        <div className={`providerMessage ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text || "Provider not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="container providerPlatformPage">
      {msg.text && (
        <div className={`providerMessage ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}

      <div className="providerDetail card">
        <div className="providerDetailTop">
          <div>
            <div className="providerSectionTitle">{provider.businessName}</div>
            <div className="providerMetaText">
              {provider.city} • {provider.phone}
            </div>
            <div className="providerTypeBadge">
              {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
            </div>
          </div>
        </div>

        <div className="providerDesc">
          {provider.description || "No description provided."}
        </div>

        {provider.listingType === "vehicle" ? (
          <div className="detailVehicleList">
            {provider.vehicles?.map((vehicle, index) => (
              <div className="detailVehicleCard" key={index}>
                <div className="detailVehicleHead">
                  <div className="detailVehicleTitle">
                    {vehicle.title || vehicle.vehicleType}
                  </div>
                  <div className="detailVehiclePrice">₹{vehicle.price}</div>
                </div>

                <div className="detailVehicleMeta">
                  Capacity: {vehicle.capacity || 1} • Fuel: {vehicle.fuelType || "N/A"} •{" "}
                  {vehicle.withDriver ? "With Driver" : "Without Driver"}
                </div>

                <div className="providerImageGrid">
                  {vehicle.images?.map((img, imgIndex) => (
                    <div className="providerImageItem" key={imgIndex}>
                      <img src={img.url} alt={vehicle.title || vehicle.vehicleType} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="plannerDetailBox">
            <div className="plannerTitle">
              {provider.travelPlanner?.packageTitle || "Travel Package"}
            </div>
            <div className="plannerMeta">
              {provider.travelPlanner?.plannerMode} • {provider.travelPlanner?.durationText} • ₹
              {provider.travelPlanner?.priceFrom || 0}
            </div>

            <div className="plannerInfoGrid">
              <div>
                <div className="plannerInfoTitle">Places Covered</div>
                <div className="plannerInfoText">
                  {(provider.travelPlanner?.placesCovered || []).join(", ") || "N/A"}
                </div>
              </div>

              <div>
                <div className="plannerInfoTitle">Inclusions</div>
                <div className="plannerInfoText">
                  {(provider.travelPlanner?.inclusions || []).join(", ") || "N/A"}
                </div>
              </div>

              <div>
                <div className="plannerInfoTitle">Exclusions</div>
                <div className="plannerInfoText">
                  {(provider.travelPlanner?.exclusions || []).join(", ") || "N/A"}
                </div>
              </div>
            </div>

            <div className="providerImageGrid">
              {(provider.travelPlanner?.images || []).map((img, index) => (
                <div className="providerImageItem" key={index}>
                  <img src={img.url} alt="planner" />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="reviewSection">
          <div className="providerSectionTitle">Book This Service</div>

          {!isLoggedIn() ? (
            <div className="providerNote">Please login to book.</div>
          ) : isOwner ? (
            <div className="providerNote">You cannot book your own service.</div>
          ) : (
            <form className="reviewForm" onSubmit={startBookingPayment}>
              <input
                className="input"
                placeholder="Your name"
                value={bookingForm.contactName}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, contactName: e.target.value }))
                }
                required
              />

              <input
                className="input"
                placeholder="Email"
                value={bookingForm.contactEmail}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, contactEmail: e.target.value }))
                }
              />

              <input
                className="input"
                placeholder="Phone"
                value={bookingForm.contactPhone}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, contactPhone: e.target.value }))
                }
                required
              />

              <input
                className="input"
                type="date"
                value={bookingForm.bookingDate}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, bookingDate: e.target.value }))
                }
                required
              />

              <input
                className="input"
                type="number"
                placeholder="Number of people"
                value={bookingForm.peopleCount}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, peopleCount: e.target.value }))
                }
              />

              <input
                className="input"
                placeholder="Destination / Place"
                value={bookingForm.destination}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, destination: e.target.value }))
                }
              />

              <textarea
                className="textarea"
                rows={3}
                placeholder="Additional notes"
                value={bookingForm.notes}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, notes: e.target.value }))
                }
              />

              <input
                className="input"
                type="number"
                placeholder="Amount to pay"
                value={bookingForm.amount}
                onChange={(e) =>
                  setBookingForm((s) => ({ ...s, amount: e.target.value }))
                }
                required
              />

              <button className="btn btnPrimary" type="submit">
                Pay & Book
              </button>
            </form>
          )}
        </div>

        <div className="reviewSection">
          <div className="providerSectionTitle">Reviews</div>

          {!isLoggedIn() ? (
            <div className="providerNote">Please login to add a review.</div>
          ) : isOwner ? (
            <div className="providerNote">
              You cannot review your own product or service.
            </div>
          ) : (
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

          <div className="reviewList">
            {reviews.length === 0 ? (
              <div className="providerNote">No reviews yet.</div>
            ) : (
              reviews.map((review) => (
                <div className="reviewItem" key={review._id}>
                  <div className="reviewTop">
                    <div className="reviewUser">{review.user?.name || "User"}</div>
                    <div className="reviewStars">⭐ {review.rating}</div>
                  </div>
                  <div className="reviewText">{review.comment || "No comment"}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}