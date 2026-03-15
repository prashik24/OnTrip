import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "./ProviderDashboard.css";

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loadingId, setLoadingId] = useState("");
  const [cancelReasons, setCancelReasons] = useState({});

  async function load() {
    try {
      const data = await apiFetch("/api/bookings/provider");
      setBookings(data.bookings || []);

      const next = {};
      (data.bookings || []).forEach((booking) => {
        next[booking._id] = booking.cancellationReason || "";
      });
      setCancelReasons(next);
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function updateStatus(id, bookingStatus) {
    try {
      setLoadingId(id);
      setMsg("");

      const response = await apiFetch(`/api/bookings/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({
          bookingStatus,
          cancellationReason:
            bookingStatus === "cancelled" ? cancelReasons[id] || "" : "",
        }),
      });

      setMsg(response.message || "Status updated successfully.");
      await load();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setLoadingId("");
    }
  }

  return (
    <div className="providerDashboardPage container">
      <div className="providerDashboardHead">
        <h1>Provider Dashboard</h1>
        <p>View customer bookings, statuses, cancellation reason, and updates.</p>
      </div>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="providerDashboardEmpty">
          No customer bookings found yet.
        </div>
      ) : (
        <div className="providerDashboardGrid">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";

            return (
              <div className="providerDashboardCard" key={booking._id}>
                <div className="providerDashboardTop">
                  <div>
                    <h3>{booking.serviceTitle}</h3>
                    <p>Customer: {booking.user?.name || "User"}</p>
                  </div>
                  <div className="providerDashboardPrice">₹{booking.amount}</div>
                </div>

                <div className="providerDashboardInfo">
                  <div>Email: {booking.user?.email || booking.contactEmail || "-"}</div>
                  <div>Phone: {booking.contactPhone}</div>
                  <div>Date: {new Date(booking.bookingDate).toLocaleDateString()}</div>
                  <div>Payment: {booking.paymentStatus}</div>
                  <div>Status: {booking.bookingStatus}</div>
                  <div>People: {booking.peopleCount}</div>
                  <div>Days: {booking.days}</div>
                  {booking.destination ? <div>Destination: {booking.destination}</div> : null}
                  {booking.place ? <div>Place: {booking.place}</div> : null}
                  {isCancelled && booking.cancellationReason ? (
                    <div>Cancellation Reason: {booking.cancellationReason}</div>
                  ) : null}
                </div>

                {!isCancelled && (
                  <div>
                    <label style={{ display: "block", marginBottom: 8, fontWeight: 650 }}>
                      Cancellation Reason
                    </label>
                    <textarea
                      style={{
                        width: "100%",
                        minHeight: 90,
                        border: "1px solid rgba(11, 27, 42, 0.12)",
                        borderRadius: 12,
                        padding: "12px 14px",
                        font: "inherit",
                        resize: "vertical",
                        outline: "none",
                      }}
                      value={cancelReasons[booking._id] || ""}
                      onChange={(e) =>
                        setCancelReasons((prev) => ({
                          ...prev,
                          [booking._id]: e.target.value,
                        }))
                      }
                      placeholder="Reason only if cancelling..."
                    />
                  </div>
                )}

                <div className="providerDashboardActions">
                  {!isCancelled && (
                    <>
                      <button
                        className="providerDashboardBtn"
                        onClick={() => updateStatus(booking._id, "confirmed")}
                        disabled={loadingId === booking._id}
                      >
                        Confirm
                      </button>
                      <button
                        className="providerDashboardBtn"
                        onClick={() => updateStatus(booking._id, "completed")}
                        disabled={loadingId === booking._id}
                      >
                        Complete
                      </button>
                      <button
                        className="providerDashboardBtn danger"
                        onClick={() => updateStatus(booking._id, "cancelled")}
                        disabled={loadingId === booking._id}
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {isCancelled && (
                    <button className="providerDashboardBtn danger" disabled>
                      Service Cancelled
                    </button>
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