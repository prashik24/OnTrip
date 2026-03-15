import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingSuccess.css";

export default function BookingSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/bookings/${id}`);
        setBooking(data.booking);
      } catch (err) {
        setMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id]);

  if (loading) {
    return <LoadingSpinner text="Loading booking details..." />;
  }

  if (!booking) {
    return (
      <div className="bookingSuccessPage container">
        <div className="bookingSuccessMessage">{msg || "Booking not found."}</div>
      </div>
    );
  }

  return (
    <div className="bookingSuccessPage container">
      <div className="bookingSuccessCard">
        <div className="bookingSuccessTop">
          <div>
            <div className="bookingSuccessBadge">Booking Placed Successfully</div>
            <h1>Thank you for booking with OnTrip</h1>
            <p>
              Your payment is successful and your booking has been confirmed.
            </p>
          </div>

          {booking.bookingImage ? (
            <div className="bookingSuccessThumb">
              <img src={booking.bookingImage} alt={booking.serviceTitle} />
            </div>
          ) : null}
        </div>

        <div className="bookingSuccessInfoGrid">
          <div className="bookingSuccessInfoItem">
            <strong>Booking ID</strong>
            <span>{booking.bookingCode}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Service</strong>
            <span>{booking.serviceTitle}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Provider</strong>
            <span>{booking.provider?.businessName || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Booking Date</strong>
            <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Vehicle</strong>
            <span>{booking.selectedVehicleTitle || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Package</strong>
            <span>{booking.selectedPackageTitle || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Destination</strong>
            <span>{booking.destination || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Place</strong>
            <span>{booking.place || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Days</strong>
            <span>{booking.days || 1}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>People</strong>
            <span>{booking.peopleCount || 1}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Pricing</strong>
            <span>{booking.pricingLabel || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem amount">
            <strong>Total Paid</strong>
            <span>₹{booking.amount}</span>
          </div>
        </div>

        {booking.notes ? (
          <div className="bookingSuccessNotes">
            <strong>Notes</strong>
            <p>{booking.notes}</p>
          </div>
        ) : null}

        <div className="bookingSuccessActions">
          <button
            className="bookingSuccessBtn"
            onClick={() => navigate(`/booking-invoice/${booking._id}`)}
          >
            View Invoice
          </button>

          <button
            className="bookingSuccessBtn"
            onClick={() =>
              window.open(
                `${import.meta.env.VITE_API_URL}/api/bookings/${booking._id}/invoice`,
                "_blank"
              )
            }
          >
            Download Invoice PDF
          </button>

          <button
            className="bookingSuccessGhostBtn"
            onClick={() => navigate("/profile/bookings")}
          >
            Go to Booking History
          </button>
        </div>
      </div>
    </div>
  );
}