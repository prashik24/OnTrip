import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [openReviewId, setOpenReviewId] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
    images: null,
  });

  const ratingOptions = [
    { label: "5 Stars", value: 5 },
    { label: "4 Stars", value: 4 },
    { label: "3 Stars", value: 3 },
    { label: "2 Stars", value: 2 },
    { label: "1 Star", value: 1 },
  ];

  async function load() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/bookings/mine");
      setBookings(data.bookings || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openReview(booking) {
    setOpenReviewId((prev) => (prev === booking._id ? null : booking._id));
    setReviewForm({
      rating: booking.existingReview?.rating || 5,
      comment: booking.existingReview?.comment || "",
      images: null,
    });
  }

  async function submitReview(e, bookingId) {
    e.preventDefault();

    try {
      setSubmitLoading(true);
      const fd = new FormData();
      fd.append("bookingId", bookingId);
      fd.append("rating", reviewForm.rating);
      fd.append("comment", reviewForm.comment);

      Array.from(reviewForm.images || []).forEach((file) => {
        fd.append("images", file);
      });

      await apiFetch("/api/reviews/from-booking", {
        method: "POST",
        body: fd,
      });

      setMsg("Review saved successfully.");
      setOpenReviewId(null);
      setReviewForm({
        rating: 5,
        comment: "",
        images: null,
      });
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSubmitLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking history..." />;
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>Track your bookings, payments, status, and review only the services you actually booked.</p>
      </div>

      {msg && <div className="bookingHistoryMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="bookingHistoryEmpty">You have not booked any service yet.</div>
      ) : (
        <div className="bookingHistoryGrid">
          {bookings.map((booking) => (
            <article className="bookingHistoryCard" key={booking._id}>
              <div className="bookingHistoryTop">
                <div>
                  <h3>{booking.serviceTitle}</h3>
                  <p>
                    {booking.provider?.businessName || "Service"} •{" "}
                    {booking.provider?.city || "City not available"}
                  </p>
                </div>

                <div className="bookingHistoryPrice">₹{booking.amount}</div>
              </div>

              <div className="bookingHistoryInfo">
                <div><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}</div>
                <div><strong>People:</strong> {booking.peopleCount}</div>
                <div><strong>Destination:</strong> {booking.destination || "N/A"}</div>
                <div><strong>Payment:</strong> {booking.paymentStatus}</div>
                <div><strong>Status:</strong> {booking.bookingStatus}</div>
              </div>

              {booking.canReview && (
                <div className="bookingHistoryActions">
                  <button className="bookingHistoryBtn" onClick={() => openReview(booking)}>
                    {booking.existingReview ? "Edit Review" : "Write Review"}
                  </button>
                </div>
              )}

              {openReviewId === booking._id && (
                <form
                  className="bookingHistoryReviewForm"
                  onSubmit={(e) => submitReview(e, booking._id)}
                >
                  <div>
                    <label>Rating</label>
                    <CustomSelect
                      value={reviewForm.rating}
                      onChange={(e) =>
                        setReviewForm((s) => ({ ...s, rating: e.target.value }))
                      }
                      options={ratingOptions}
                    />
                  </div>

                  <div>
                    <label>Comment</label>
                    <textarea
                      rows={4}
                      value={reviewForm.comment}
                      onChange={(e) =>
                        setReviewForm((s) => ({ ...s, comment: e.target.value }))
                      }
                      placeholder="Write your experience..."
                      required
                    />
                  </div>

                  <div>
                    <label>Review Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setReviewForm((s) => ({ ...s, images: e.target.files }))
                      }
                    />
                  </div>

                  <button className="bookingHistorySubmitBtn" type="submit" disabled={submitLoading}>
                    {submitLoading ? "Saving..." : "Submit Review"}
                  </button>
                </form>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}