import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
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
  const [openReviewId, setOpenReviewId] = useState("");
  const [submittingId, setSubmittingId] = useState("");
  const [reviewForms, setReviewForms] = useState({});

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      const data = await apiFetch("/api/bookings/mine");
      setBookings(data.bookings || []);

      const nextForms = {};
      (data.bookings || []).forEach((booking) => {
        nextForms[booking._id] = {
          rating: booking.existingReview?.rating || 5,
          comment: booking.existingReview?.comment || "",
          image: null,
        };
      });
      setReviewForms(nextForms);
    } catch (err) {
      setMsg(err.message);
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
      setMsg("Your review has been saved successfully.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmittingId("");
    }
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>Track bookings, payment state, invoice, booking summary, and reviews.</p>
      </div>

      {msg && <div className="bookingHistoryMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="bookingHistoryEmpty">
          You have not booked any service yet.
        </div>
      ) : (
        <div className="bookingHistoryGrid">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";

            return (
              <div className="bookingHistoryCard" key={booking._id}>
                <div className="bookingHistoryTop">
                  <div>
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
                    <div className="bookingHistoryAlert">
                      This booking was cancelled by the provider. Your refund will be processed soon.
                    </div>
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
                      className={booking.existingReview ? "bookingHistoryEditBtn" : "bookingHistoryReviewBtn"}
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
                    <div>
                      <label>Rating</label>
                      <CustomSelect
                        value={reviewForms[booking._id]?.rating || 5}
                        onChange={(e) =>
                          updateReviewForm(booking._id, "rating", e.target.value)
                        }
                        options={ratingOptions}
                      />
                    </div>

                    <div>
                      <label>Comment</label>
                      <textarea
                        rows={4}
                        value={reviewForms[booking._id]?.comment || ""}
                        onChange={(e) =>
                          updateReviewForm(booking._id, "comment", e.target.value)
                        }
                        placeholder="Write your review"
                      />
                    </div>

                    <div>
                      <label>Image (optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          updateReviewForm(booking._id, "image", e.target.files?.[0] || null)
                        }
                      />
                    </div>

                    <button
                      className="bookingHistorySubmitBtn"
                      onClick={() => submitReview(booking)}
                      disabled={submittingId === booking._id}
                    >
                      {submittingId === booking._id ? "Saving..." : "Submit Review"}
                    </button>
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