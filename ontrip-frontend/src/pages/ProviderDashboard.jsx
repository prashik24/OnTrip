import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDashboard.css";

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState("");
  const [reasonMap, setReasonMap] = useState({});

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
      setSavingId(id);
      await apiFetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          bookingStatus,
          statusReason:
            bookingStatus === "cancelled" ? reasonMap[id] || "" : "",
        }),
      });
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSavingId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading provider dashboard..." />;
  }

  return (
    <div className="providerDashboardPage container">
      <div className="providerDashboardHead">
        <h1>Provider Dashboard</h1>
        <p>Check customer bookings, payment status, completion, and cancellation updates.</p>
      </div>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="providerDashboardEmpty">
          No customer bookings yet. Incoming provider bookings will appear here.
        </div>
      ) : (
        <div className="providerDashboardGrid">
          {bookings.map((booking) => (
            <div className="providerDashboardCard" key={booking._id}>
              <div className="providerDashboardTop">
                <div>
                  <h3>{booking.serviceTitle}</h3>
                  <p>{booking.user?.name || "User"}</p>
                </div>

                <div className="providerDashboardPrice">₹{booking.amount}</div>
              </div>

              <div className="providerDashboardInfo">
                <div><strong>Booking ID:</strong> {booking.bookingCode}</div>
                <div><strong>Email:</strong> {booking.user?.email || booking.contactEmail || "-"}</div>
                <div><strong>Phone:</strong> {booking.contactPhone || "-"}</div>
                <div><strong>Date:</strong> {new Date(booking.bookingDate).toLocaleDateString()}</div>
                <div><strong>Payment:</strong> {booking.paymentStatus}</div>
                <div><strong>Status:</strong> {booking.bookingStatus}</div>
                {booking.statusReason ? (
                  <div><strong>Reason:</strong> {booking.statusReason}</div>
                ) : null}
              </div>

              <div>
                <label>Cancellation Reason (only if cancelling)</label>
                <textarea
                  rows={3}
                  value={reasonMap[booking._id] || ""}
                  onChange={(e) =>
                    setReasonMap((prev) => ({
                      ...prev,
                      [booking._id]: e.target.value,
                    }))
                  }
                  placeholder="Write reason for cancellation"
                />
              </div>

              <div className="providerDashboardActions">
                <button
                  className="providerDashboardBtn"
                  onClick={() => updateStatus(booking._id, "confirmed")}
                  disabled={savingId === booking._id}
                >
                  Confirm
                </button>

                <button
                  className="providerDashboardBtn"
                  onClick={() => updateStatus(booking._id, "completed")}
                  disabled={savingId === booking._id}
                >
                  Complete
                </button>

                <button
                  className="providerDashboardBtn danger"
                  onClick={() => updateStatus(booking._id, "cancelled")}
                  disabled={savingId === booking._id}
                >
                  Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}