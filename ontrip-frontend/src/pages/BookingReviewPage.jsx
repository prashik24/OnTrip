import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingReviewPage.css";

const ratingOptions = [
  { label: "5 Stars", value: 5 },
  { label: "4 Stars", value: 4 },
  { label: "3 Stars", value: 3 },
  { label: "2 Stars", value: 2 },
  { label: "1 Star", value: 1 },
];

export default function BookingReviewPage() {
  const navigate = useNavigate();
  const { bookingId } = useParams();

  const [booking, setBooking] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    rating: 5,
    comment: "",
    image: null,
    existingImages: [],
  });

  useEffect(() => {
    loadBooking();
  }, [bookingId]);

  async function loadBooking() {
    try {
      setLoading(true);
      setMsg("");

      const data = await apiFetch("/api/bookings/mine");
      const bookingList = data.bookings || [];
      const found = bookingList.find((item) => item._id === bookingId);

      if (!found) {
        setMsg("Booking not found.");
        setBooking(null);
        return;
      }

      setBooking(found);
      setForm({
        rating: found.existingReview?.rating || 5,
        comment: found.existingReview?.comment || "",
        image: null,
        existingImages: found.existingReview?.images || [],
      });
    } catch (err) {
      setMsg(err.message || "Failed to load booking.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function submitReview() {
    if (!booking) return;

    try {
      setSubmitting(true);
      setMsg("");

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

      setMsg("Review saved successfully.");
      await loadBooking();
    } catch (err) {
      setMsg(err.message || "Failed to save review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading review page..." />;
  }

  if (!booking) {
    return (
      <div className="bookingReviewPage container">
        <div className="bookingReviewMessage">{msg || "Booking not found."}</div>
        <button
          className="bookingReviewBackBtn"
          onClick={() => navigate("/profile/bookings")}
        >
          Back to Booking History
        </button>
      </div>
    );
  }

  const isCancelled = booking.bookingStatus === "cancelled";

  return (
    <div className="bookingReviewPage container">
      <div className="bookingReviewHead">
        <div>
          <h1>{booking.existingReview ? "Edit Review" : "Write Review"}</h1>
          <p>Manage your review while keeping the previous review image and details visible.</p>
        </div>

        <button
          className="bookingReviewBackBtn"
          onClick={() => navigate("/profile/bookings")}
        >
          Back to Booking History
        </button>
      </div>

      {msg && <div className="bookingReviewMessage">{msg}</div>}

      <div className="bookingReviewLayout">
        <aside className="bookingReviewSidebar">
          <div className="bookingReviewCard">
            <div className="bookingReviewCardTop">
              <div>
                <h3>{booking.serviceTitle}</h3>
                <p>{booking.provider?.businessName || "Provider"}</p>
              </div>
              <div className="bookingReviewPrice">₹{booking.amount}</div>
            </div>

            <div className="bookingReviewCardInfo">
              <div>
                <span>Booking Ref:</span> {booking.bookingRef}
              </div>
              <div>
                <span>Date:</span>{" "}
                {booking.bookingDate
                  ? new Date(booking.bookingDate).toLocaleDateString()
                  : "-"}
              </div>
              <div>
                <span>Payment:</span> {booking.paymentStatus}
              </div>
              <div>
                <span>Status:</span> {booking.bookingStatus}
              </div>
              <div>
                <span>People:</span> {booking.peopleCount}
              </div>
              <div>
                <span>Days:</span> {booking.days}
              </div>

              {booking.destination ? (
                <div>
                  <span>Destination:</span> {booking.destination}
                </div>
              ) : null}

              {booking.place ? (
                <div>
                  <span>Place:</span> {booking.place}
                </div>
              ) : null}
            </div>

            {booking.cancellationReason ? (
              <div className="bookingReviewAlert bookingReviewAlertDanger">
                <strong>Cancellation Reason:</strong> {booking.cancellationReason}
              </div>
            ) : null}

            {isCancelled ? (
              <div className="bookingReviewAlert bookingReviewAlertSuccess">
                Your provider cancelled this service. They will refund your money soon.
              </div>
            ) : null}

            {form.existingImages?.length > 0 && (
              <div className="bookingReviewExistingWrap">
                <label>Previous Review Image</label>
                <div className="bookingReviewImageGrid">
                  {form.existingImages.map((img, index) => (
                    <div className="bookingReviewImageItem" key={index}>
                      <img src={img.url} alt="review" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="bookingReviewFormCard">
          {isCancelled || !booking.canReview ? (
            <div className="bookingReviewDisabled">
              Review is not available for this booking.
            </div>
          ) : (
            <>
              <div className="bookingReviewField">
                <label>Rating</label>
                <div className="bookingReviewFieldControl">
                  <CustomSelect
                    value={form.rating || 5}
                    onChange={(e) => updateForm("rating", e.target.value)}
                    options={ratingOptions}
                  />
                </div>
              </div>

              <div className="bookingReviewField">
                <label>Comment</label>
                <textarea
                  rows={6}
                  value={form.comment || ""}
                  onChange={(e) => updateForm("comment", e.target.value)}
                  placeholder="Write your review"
                />
              </div>

              <div className="bookingReviewField">
                <label>
                  {form.existingImages?.length > 0
                    ? "Replace Image (optional)"
                    : "Image (optional)"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updateForm("image", e.target.files?.[0] || null)}
                />
              </div>

              <div className="bookingReviewActions">
                <button
                  className="bookingReviewSubmitBtn"
                  onClick={submitReview}
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Submit Review"}
                </button>

                <button
                  type="button"
                  className="bookingReviewCancelBtn"
                  onClick={() => navigate("/profile/bookings")}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}