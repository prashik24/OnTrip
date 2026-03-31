import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

function formatStatusLabel(value) {
  if (!value) return "-";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function BookingHistory() {
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadBookings() {
    try {
      setLoading(true);
      setMsg("");
      const data = await apiFetch("/api/bookings/my");
      setBookings(data.bookings || []);
    } catch (err) {
      setMsg(err.message || "Failed to load booking history.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBookings();
  }, []);

  if (loading) {
    return <LoadingSpinner text="Loading booking history..." />;
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>View your bookings, payment status, service details, and next actions.</p>
      </div>

      {msg ? <div className="bookingHistoryMessage">{msg}</div> : null}

      {bookings.length === 0 ? (
        <div className="bookingHistoryEmpty">No bookings found yet.</div>
      ) : (
        <div className="bookingHistoryGrid">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";
            const isConfirmed = booking.bookingStatus === "confirmed";
            const canReview =
              booking.bookingStatus === "completed" &&
              !booking.reviewSubmitted &&
              booking.paymentStatus === "paid";

            const canEditReview =
              booking.bookingStatus === "completed" &&
              booking.reviewSubmitted;

            return (
              <div className="bookingHistoryCard" key={booking._id}>
                <div className="bookingHistoryCardBody">
                  <div className="bookingHistoryTop">
                    <div className="bookingHistoryTopLeft">
                      <h3>{booking.serviceTitle || "Booking"}</h3>
                      <p>{booking.provider?.businessName || "Provider"}</p>
                    </div>

                    <div className="bookingHistoryPrice">₹{booking.amount}</div>
                  </div>

                  <div className="bookingHistoryContent">
                    <div className="bookingHistoryInfo">
                      <div>
                        Booking Ref: <span>{booking.bookingRef || "-"}</span>
                      </div>

                      <div>
                        Service Type:{" "}
                        <span>
                          {booking.serviceType === "vehicle"
                            ? "Vehicle Service"
                            : "Travel Planner"}
                        </span>
                      </div>

                      <div>
                        Travel Date:{" "}
                        <span>
                          {booking.bookingDate
                            ? new Date(booking.bookingDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div>
                        Payment: <span>{formatStatusLabel(booking.paymentStatus)}</span>
                      </div>

                      <div>
                        Booking Status:{" "}
                        <span>{formatStatusLabel(booking.bookingStatus)}</span>
                      </div>

                      <div>
                        People: <span>{booking.peopleCount ?? "-"}</span>
                      </div>

                      <div>
                        Days: <span>{booking.days ?? "-"}</span>
                      </div>

                      <div>
                        Unit Price: <span>₹{booking.unitPrice ?? 0}</span>
                      </div>

                      {booking.destination ? (
                        <div>
                          Destination: <span>{booking.destination}</span>
                        </div>
                      ) : null}

                      {booking.place ? (
                        <div>
                          Place: <span>{booking.place}</span>
                        </div>
                      ) : null}

                      {booking.selectedVehicleTitle ? (
                        <div>
                          Vehicle: <span>{booking.selectedVehicleTitle}</span>
                        </div>
                      ) : null}

                      {booking.selectedPackageTitle ? (
                        <div>
                          Package: <span>{booking.selectedPackageTitle}</span>
                        </div>
                      ) : null}
                    </div>

                    {isCancelled && booking.cancellationReason ? (
                      <div className="bookingHistoryAlert bookingHistoryAlertDanger">
                        Cancellation Reason: {booking.cancellationReason}
                      </div>
                    ) : null}

                    {isConfirmed ? (
                      <div className="bookingHistoryAlert bookingHistoryAlertSuccess">
                        Your booking is confirmed and paid successfully.
                      </div>
                    ) : null}

                    <div className="bookingHistoryActions">
                      <button
                        className="bookingHistoryBtn"
                        onClick={() => navigate(`/profile/bookings/${booking._id}`)}
                      >
                        View Details
                      </button>

                      {canReview ? (
                        <button
                          className="bookingHistoryReviewBtn"
                          onClick={() =>
                            navigate(`/profile/bookings/${booking._id}/review`)
                          }
                        >
                          Write Review
                        </button>
                      ) : canEditReview ? (
                        <button
                          className="bookingHistoryEditBtn"
                          onClick={() =>
                            navigate(`/profile/bookings/${booking._id}/review`)
                          }
                        >
                          Edit Review
                        </button>
                      ) : (
                        <div className="bookingHistoryActionPlaceholder" />
                      )}

                      <button
                        className="bookingHistoryBtn"
                        onClick={() => navigate(`/profile/bookings/${booking._id}/invoice`)}
                      >
                        Invoice
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}