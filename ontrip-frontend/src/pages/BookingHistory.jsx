import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./BookingHistory.css";

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
    <div className="bookingHistoryPage container">
      <section className="bookingHistoryHero">
        <h1>Booking History</h1>
        <p>See your upcoming and previous bookings with status, pricing, and service details.</p>
      </section>

      {msg && <div className="bookingHistoryMessage">{msg}</div>}

      <div className="bookingHistoryGrid">
        {bookings.map((booking) => (
          <article className="bookingHistoryCard" key={booking._id}>
            <div className="bookingHistoryTop">
              <div>
                <h3>{booking.serviceTitle}</h3>
                <p>{booking.provider?.businessName || "Service"}</p>
              </div>

              <div className={`bookingStatus bookingStatus--${booking.bookingStatus}`}>
                {booking.bookingStatus}
              </div>
            </div>

            <div className="bookingHistoryInfo">
              <div><strong>Date:</strong> {new Date(booking.travelDate || booking.bookingDate).toLocaleDateString()}</div>
              <div><strong>Amount:</strong> ₹{booking.amount}</div>
              <div><strong>Payment:</strong> {booking.paymentStatus}</div>
              <div><strong>People:</strong> {booking.peopleCount || 1}</div>
              <div><strong>Days:</strong> {booking.days || 1}</div>
              <div><strong>Destination:</strong> {booking.destination || booking.place || "N/A"}</div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}