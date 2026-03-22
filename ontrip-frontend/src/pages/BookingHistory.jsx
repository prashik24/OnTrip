import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingHistory.css";

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
                  <div className="bookingHistoryTop">
                    <div className="bookingHistoryTopLeft">
                      <h3>{booking.serviceTitle}</h3>
                      <p>{booking.provider?.businessName || "Provider"}</p>
                    </div>
                    <div className="bookingHistoryPrice">₹{booking.amount}</div>
                  </div>

                  <div className="bookingHistoryInfo">
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
                    <div className="bookingHistoryAlert bookingHistoryAlertDanger">
                      <strong>Cancellation Reason:</strong> {booking.cancellationReason}
                    </div>
                  ) : null}

                  {isCancelled ? (
                    <div className="bookingHistoryAlert bookingHistoryAlertSuccess">
                      Your provider cancelled this service. They will refund your
                      money soon.
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
                      {booking.existingReview ? "Edit Review" : "Write Review"}
                    </button>
                  ) : (
                    <div className="bookingHistoryActionPlaceholder" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}