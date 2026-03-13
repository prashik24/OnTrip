import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./ProviderDashboard.css";

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");

  async function load() {
    try {
      const data = await apiFetch("/api/bookings/provider");
      setBookings(data.bookings || []);
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, bookingStatus) {
    try {
      await apiFetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ bookingStatus }),
      });
      await load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="providerDashboardPage container">
      <section className="providerDashboardHero">
        <h1>Provider Dashboard</h1>
        <p>
          Manage customer bookings, payment status, trip details, and booking progress in one clean dashboard.
        </p>
      </section>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      <div className="providerDashboardGrid">
        {bookings.map((booking) => (
          <article className="providerDashboardCard" key={booking._id}>
            <div className="providerDashboardTop">
              <div>
                <h3>{booking.serviceTitle}</h3>
                <p>{booking.provider?.businessName || "Service"}</p>
              </div>

              <div className={`providerDashboardStatus providerDashboardStatus--${booking.bookingStatus}`}>
                {booking.bookingStatus}
              </div>
            </div>

            <div className="providerDashboardInfo">
              <div><strong>Customer:</strong> {booking.user?.name || "User"}</div>
              <div><strong>Email:</strong> {booking.user?.email || booking.contactEmail || "N/A"}</div>
              <div><strong>Phone:</strong> {booking.contactPhone || "N/A"}</div>
              <div><strong>Date:</strong> {new Date(booking.travelDate || booking.bookingDate).toLocaleDateString()}</div>
              <div><strong>People:</strong> {booking.peopleCount || 1}</div>
              <div><strong>Days:</strong> {booking.days || 1}</div>
              <div><strong>Destination / Place:</strong> {booking.destination || booking.place || "N/A"}</div>
              <div><strong>Amount:</strong> ₹{booking.amount}</div>
              <div><strong>Payment:</strong> {booking.paymentStatus}</div>
            </div>

            <div className="providerDashboardActions">
              <button
                className="providerDashboardBtn confirm"
                onClick={() => updateStatus(booking._id, "confirmed")}
              >
                Confirm
              </button>

              <button
                className="providerDashboardBtn complete"
                onClick={() => updateStatus(booking._id, "completed")}
              >
                Complete
              </button>

              <button
                className="providerDashboardBtn cancel"
                onClick={() => updateStatus(booking._id, "cancelled")}
              >
                Cancel
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}