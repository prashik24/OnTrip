import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderDashboard.css";

function formatStatusLabel(value) {
  if (!value) return "-";
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function ProviderDashboard() {
  const [bookings, setBookings] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingId, setLoadingId] = useState("");
  const [cancelReasons, setCancelReasons] = useState({});

  async function load() {
    try {
      setLoading(true);
      const data = await apiFetch("/api/bookings/provider");
      const bookingList = data.bookings || [];

      setBookings(bookingList);

      const next = {};
      bookingList.forEach((booking) => {
        next[booking._id] = booking.cancellationReason || "";
      });
      setCancelReasons(next);
    } catch (err) {
      setMsg(err.message || "Failed to load provider bookings.");
    } finally {
      setLoading(false);
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
      setMsg(err.message || "Failed to update booking status.");
    } finally {
      setLoadingId("");
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading provider dashboard..." />;
  }

  return (
    <div className="providerDashboardPage container">
      <div className="providerDashboardHead">
        <h1>Provider Dashboard</h1>
        <p>View customer bookings, statuses, cancellation reason, and updates.</p>
      </div>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      {bookings.length === 0 ? (
        <div className="providerDashboardEmpty">No customer bookings found yet.</div>
      ) : (
        <div className="providerDashboardGrid">
          {bookings.map((booking) => {
            const isCancelled = booking.bookingStatus === "cancelled";
            const isLoadingThis = loadingId === booking._id;

            return (
              <div className="providerDashboardCard" key={booking._id}>
                <div
                  className={`providerDashboardTop ${
                    isCancelled ? "cancelled" : ""
                  }`}
                >
                  <div>
                    <h3>{booking.serviceTitle}</h3>
                    <p>Customer: {booking.user?.name || booking.contactName || "User"}</p>
                  </div>
                  <div className="providerDashboardPrice">₹{booking.amount}</div>
                </div>

                <div className="providerDashboardBody">
                  <div className="providerDashboardStatusRow">
                    <span
                      className={`providerDashboardStatusBadge ${booking.paymentStatus || ""}`}
                    >
                      {formatStatusLabel(booking.paymentStatus)}
                    </span>
                    <span
                      className={`providerDashboardStatusBadge ${booking.bookingStatus || ""}`}
                    >
                      {formatStatusLabel(booking.bookingStatus)}
                    </span>
                  </div>

                  <div className="providerDashboardInfo">
                    <div>
                      <strong>Email</strong>
                      <span>{booking.user?.email || booking.contactEmail || "-"}</span>
                    </div>

                    <div>
                      <strong>Phone</strong>
                      <span>{booking.contactPhone || "-"}</span>
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
                      <span>{booking.peopleCount ?? "-"}</span>
                    </div>

                    <div>
                      <strong>Days</strong>
                      <span>{booking.days ?? "-"}</span>
                    </div>

                    {booking.destination ? (
                      <div>
                        <strong>Destination</strong>
                        <span>{booking.destination}</span>
                      </div>
                    ) : null}

                    {booking.place ? (
                      <div>
                        <strong>Place</strong>
                        <span>{booking.place}</span>
                      </div>
                    ) : null}

                    {isCancelled && booking.cancellationReason ? (
                      <div className="providerDashboardInfoWide providerDashboardCancelInfo">
                        <strong>Cancellation Reason</strong>
                        <span>{booking.cancellationReason}</span>
                      </div>
                    ) : null}
                  </div>

                  {!isCancelled && (
                    <div className="providerDashboardCancelWrap">
                      <label htmlFor={`cancel-reason-${booking._id}`}>
                        Cancellation Reason
                      </label>
                      <textarea
                        id={`cancel-reason-${booking._id}`}
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
                    {!isCancelled ? (
                      <>
                        <button
                          className="providerDashboardBtn primary"
                          onClick={() => updateStatus(booking._id, "confirmed")}
                          disabled={isLoadingThis}
                        >
                          {isLoadingThis ? "Updating..." : "Confirm"}
                        </button>

                        <button
                          className="providerDashboardBtn success"
                          onClick={() => updateStatus(booking._id, "completed")}
                          disabled={isLoadingThis}
                        >
                          {isLoadingThis ? "Updating..." : "Complete"}
                        </button>

                        <button
                          className="providerDashboardBtn danger"
                          onClick={() => updateStatus(booking._id, "cancelled")}
                          disabled={isLoadingThis}
                        >
                          {isLoadingThis ? "Updating..." : "Cancel"}
                        </button>
                      </>
                    ) : (
                      <button className="providerDashboardBtn danger" disabled>
                        Service Cancelled
                      </button>
                    )}
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