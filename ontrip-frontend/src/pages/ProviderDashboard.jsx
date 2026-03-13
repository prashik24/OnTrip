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
          Manage customer bookings, payment state, trip requests, and booking
          progress from one clean dashboard.
        </p>
      </section>

      {msg && <div className="providerDashboardMessage">{msg}</div>}

      <section className="providerDashboardGrid">
        {bookings.length === 0 ? (
          <div className="providerDashboardEmpty">
            No customer bookings yet.
          </div>
        ) : (
          bookings.map((booking) => (
            <article className="providerDashboardCard" key={booking._id}>
              <div className="providerDashboardTop">
                <div>
                  <h3>{booking.serviceTitle}</h3>
                  <p>
                    {booking.provider?.businessName || "Service"} •{" "}
                    {booking.provider?.city || "N/A"}
                  </p>
                </div>

                <div
                  className={`providerDashboardStatus providerDashboardStatus--${booking.bookingStatus}`}
                >
                  {booking.bookingStatus}
                </div>
              </div>

              <div className="providerDashboardInfoGrid">
                <div className="providerDashboardInfoItem">
                  <strong>Customer</strong>
                  <span>{booking.user?.name || "User"}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Email</strong>
                  <span>{booking.user?.email || booking.contactEmail || "N/A"}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Phone</strong>
                  <span>{booking.contactPhone || "N/A"}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Date</strong>
                  <span>
                    {new Date(
                      booking.travelDate || booking.bookingDate
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>People</strong>
                  <span>{booking.peopleCount || 1}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Days</strong>
                  <span>{booking.days || 1}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Amount</strong>
                  <span>₹{booking.amount}</span>
                </div>

                <div className="providerDashboardInfoItem">
                  <strong>Payment</strong>
                  <span>{booking.paymentStatus}</span>
                </div>

                <div className="providerDashboardInfoItem providerDashboardInfoItem--full">
                  <strong>Destination / Place</strong>
                  <span>{booking.destination || booking.place || "N/A"}</span>
                </div>

                {booking.selectedVehicleTitle ? (
                  <div className="providerDashboardInfoItem providerDashboardInfoItem--full">
                    <strong>Selected Vehicle</strong>
                    <span>{booking.selectedVehicleTitle}</span>
                  </div>
                ) : null}

                {booking.selectedPackageTitle ? (
                  <div className="providerDashboardInfoItem providerDashboardInfoItem--full">
                    <strong>Selected Package</strong>
                    <span>{booking.selectedPackageTitle}</span>
                  </div>
                ) : null}

                {booking.notes ? (
                  <div className="providerDashboardInfoItem providerDashboardInfoItem--full">
                    <strong>Notes</strong>
                    <span>{booking.notes}</span>
                  </div>
                ) : null}
              </div>

              <div className="providerDashboardActions">
                <button
                  className="providerDashboardBtn providerDashboardBtn--confirm"
                  onClick={() => updateStatus(booking._id, "confirmed")}
                >
                  Confirm
                </button>

                <button
                  className="providerDashboardBtn providerDashboardBtn--complete"
                  onClick={() => updateStatus(booking._id, "completed")}
                >
                  Complete
                </button>

                <button
                  className="providerDashboardBtn providerDashboardBtn--cancel"
                  onClick={() => updateStatus(booking._id, "cancelled")}
                >
                  Cancel
                </button>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}