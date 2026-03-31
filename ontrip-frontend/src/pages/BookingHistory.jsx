import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

function formatStatus(value) {
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

  useEffect(() => {
    loadBookings();
  }, []);

  async function loadBookings() {
    try {
      setLoading(true);
      setMsg("");
      const data = await apiFetch("/api/bookings/mine");
      setBookings(data.bookings || []);
    } catch (err) {
      setMsg(err.message || "Failed to load booking history.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking history..." />;
  }

  return (
    <div className="bookingHistoryPage container">
      <div className="bookingHistoryHead">
        <h1>Booking History</h1>
        <p>Track bookings, invoices, status, and reviews.</p>
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
                <div className="bookingHistoryCardBody">

                  {/* 🔥 TOP HEADER */}
                  <div className="bookingHistoryTop">
                    <div className="bookingHistoryTopLeft">
                      <h3>{booking.serviceTitle}</h3>
                      <p>{booking.provider?.businessName || "Provider"}</p>
                    </div>

                    <div>
                      <div className="bookingHistoryPrice">
                        ₹{booking.amount}
                      </div>

                      <div style={{ marginTop: 6, fontSize: 13 }}>
                        {formatStatus(booking.paymentStatus)} •{" "}
                        {formatStatus(booking.bookingStatus)}
                      </div>
                    </div>
                  </div>

                  {/* 🔥 BODY CONTENT */}
                  <div className="bookingHistoryContent">
                    <div className="bookingHistoryInfo">
                      <div>
                        <strong>Booking Ref</strong>
                        <span>{booking.bookingRef}</span>
                      </div>

                      <div>
                        <strong>Date</strong>
                        <span>
                          {booking.bookingDate
                            ? new Date(booking.bookingDate).toLocaleDateString()
                            : "-"}
                        </span>
                      </div>

                      <div>
                        <strong>People</strong>
                        <span>{booking.peopleCount}</span>
                      </div>

                      <div>
                        <strong>Days</strong>
                        <span>{booking.days}</span>
                      </div>

                      {booking.destination && (
                        <div>
                          <strong>Destination</strong>
                          <span>{booking.destination}</span>
                        </div>
                      )}

                      {booking.place && (
                        <div>
                          <strong>Place</strong>
                          <span>{booking.place}</span>
                        </div>
                      )}
                    </div>

                    {/* 🔥 ALERTS */}
                    {booking.cancellationReason && (
                      <div className="bookingHistoryAlert bookingHistoryAlertDanger">
                        <strong>Cancellation Reason:</strong>{" "}
                        {booking.cancellationReason}
                      </div>
                    )}

                    {isCancelled && (
                      <div className="bookingHistoryAlert bookingHistoryAlertSuccess">
                        Your provider cancelled this service. They will refund your
                        money soon.
                      </div>
                    )}

                    {/* 🔥 ACTION BUTTONS */}
                    <div className="bookingHistoryActions">
                      <button
                        className="bookingHistoryBtn"
                        onClick={() =>
                          navigate(`/profile/bookings/${booking._id}`)
                        }
                      >
                        View Details
                      </button>

                      <button
                        className="bookingHistoryBtn"
                        onClick={() =>
                          navigate(`/profile/bookings/${booking._id}/invoice`)
                        }
                      >
                        View Invoice
                      </button>

                      {!isCancelled && booking.canReview ? (
                        <button
                          className={
                            booking.existingReview
                              ? "bookingHistoryEditBtn"
                              : "bookingHistoryReviewBtn"
                          }
                          onClick={() =>
                            navigate(`/profile/bookings/${booking._id}/review`)
                          }
                        >
                          {booking.existingReview
                            ? "Edit Review"
                            : "Write Review"}
                        </button>
                      ) : (
                        <div className="bookingHistoryActionPlaceholder" />
                      )}
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