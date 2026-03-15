import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDashboard.css";

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState("");

  async function load() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/bookings/provider");
      setBookings(data.bookings || []);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, bookingStatus) {
    try {
      setActionId(id + bookingStatus);
      await apiFetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ bookingStatus }),
      });
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setActionId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading provider dashboard..." />;
  }

  return (
    <div className="providerDashboardPage container">
      <div className="providerDashboardHead">
        <h1>Provider Dashboard</h1>
        <p>Track customer bookings, payments, and update booking status from one place.</p>
      </div>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="providerDashboardEmpty">No customer bookings yet.</div>
      ) : (
        <div className="providerDashboardGrid">
          {bookings.map((booking) => (
            <article className="providerDashboardCard" key={booking._id}>
              <div className="providerDashboardTop">
                <div>
                  <h3>{booking.serviceTitle}</h3>
                  <p>{booking.user?.name || "User"} • {booking.user?.email || "N/A"}</p>
                </div>

                <div className="providerDashboardPrice">₹{booking.amount}</div>
              </div>

              <div className="providerDashboardInfo">
                <div><strong>Phone:</strong> {booking.contactPhone}</div>
                <div><strong>Booking Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}</div>
                <div><strong>People:</strong> {booking.peopleCount}</div>
                <div><strong>Payment:</strong> {booking.paymentStatus}</div>
                <div><strong>Status:</strong> {booking.bookingStatus}</div>
              </div>

              <div className="providerDashboardActions">
                <button
                  className="providerDashboardBtn"
                  onClick={() => updateStatus(booking._id, "confirmed")}
                  disabled={actionId === booking._id + "confirmed"}
                >
                  {actionId === booking._id + "confirmed" ? "Updating..." : "Confirm"}
                </button>

                <button
                  className="providerDashboardBtn"
                  onClick={() => updateStatus(booking._id, "completed")}
                  disabled={actionId === booking._id + "completed"}
                >
                  {actionId === booking._id + "completed" ? "Updating..." : "Complete"}
                </button>

                <button
                  className="providerDashboardBtn danger"
                  onClick={() => updateStatus(booking._id, "cancelled")}
                  disabled={actionId === booking._id + "cancelled"}
                >
                  {actionId === booking._id + "cancelled" ? "Updating..." : "Cancel"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}