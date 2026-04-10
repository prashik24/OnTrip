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

function getBookingTitle(booking) {
  if (!booking) return "Booking";

  return (
    booking.serviceTitle ||
    booking.selectedPackageTitle ||
    booking.selectedVehicleTitle ||
    booking.provider?.businessName ||
    "Booking"
  );
}

function getBookingImage(booking) {
  if (!booking) return "";

  if (booking?.selectedVehicleImage?.url) {
    return booking.selectedVehicleImage.url;
  }

  if (booking?.selectedVehicleImage) {
    return booking.selectedVehicleImage;
  }

  if (booking?.selectedPackageImage?.url) {
    return booking.selectedPackageImage.url;
  }

  if (booking?.selectedPackageImage) {
    return booking.selectedPackageImage;
  }

  if (booking?.serviceImage?.url) {
    return booking.serviceImage.url;
  }

  if (booking?.serviceImage) {
    return booking.serviceImage;
  }

  if (booking?.provider?.serviceImage?.url) {
    return booking.provider.serviceImage.url;
  }

  if (booking?.provider?.serviceImage) {
    return booking.provider.serviceImage;
  }

  if (booking?.provider?.vehicles?.[0]?.images?.[0]?.url) {
    return booking.provider.vehicles[0].images[0].url;
  }

  if (booking?.provider?.travelPlans?.[0]?.images?.[0]?.url) {
    return booking.provider.travelPlans[0].images[0].url;
  }

  return "";
}

function formatAmount(value) {
  const amount = Number(value || 0);
  return `₹${amount.toFixed(2)}`;
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
    return bookings.map((booking) => ({
      ...booking,
      displayTitle: getBookingTitle(booking),
      imageUrl: getBookingImage(booking),
      daysLeft: getDaysLeftLabel(booking.bookingDate),
    }));
  }, [bookings]);

  if (loading) {
    return <LoadingSpinner text="Loading upcoming bookings..." />;
  }

  return (
    <div className="providerUpcomingPage container">
      <div className="providerUpcomingHead">
        <div className="providerUpcomingHeadLeft">
          <h1>Upcoming Customer Bookings</h1>
          <p>
            See all future customer bookings here. Past bookings are not shown
            on this page.
          </p>
        </div>

        <button
          className="providerUpcomingTopBtn"
          type="button"
          onClick={() => navigate("/provider/dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {msg ? <div className="providerUpcomingMessage">{msg}</div> : null}

      {normalized.length === 0 ? (
        <div className="providerUpcomingEmpty">No upcoming bookings.</div>
      ) : (
        <div className="providerUpcomingGrid">
          {normalized.map((booking) => (
            <div className="providerUpcomingCard" key={booking._id}>
              <div className="providerUpcomingCardTop">
                <div className="providerUpcomingBlueHeader">
                  <div className="providerUpcomingBlueHeaderLeft">
                    <h3>{booking.displayTitle}</h3>
                  </div>

                  <div className="providerUpcomingBlueHeaderRight">
                    <div className="providerUpcomingStatusBadge">
                      {booking.daysLeft}
                    </div>
                  </div>
                </div>
              </div>

              <div className="providerUpcomingCardBody">
                <div className="providerUpcomingTopSection">
                  <div className="providerUpcomingImageWrap">
                    {booking.imageUrl ? (
                      <img
                        src={booking.imageUrl}
                        alt={booking.displayTitle}
                        className="providerUpcomingImage"
                      />
                    ) : (
                      <div className="providerUpcomingImageEmpty">No Image</div>
                    )}
                  </div>

                  <div className="providerUpcomingSummaryCard">
                    <div className="providerUpcomingSummaryStats">
                      <div className="providerUpcomingSummaryRow">
                        <strong>Booking ID:</strong>
                        <span>{booking.bookingRef || "-"}</span>
                      </div>

                      <div className="providerUpcomingSummaryRow">
                        <strong>Date:</strong>
                        <span>{formatDateTime(booking.bookingDate)}</span>
                      </div>

                      <div className="providerUpcomingSummaryRow">
                        <strong>Amount:</strong>
                        <span>{formatAmount(booking.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="providerUpcomingHeroNote">
                  Please be ready before the customer booking date and keep your
                  service available on time.
                </div>

                <div className="providerUpcomingInfoGrid">
                  <div className="providerUpcomingInfoCard">
                    <strong>Customer</strong>
                    <span>{booking.contactName || "-"}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Phone</strong>
                    <span>{booking.contactPhone || "-"}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>People</strong>
                    <span>{booking.peopleCount || 1}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Days</strong>
                    <span>{booking.days || 1}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Status</strong>
                    <span>{booking.bookingStatus || "Upcoming"}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Service</strong>
                    <span>{booking.serviceTitle || booking.displayTitle || "-"}</span>
                  </div>
                </div>

                {booking.notes ? (
                  <div className="providerUpcomingContentBox">
                    <strong>Customer Note</strong>
                    <p>{booking.notes}</p>
                  </div>
                ) : null}

                <div className="providerUpcomingActions">
                  <button
                    className="providerUpcomingBtn"
                    type="button"
                    onClick={() => navigate(`/profile/bookings/${booking._id}`)}
                  >
                    View Booking
                  </button>

                  <button
                    className="providerUpcomingBtn primary"
                    type="button"
                    onClick={() =>
                      navigate(`/profile/bookings/${booking._id}/invoice`)
                    }
                  >
                    Open Invoice
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}