import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function BookingHistory() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await apiFetch("/api/bookings/mine");
        setBookings(data.bookings || []);
      } catch (err) {
        setMsg(err.message);
      }
    }
    load();
  }, []);

  return (
    <div className="container providersPlatformPage">
      <div className="providerSearch card">
        <h2 className="providerSectionTitle">Booking History</h2>
        <p className="providerSectionSub">
          See your upcoming and previous bookings with payment details.
        </p>
      </div>

      {msg && <div className="providerMessage error">{msg}</div>}

      <div className="providerGrid">
        {bookings.map((booking) => (
          <div className="providerCard card" key={booking._id}>
            <div className="providerBody">
              <div className="providerCardTitle">{booking.serviceTitle}</div>
              <div className="providerMetaText">
                Date: {new Date(booking.bookingDate).toLocaleDateString()}
              </div>
              <div className="providerMiniItem">People: {booking.peopleCount}</div>
              <div className="providerMiniItem">Amount: ₹{booking.amount}</div>
              <div className="providerMiniItem">Payment: {booking.paymentStatus}</div>
              <div className="providerMiniItem">Status: {booking.bookingStatus}</div>
              <div className="providerMiniItem">
                Destination: {booking.destination || "N/A"}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}