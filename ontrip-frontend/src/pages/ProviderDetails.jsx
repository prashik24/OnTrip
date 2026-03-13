import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import "./Providers.css";

export default function ProviderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [similarProviders, setSimilarProviders] = useState([]);
  const [showBookingForm, setShowBookingForm] = useState(false);
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
    destination: "",
    place: "",
    travelDate: "",
    days: 1,
    peopleCount: 1,
    selectedVehicleId: "",
    notes: "",
  });

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const providerData = await apiFetch(`/api/providers/${id}`);
        setProvider(providerData.provider);
        setSimilarProviders(providerData.similarProviders || []);

        const reviewData = await apiFetch(`/api/reviews/${id}`);
        setReviews(reviewData.reviews || []);
      } catch (err) {
        setMsg({ text: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const isOwner =
    user && provider && String(provider.owner?._id || provider.owner) === String(user.id);

  const selectedVehicle = useMemo(() => {
    if (!provider || provider.listingType !== "vehicle") return null;
    return provider.vehicles?.find(
      (v) => String(v._id) === String(bookingForm.selectedVehicleId)
    );
  }, [provider, bookingForm.selectedVehicleId]);

  const bookingPreview = useMemo(() => {
    if (!provider) return { total: 0, label: "" };

    if (provider.listingType === "travel_planner") {
      const perPerson =
        Number(provider.travelPlanner?.pricePerPerson || 0) ||
        Number(provider.travelPlanner?.priceFrom || 0);

      const people = Math.max(Number(bookingForm.peopleCount || 1), 1);

      return {
        total: perPerson * people,
        label: `₹${perPerson} per person × ${people}`,
      };
    }

    if (provider.listingType === "vehicle" && selectedVehicle) {
      const days = Math.max(Number(bookingForm.days || 1), 1);
      const unit = Number(selectedVehicle.price || 0);

      if (selectedVehicle.priceUnit === "fixed") {
        return {
          total: unit,
          label: `Fixed price`,
        };
      }

      return {
        total: unit * days,
        label:
          selectedVehicle.priceUnit === "per_hour"
            ? `₹${unit} per hour`
            : `₹${unit} per day × ${days}`,
      };
    }

    return { total: 0, label: "" };
  }, [provider, bookingForm.peopleCount, bookingForm.days, selectedVehicle]);

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

  async function handleBooking(e) {
    e.preventDefault();

    try {
      const data = await apiFetch("/api/bookings/create-order", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          ...bookingForm,
          days: Number(bookingForm.days || 1),
          peopleCount: Number(bookingForm.peopleCount || 1),
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
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            setMsg({ text: verify.message, type: "success" });
            setShowBookingForm(false);
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
        <div className="providerMessage error">
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

      <div className="providerDetailHero card">
        <div className="providerDetailHeroMedia">
          {provider.serviceImage?.url ? (
            <img src={provider.serviceImage.url} alt={provider.businessName} />
          ) : (
            <div className="providerMediaEmpty">No Service Image</div>
          )}
        </div>

        <div className="providerDetailHeroContent">
          <div className="providerTypeBadge">
            {provider.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
          </div>

          <h1 className="providerHeroTitle">{provider.businessName}</h1>
          <div className="providerMetaText">
            {provider.city}, {provider.state || "India"}
          </div>

          <div className="providerDesc">
            {provider.description || "No description provided."}
          </div>

          <div className="providerInfoBar">
            <div className="providerInfoChip">⭐ {provider.ratingAverage || 0}</div>
            <div className="providerInfoChip">Reviews {provider.ratingCount || 0}</div>
            <div className="providerInfoChip">Phone {provider.phone}</div>
            <div className="providerInfoChip">WhatsApp {provider.whatsapp || "N/A"}</div>
          </div>

          {!isLoggedIn() ? (
            <button className="btn btnPrimary" onClick={() => navigate("/login")}>
              Login to Book
            </button>
          ) : isOwner ? (
            <div className="providerNote">You cannot book your own service.</div>
          ) : (
            <button
              className="btn btnPrimary"
              onClick={() => setShowBookingForm((s) => !s)}
            >
              {showBookingForm ? "Close Booking Form" : "Book Service"}
            </button>
          )}
        </div>
      </div>

      <div className="providerDetailGrid">
        <div className="providerDetailMain">
          {provider.listingType === "travel_planner" ? (
            <div className="card providerDetailSection">
              <h2 className="providerSectionTitle">Travel Package Details</h2>

              <div className="plannerTitle">
                {provider.travelPlanner?.packageTitle || "Travel Package"}
              </div>

              <div className="plannerMeta">
                {provider.travelPlanner?.durationText || "Flexible duration"} • {provider.travelPlanner?.days || 1} days
              </div>

              <div className="providerInfoBar">
                <div className="providerInfoChip">From ₹{provider.travelPlanner?.priceFrom || 0}</div>
                <div className="providerInfoChip">Per Person ₹{provider.travelPlanner?.pricePerPerson || 0}</div>
                <div className="providerInfoChip">{provider.travelPlanner?.plannerMode}</div>
              </div>

              <div className="plannerInfoGrid">
                <div className="providerInfoBox">
                  <div className="plannerInfoTitle">Places Covered</div>
                  <div className="plannerInfoText">
                    {(provider.travelPlanner?.placesCovered || []).join(", ") || "N/A"}
                  </div>
                </div>

                <div className="providerInfoBox">
                  <div className="plannerInfoTitle">Inclusions</div>
                  <div className="plannerInfoText">
                    {(provider.travelPlanner?.inclusions || []).join(", ") || "N/A"}
                  </div>
                </div>

                <div className="providerInfoBox">
                  <div className="plannerInfoTitle">Exclusions</div>
                  <div className="plannerInfoText">
                    {(provider.travelPlanner?.exclusions || []).join(", ") || "N/A"}
                  </div>
                </div>
              </div>

              <div className="providerImageGrid">
                {(provider.travelPlanner?.images || []).map((img, index) => (
                  <div className="providerImageItem" key={index}>
                    <img src={img.url} alt="travel package" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="card providerDetailSection">
              <h2 className="providerSectionTitle">Available Vehicles</h2>

              <div className="detailVehicleList">
                {(provider.vehicles || []).map((vehicle) => (
                  <div className="detailVehicleCard" key={vehicle._id}>
                    <div className="detailVehicleHead">
                      <div>
                        <div className="detailVehicleTitle">
                          {vehicle.title || vehicle.vehicleType}
                        </div>
                        <div className="detailVehicleMeta">
                          {vehicle.vehicleType} • Capacity {vehicle.capacity || 1} •{" "}
                          {vehicle.withDriver ? "With Driver" : "Without Driver"}
                        </div>
                      </div>

                      <div className="detailVehiclePrice">
                        ₹{vehicle.price}{" "}
                        <span className="vehiclePriceUnit">
                          / {vehicle.priceUnit === "per_hour" ? "hour" : vehicle.priceUnit === "fixed" ? "fixed" : "day"}
                        </span>
                      </div>
                    </div>

                    <div className="providerImageGrid">
                      {(vehicle.images || []).map((img, imgIndex) => (
                        <div className="providerImageItem" key={imgIndex}>
                          <img src={img.url} alt={vehicle.title || vehicle.vehicleType} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showBookingForm && !isOwner && (
            <div className="card providerDetailSection">
              <h2 className="providerSectionTitle">Booking Form</h2>

              <form className="reviewForm" onSubmit={handleBooking}>
                <div className="providerFormGrid">
                  <div>
                    <label className="label">Your Name</label>
                    <input
                      className="input"
                      value={bookingForm.contactName}
                      onChange={(e) =>
                        setBookingForm((s) => ({ ...s, contactName: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Email</label>
                    <input
                      className="input"
                      value={bookingForm.contactEmail}
                      onChange={(e) =>
                        setBookingForm((s) => ({ ...s, contactEmail: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Phone</label>
                    <input
                      className="input"
                      value={bookingForm.contactPhone}
                      onChange={(e) =>
                        setBookingForm((s) => ({ ...s, contactPhone: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="label">Travel Date</label>
                    <input
                      className="input"
                      type="date"
                      value={bookingForm.travelDate}
                      onChange={(e) =>
                        setBookingForm((s) => ({ ...s, travelDate: e.target.value }))
                      }
                      required
                    />
                  </div>

                  {provider.listingType === "travel_planner" ? (
                    <>
                      <div>
                        <label className="label">Destination</label>
                        <input
                          className="input"
                          value={bookingForm.destination}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, destination: e.target.value }))
                          }
                          placeholder="Goa, Jaipur, Manali..."
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Number of Days</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={bookingForm.days}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, days: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Number of People</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={bookingForm.peopleCount}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, peopleCount: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="label">Place</label>
                        <input
                          className="input"
                          value={bookingForm.place}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, place: e.target.value }))
                          }
                          placeholder="Pickup / usage place"
                          required
                        />
                      </div>

                      <div>
                        <label className="label">Number of Days</label>
                        <input
                          className="input"
                          type="number"
                          min="1"
                          value={bookingForm.days}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, days: e.target.value }))
                          }
                          required
                        />
                      </div>

                      <div className="fullCol">
                        <label className="label">Select Vehicle</label>
                        <select
                          className="select"
                          value={bookingForm.selectedVehicleId}
                          onChange={(e) =>
                            setBookingForm((s) => ({ ...s, selectedVehicleId: e.target.value }))
                          }
                          required
                        >
                          <option value="">Choose vehicle</option>
                          {(provider.vehicles || []).map((vehicle) => (
                            <option key={vehicle._id} value={vehicle._id}>
                              {vehicle.title || vehicle.vehicleType} — ₹{vehicle.price}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="fullCol">
                    <label className="label">Notes</label>
                    <textarea
                      className="textarea"
                      rows={4}
                      value={bookingForm.notes}
                      onChange={(e) =>
                        setBookingForm((s) => ({ ...s, notes: e.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="bookingSummary">
                  <div className="bookingSummaryTitle">Price Summary</div>
                  <div className="bookingSummaryRow">
                    <span>{bookingPreview.label || "Select details to calculate"}</span>
                    <strong>₹{bookingPreview.total || 0}</strong>
                  </div>
                </div>

                <button className="btn btnPrimary" type="submit">
                  Pay & Book
                </button>
              </form>
            </div>
          )}

          <div className="card providerDetailSection">
            <h2 className="providerSectionTitle">Reviews</h2>

            {!isLoggedIn() ? (
              <div className="providerNote">Please login to add a review.</div>
            ) : isOwner ? (
              <div className="providerNote">You cannot review your own service.</div>
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

        <div className="providerDetailSide">
          <div className="card providerDetailSection">
            <h2 className="providerSectionTitle">Provider Info</h2>
            <div className="providerSideInfo">
              <div><strong>Name:</strong> {provider.owner?.name || "Provider"}</div>
              <div><strong>Email:</strong> {provider.owner?.email || "N/A"}</div>
              <div><strong>Phone:</strong> {provider.phone}</div>
              <div><strong>City:</strong> {provider.city}</div>
              <div><strong>WhatsApp:</strong> {provider.whatsapp || "N/A"}</div>
            </div>
          </div>

          <div className="card providerDetailSection">
            <h2 className="providerSectionTitle">Similar Providers</h2>

            <div className="similarList">
              {similarProviders.length === 0 ? (
                <div className="providerNote">No similar providers found.</div>
              ) : (
                similarProviders.map((item) => (
                  <div className="similarCard" key={item._id}>
                    <div className="similarCardTitle">{item.businessName}</div>
                    <div className="providerMetaText">
                      {item.city} • ⭐ {item.ratingAverage || 0}
                    </div>
                    <button
                      className="btn"
                      onClick={() => navigate(`/providers/${item._id}`)}
                    >
                      View
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
