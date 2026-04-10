import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderUpcomingBookings.css";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getDaysLeftLabel(bookingDate) {
  const now = new Date();
  const target = new Date(bookingDate);

  const startNow = new Date(now);
  startNow.setHours(0, 0, 0, 0);

  const startTarget = new Date(target);
  startTarget.setHours(0, 0, 0, 0);

  const diffMs = startTarget.getTime() - startNow.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `${diffDays} days left`;
}

export default function ProviderUpcomingBookings() {
  const navigate = useNavigate();
  const user = getUser();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (user?.role !== "provider") {
      navigate("/profile");
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch("/api/upcoming-bookings/provider");
        setBookings(data.bookings || []);
      } catch (err) {
        setMsg(err.message || "Failed to load upcoming bookings.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [navigate, user?.role]);

  const normalized = useMemo(() => {
    return bookings.map((b) => ({
      ...b,
      daysLeft: getDaysLeftLabel(b.bookingDate),
    }));
  }, [bookings]);

  if (loading) {
    return <LoadingSpinner text="Loading upcoming bookings..." />;
  }

  return (
    <div className="providerUpcomingPage container">
      <div className="providerUpcomingHead">
        <div>
          <h1>Upcoming Customer Bookings</h1>
          <p>Only future bookings are shown here.</p>
        </div>

        <button
          className="providerUpcomingTopBtn"
          onClick={() => navigate("/provider/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {msg ? <div className="providerUpcomingMessage">{msg}</div> : null}

      {normalized.length === 0 ? (
        <div className="providerUpcomingEmpty">
          No upcoming bookings.
        </div>
      ) : (
        <div className="providerUpcomingGrid">
          {normalized.map((b) => (
            <div className="providerUpcomingCard" key={b._id}>
              <div className="providerUpcomingTop">
                <h3>{b.serviceTitle || "Booking"}</h3>
                <span>{b.daysLeft}</span>
              </div>

              <div className="providerUpcomingInfo">
                <div>
                  <strong>Booking ID</strong>
                  <span>{b.bookingRef}</span>
                </div>

                <div>
                  <strong>Date</strong>
                  <span>{formatDateTime(b.bookingDate)}</span>
                </div>

                <div>
                  <strong>Customer</strong>
                  <span>{b.contactName}</span>
                </div>

                <div>
                  <strong>Phone</strong>
                  <span>{b.contactPhone}</span>
                </div>

                <div>
                  <strong>People</strong>
                  <span>{b.peopleCount}</span>
                </div>

                <div>
                  <strong>Days</strong>
                  <span>{b.days}</span>
                </div>

                <div>
                  <strong>Amount</strong>
                  <span>₹{b.amount}</span>
                </div>
              </div>

              <div className="providerUpcomingActions">
                <button
                  onClick={() => navigate(`/profile/bookings/${b._id}`)}
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}