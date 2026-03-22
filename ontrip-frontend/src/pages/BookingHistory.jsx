import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

const ratingOptions = [
  { label: "5 Stars", value: 5 },
  { label: "4 Stars", value: 4 },
  { label: "3 Stars", value: 3 },
  { label: "2 Stars", value: 2 },
  { label: "1 Star", value: 1 },
];

export default function BookingHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [openReviewId, setOpenReviewId] = useState("");
  const [submittingId, setSubmittingId] = useState("");
  const [reviewForms, setReviewForms] = useState({});

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/bookings/mine");
      const bookingList = data.bookings || [];
      setBookings(bookingList);

      const nextForms = {};
      bookingList.forEach((booking) => {
        nextForms[booking._id] = {
          rating: booking.existingReview?.rating || 5,
          comment: booking.existingReview?.comment || "",
          image: null,
          existingImages: booking.existingReview?.images || [],
        };
      });
      setReviewForms(nextForms);
    } catch (err) {
      setMsg(err.message || "Failed to load booking history.");
    } finally {
      setLoading(false);
    }
  }

  function updateReviewForm(bookingId, key, value) {
    setReviewForms((prev) => ({
      ...prev,
      [bookingId]: {
        ...prev[bookingId],
        [key]: value,
      },
    }));
  }

  async function submitReview(booking) {
    try {
      setSubmittingId(booking._id);
      setMsg("");

      const form = reviewForms[booking._id];
      const fd = new FormData();

      fd.append("bookingId", booking._id);
      fd.append("rating", String(form.rating));
      fd.append("comment", form.comment || "");

      if (form.image) {
        fd.append("reviewImage", form.image);
      }

      await apiFetch("/api/reviews/booking", {
        method: "POST",
        body: fd,
      });

      await loadBookings();
      setOpenReviewId("");
      setMsg("Review saved successfully.");
    } catch (err) {
      setMsg(err.message || "Failed to save review.");
    } finally {
      setSubmittingId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking history..." />;
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>Track bookings, payment state, invoice, booking summary, and reviews.</p>
      </div>

      {msg && <div className="bookingHistoryMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="bookingHistoryEmpty">You have not booked any service yet.</div>
      ) : (
        <div className="bookingHistoryGrid">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";
            const currentForm = reviewForms[booking._id] || {
              rating: 5,
              comment: "",
              image: null,
              existingImages: [],
            };

            return (
              <div className="bookingHistoryCard" key={booking._id}>
                <div className="bookingHistoryTop">
                  <div className="bookingHistoryTopLeft">
                    <h3>{booking.serviceTitle}</h3>
                    <p>{booking.provider?.businessName || "Provider"}</p>
                  </div>
                  <div className="bookingHistoryPrice">₹{booking.amount}</div>
                </div>

                <div className="bookingHistoryInfo">
                  <div>Booking Ref: {booking.bookingRef}</div>
                  <div>Date: {new Date(booking.bookingDate).toLocaleDateString()}</div>
                  <div>Payment: {booking.paymentStatus}</div>
                  <div>Status: {booking.bookingStatus}</div>
                  <div>People: {booking.peopleCount}</div>
                  <div>Days: {booking.days}</div>
                  {booking.destination ? <div>Destination: {booking.destination}</div> : null}
                  {booking.place ? <div>Place: {booking.place}</div> : null}
                  {booking.cancellationReason ? (
                    <div>Cancellation Reason: {booking.cancellationReason}</div>
                  ) : null}
                  {isCancelled ? (
                    <div>Your provider cancelled this service. They will refund your money soon.</div>
                  ) : null}
                </div>

                <div className="bookingHistoryActions">
                  <button
                    className="bookingHistoryBtn"
                    onClick={() => navigate(`/profile/bookings/${booking._id}`)}
                  >
                    View Details
                  </button>

                  <button
                    className="bookingHistoryBtn"
                    onClick={() => navigate(`/profile/bookings/${booking._id}/invoice`)}
                  >
                    View Invoice
                  </button>

                  {!isCancelled && booking.canReview && (
                    <button
                      className={
                        booking.existingReview
                          ? "bookingHistoryEditBtn"
                          : "bookingHistoryReviewBtn"
                      }
                      onClick={() =>
                        setOpenReviewId((prev) => (prev === booking._id ? "" : booking._id))
                      }
                    >
                      {booking.existingReview ? "Edit Review" : "Write Review"}
                    </button>
                  )}
                </div>

                {!isCancelled && openReviewId === booking._id && booking.canReview && (
                  <div className="bookingHistoryReviewForm">
                    <div className="bookingHistoryField">
                      <label>Rating</label>
                      <div className="bookingHistoryFieldControl">
                        <CustomSelect
                          value={currentForm.rating || 5}
                          onChange={(e) =>
                            updateReviewForm(booking._id, "rating", e.target.value)
                          }
                          options={ratingOptions}
                        />
                      </div>
                    </div>

                    <div className="bookingHistoryField">
                      <label>Comment</label>
                      <textarea
                        rows={4}
                        value={currentForm.comment || ""}
                        onChange={(e) =>
                          updateReviewForm(booking._id, "comment", e.target.value)
                        }
                        placeholder="Write your review"
                      />
                    </div>

                    {currentForm.existingImages?.length > 0 && (
                      <div className="bookingHistoryField">
                        <label>Current Review Image</label>
                        <div className="bookingHistoryReviewImageGrid">
                          {currentForm.existingImages.map((img, index) => (
                            <div className="bookingHistoryReviewImageItem" key={index}>
                              <img src={img.url} alt="review" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="bookingHistoryField">
                      <label>
                        {currentForm.existingImages?.length > 0
                          ? "Replace Image (optional)"
                          : "Image (optional)"}
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          updateReviewForm(
                            booking._id,
                            "image",
                            e.target.files?.[0] || null
                          )
                        }
                      />
                    </div>

                    <div className="bookingHistoryReviewActions">
                      <button
                        className="bookingHistorySubmitBtn"
                        onClick={() => submitReview(booking)}
                        disabled={submittingId === booking._id}
                      >
                        {submittingId === booking._id ? "Saving..." : "Submit Review"}
                      </button>

                      <button
                        type="button"
                        className="bookingHistoryCloseBtn"
                        onClick={() => setOpenReviewId("")}
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}