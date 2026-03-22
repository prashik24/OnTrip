import { useEffect, useMemo, useState } from "react";
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
    removeExistingImages: false,
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
        setBooking(null);
        setMsg("Booking not found.");
        return;
      }

      setBooking(found);
      setForm({
        rating: found.existingReview?.rating || 5,
        comment: found.existingReview?.comment || "",
        image: null,
        existingImages: found.existingReview?.images || [],
        removeExistingImages: false,
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

  function removeSelectedImage() {
    setForm((prev) => ({
      ...prev,
      image: null,
    }));
  }

  function removeExistingImage(indexToRemove) {
    setForm((prev) => {
      const nextImages = (prev.existingImages || []).filter(
        (_, index) => index !== indexToRemove
      );

      return {
        ...prev,
        existingImages: nextImages,
        removeExistingImages: nextImages.length === 0,
      };
    });
  }

  function clearAllExistingImages() {
    setForm((prev) => ({
      ...prev,
      existingImages: [],
      removeExistingImages: true,
    }));
  }

  const selectedPreviewUrl = useMemo(() => {
    if (!form.image) return "";
    return URL.createObjectURL(form.image);
  }, [form.image]);

  useEffect(() => {
    return () => {
      if (selectedPreviewUrl) {
        URL.revokeObjectURL(selectedPreviewUrl);
      }
    };
  }, [selectedPreviewUrl]);

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

      fd.append("removeExistingImages", String(form.removeExistingImages));
      fd.append(
        "keptExistingImageUrls",
        JSON.stringify((form.existingImages || []).map((img) => img.url))
      );

      await apiFetch("/api/reviews/booking", {
        method: "POST",
        body: fd,
      });

      await loadBooking();
      setMsg("Review submitted successfully.");
    } catch (err) {
      setMsg(err.message || "Failed to submit review.");
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
        {msg && <div className="bookingReviewMessage">{msg}</div>}
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
          <p>Update your review and manage review image easily.</p>
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
                    ? "Choose File (replace or add)"
                    : "Choose File"}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => updateForm("image", e.target.files?.[0] || null)}
                />
              </div>

              {/* selected new image preview */}
              {selectedPreviewUrl ? (
                <div className="bookingReviewField">
                  <label>Selected Image</label>
                  <div className="bookingReviewPreviewBox">
                    <div className="bookingReviewImageGrid bookingReviewImageGridSingle">
                      <div className="bookingReviewImageItem">
                        <img src={selectedPreviewUrl} alt="selected review" />
                      </div>
                    </div>

                    <button
                      type="button"
                      className="bookingReviewRemoveBtn"
                      onClick={removeSelectedImage}
                    >
                      Remove Selected Image
                    </button>
                  </div>
                </div>
              ) : null}

              {/* previous image under choose file */}
              {form.existingImages?.length > 0 ? (
                <div className="bookingReviewField">
                  <div className="bookingReviewPreviousHead">
                    <label>Previous Review Image</label>

                    <button
                      type="button"
                      className="bookingReviewRemoveTextBtn"
                      onClick={clearAllExistingImages}
                    >
                      Remove All Previous Images
                    </button>
                  </div>

                  <div className="bookingReviewImageGrid">
                    {form.existingImages.map((img, index) => (
                      <div className="bookingReviewImageCard" key={index}>
                        <div className="bookingReviewImageItem">
                          <img src={img.url} alt="review" />
                        </div>
                        <button
                          type="button"
                          className="bookingReviewRemoveBtn"
                          onClick={() => removeExistingImage(index)}
                        >
                          Remove Image
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="bookingReviewActions">
                <button
                  className="bookingReviewSubmitBtn"
                  onClick={submitReview}
                  disabled={submitting}
                >
                  {submitting ? "Submitting..." : "Submit Review"}
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