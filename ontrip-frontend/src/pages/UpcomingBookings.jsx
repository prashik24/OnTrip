import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./UpcomingBookings.css";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);

  return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function getBookingTitle(booking) {
  if (!booking) return "Booking";

  if (booking.serviceType === "vehicle") {
    return (
      booking.selectedVehicleTitle ||
      booking.serviceTitle ||
      booking.provider?.businessName ||
      "Vehicle Booking"
    );
  }

  return (
    booking.selectedPackageTitle ||
    booking.serviceTitle ||
    booking.provider?.businessName ||
    "Trip Booking"
  );
}

function getBookingImage(booking) {
  const provider = booking?.provider;

  if (!provider) return "";

  if (booking?.serviceType === "travel_planner") {
    const travelPlans =
      provider?.travelPlans?.length > 0
        ? provider.travelPlans
        : provider?.travelPlanner
        ? [provider.travelPlanner]
        : [];

    if (booking?.selectedPackageTitle) {
      const matchedPlan = travelPlans.find(
        (plan) =>
          String(plan.packageTitle || "").trim() ===
          String(booking.selectedPackageTitle || "").trim()
      );

      if (matchedPlan?.images?.[0]?.url) {
        return matchedPlan.images[0].url;
      }
    }

    if (travelPlans[0]?.images?.[0]?.url) {
      return travelPlans[0].images[0].url;
    }
  }

  if (booking?.serviceType === "vehicle") {
    if (booking?.selectedVehicleId) {
      const matchedVehicle = (provider?.vehicles || []).find(
        (vehicle) => String(vehicle._id) === String(booking.selectedVehicleId)
      );

      if (matchedVehicle?.images?.[0]?.url) {
        return matchedVehicle.images[0].url;
      }
    }

    if (booking?.selectedVehicleTitle) {
      const matchedVehicle = (provider?.vehicles || []).find((vehicle) => {
        const vehicleTitle = String(vehicle.title || "").trim().toLowerCase();
        const vehicleType = String(vehicle.vehicleType || "").trim().toLowerCase();
        const selectedTitle = String(booking.selectedVehicleTitle || "")
          .trim()
          .toLowerCase();

        return vehicleTitle === selectedTitle || vehicleType === selectedTitle;
      });

      if (matchedVehicle?.images?.[0]?.url) {
        return matchedVehicle.images[0].url;
      }
    }

    if (provider?.vehicles?.[0]?.images?.[0]?.url) {
      return provider.vehicles[0].images[0].url;
    }
  }

  return provider?.serviceImage?.url || "";
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

export default function UpcomingBookings() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    async function loadUpcomingBookings() {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch("/api/upcoming-bookings/user");
        setBookings(data.bookings || []);
      } catch (err) {
        setMsg(err.message || "Failed to load upcoming bookings.");
      } finally {
        setLoading(false);
      }
    }

    loadUpcomingBookings();
  }, [navigate]);

  const normalizedBookings = useMemo(() => {
    return bookings.map((booking) => ({
      ...booking,
      displayTitle: getBookingTitle(booking),
      imageUrl: getBookingImage(booking),
      daysLeftLabel: getDaysLeftLabel(booking.bookingDate),
    }));
  }, [bookings]);

  if (loading) {
    return <LoadingSpinner text="Loading upcoming bookings..." />;
  }

  return (
    <div className="upcomingBookingsPage container">
      <div className="upcomingBookingsHead">
        <div className="upcomingBookingsHeadLeft">
          <h1>Your Trip Is Coming</h1>
          <p>
            See only your upcoming trips and vehicle bookings. Past bookings are
            not shown here.
          </p>
        </div>

        <button
          className="upcomingBookingsTopBtn"
          type="button"
          onClick={() => navigate("/profile/bookings")}
        >
          Back to Booking History
        </button>
      </div>

      {msg ? <div className="upcomingBookingsMessage">{msg}</div> : null}

      {normalizedBookings.length === 0 ? (
        <div className="upcomingBookingsEmpty">
          No upcoming bookings found right now.
        </div>
      ) : (
        <div className="upcomingBookingsGrid">
          {normalizedBookings.map((booking) => (
            <div className="upcomingBookingCard" key={booking._id}>
              <div className="upcomingBookingCardTop">
                <div className="upcomingBookingBlueHeader">
                  <div className="upcomingBookingBlueHeaderLeft">
                    <h3>{booking.provider?.businessName || "OnTrip Booking"}</h3>
                  </div>

                  <div className="upcomingBookingBlueHeaderRight">
                    <div className="upcomingBookingStatusBadge">
                      {booking.daysLeftLabel}
                    </div>
                  </div>
                </div>
              </div>

              <div className="upcomingBookingCardBody">
                <div className="upcomingBookingTopSection">
                  <div className="upcomingBookingImageWrap">
                    {booking.imageUrl ? (
                      <img
                        src={booking.imageUrl}
                        alt={booking.displayTitle}
                        className="upcomingBookingImage"
                      />
                    ) : (
                      <div className="upcomingBookingImageEmpty">No Image</div>
                    )}
                  </div>

                  <div className="upcomingBookingSummaryCard">
                    <div className="upcomingBookingSummaryStats">
                      <div className="upcomingBookingSummaryRow">
                        <strong>Booking ID:</strong>
                        <span>{booking.bookingRef || "-"}</span>
                      </div>

                      <div className="upcomingBookingSummaryRow">
                        <strong>Service Type:</strong>
                        <span>
                          {booking.serviceType === "vehicle"
                            ? "Vehicle Service"
                            : "Travel Planner"}
                        </span>
                      </div>

                      <div className="upcomingBookingSummaryRow">
                        <strong>Travel Date:</strong>
                        <span>{formatDateTime(booking.bookingDate)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="upcomingBookingHeroNote">
                  Your trip is coming. Please be ready before your booking date.
                </div>

                <div className="upcomingBookingInfoGrid">
                  <div className="upcomingBookingInfoCard">
                    <strong>Title</strong>
                    <span>{booking.displayTitle}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Provider</strong>
                    <span>{booking.provider?.businessName || "-"}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Contact Name</strong>
                    <span>{booking.contactName || "-"}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Phone</strong>
                    <span>{booking.contactPhone || "-"}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Destination</strong>
                    <span>{booking.destination || "-"}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Place</strong>
                    <span>{booking.place || "-"}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Days</strong>
                    <span>{booking.days || 1}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>People</strong>
                    <span>{booking.peopleCount || 1}</span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Amount</strong>
                    <span>
                      ₹{Number(booking.amount || 0).toFixed(2)}
                    </span>
                  </div>

                  <div className="upcomingBookingInfoCard">
                    <strong>Status</strong>
                    <span>{booking.bookingStatus || "-"}</span>
                  </div>
                </div>

                {booking.notes ? (
                  <div className="upcomingBookingContentBox">
                    <strong>Note</strong>
                    <p>{booking.notes}</p>
                  </div>
                ) : null}

                <div className="upcomingBookingActions">
                  <button
                    className="upcomingBookingBtn"
                    type="button"
                    onClick={() => navigate(`/profile/bookings/${booking._id}`)}
                  >
                    View Booking
                  </button>

                  <button
                    className="upcomingBookingBtn primary"
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