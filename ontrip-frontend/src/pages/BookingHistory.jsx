import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

export default function BookingHistory() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [openReviewId, setOpenReviewId] = useState("");
  const [savingReview, setSavingReview] = useState(false);

  const [reviewForms, setReviewForms] = useState({});

  async function loadBookings() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/bookings/mine");
      const items = data.bookings || [];
      setBookings(items);

      const nextForms = {};
      items.forEach((booking) => {
        nextForms[booking._id] = {
          rating: booking.existingReview?.rating || 5,
          comment: booking.existingReview?.comment || "",
        };
      });
      setReviewForms(nextForms);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

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
      setSavingReview(true);
      setMsg("");

      const form = reviewForms[booking._id];

      const data = await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          providerId: booking.provider?._id || booking.provider,
          rating: Number(form.rating),
          comment: form.comment,
        }),
      });

      setOpenReviewId("");
      await loadBookings();
      setMsg(data.message || "Review saved successfully.");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSavingReview(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking history..." />;
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>See your confirmed bookings, invoices, status updates, and reviews.</p>
      </div>

      {msg && <div className="bookingHistoryMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="bookingHistoryEmpty">
          No bookings yet. Your confirmed bookings will appear here.
        </div>
      ) : (
        <div className="bookingHistoryGrid">
          {bookings.map((booking) => {
            const form = reviewForms[booking._id] || { rating: 5, comment: "" };
            const isEditing = openReviewId === booking._id;

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
                  <div><strong>Booking ID:</strong> {booking.bookingCode}</div>
                  <div><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}</div>
                  <div><strong>Status:</strong> {booking.bookingStatus}</div>
                  <div><strong>Payment:</strong> {booking.paymentStatus}</div>
                  <div><strong>Vehicle:</strong> {booking.selectedVehicleTitle || "-"}</div>
                  <div><strong>Package:</strong> {booking.selectedPackageTitle || "-"}</div>
                  <div><strong>Destination:</strong> {booking.destination || "-"}</div>
                  <div><strong>Place:</strong> {booking.place || "-"}</div>
                  {booking.statusReason ? (
                    <div><strong>Reason:</strong> {booking.statusReason}</div>
                  ) : null}
                </div>

                <div className="bookingHistoryActions">
                  <button
                    className="bookingHistoryBtn"
                    onClick={() => navigate(`/booking-success/${booking._id}`)}
                  >
                    View Details
                  </button>

                  <button
                    className="bookingHistoryBtn"
                    onClick={() => navigate(`/booking-invoice/${booking._id}`)}
                  >
                    View Invoice
                  </button>

                  {booking.canReview ? (
                    <button
                      className={
                        booking.existingReview
                          ? "bookingHistoryEditBtn"
                          : "bookingHistoryReviewBtn"
                      }
                      onClick={() =>
                        setOpenReviewId((prev) =>
                          prev === booking._id ? "" : booking._id
                        )
                      }
                    >
                      {booking.existingReview ? "Edit Review" : "Write Review"}
                    </button>
                  ) : null}
                </div>

                {isEditing ? (
                  <div className="bookingHistoryReviewForm">
                    <div>
                      <label>Rating</label>
                      <select
                        value={form.rating}
                        onChange={(e) =>
                          updateReviewForm(booking._id, "rating", e.target.value)
                        }
                      >
                        <option value={5}>5 Stars</option>
                        <option value={4}>4 Stars</option>
                        <option value={3}>3 Stars</option>
                        <option value={2}>2 Stars</option>
                        <option value={1}>1 Star</option>
                      </select>
                    </div>

                    <div>
                      <label>Comment</label>
                      <textarea
                        rows={4}
                        value={form.comment}
                        onChange={(e) =>
                          updateReviewForm(booking._id, "comment", e.target.value)
                        }
                        placeholder="Write your review here"
                      />
                    </div>

                    <button
                      className="bookingHistorySubmitBtn"
                      onClick={() => submitReview(booking)}
                      disabled={savingReview}
                    >
                      {savingReview ? "Saving..." : "Submit Review"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}