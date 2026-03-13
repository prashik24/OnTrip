import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

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
    <div className="container providersPlatformPage">
      <div className="providerSearch card">
        <h2 className="providerSectionTitle">Provider Dashboard</h2>
        <p className="providerSectionSub">
          Customer bookings, payment details and booking status.
        </p>
      </div>

      {msg && <div className="providerMessage error">{msg}</div>}

      <div className="providerGrid">
        {bookings.map((booking) => (
          <div className="providerCard card" key={booking._id}>
            <div className="providerBody">
              <div className="providerCardTitle">{booking.serviceTitle}</div>
              <div className="providerMetaText">
                Customer: {booking.user?.name || "User"}
              </div>
              <div className="providerMiniItem">Email: {booking.user?.email || "N/A"}</div>
              <div className="providerMiniItem">Phone: {booking.contactPhone}</div>
              <div className="providerMiniItem">
                Booking Date: {new Date(booking.bookingDate).toLocaleDateString()}
              </div>
              <div className="providerMiniItem">People: {booking.peopleCount}</div>
              <div className="providerMiniItem">Amount: ₹{booking.amount}</div>
              <div className="providerMiniItem">Payment: {booking.paymentStatus}</div>
              <div className="providerMiniItem">Status: {booking.bookingStatus}</div>

              <div className="providerCardActions">
                <button className="btn" onClick={() => updateStatus(booking._id, "confirmed")}>
                  Confirm
                </button>
                <button className="btn" onClick={() => updateStatus(booking._id, "completed")}>
                  Complete
                </button>
                <button className="btn" onClick={() => updateStatus(booking._id, "cancelled")}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}