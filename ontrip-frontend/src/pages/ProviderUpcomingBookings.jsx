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

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
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

function getImageFromImageArray(images) {
  if (!Array.isArray(images) || images.length === 0) return "";
  return images[0]?.url || images[0] || "";
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
          normalizeText(plan?.packageTitle) ===
          normalizeText(booking.selectedPackageTitle)
      );

      const matchedPlanImage = getImageFromImageArray(matchedPlan?.images);
      if (matchedPlanImage) return matchedPlanImage;
    }

    if (booking?.serviceTitle) {
      const matchedPlan = travelPlans.find(
        (plan) =>
          normalizeText(plan?.packageTitle) === normalizeText(booking.serviceTitle)
      );

      const matchedPlanImage = getImageFromImageArray(matchedPlan?.images);
      if (matchedPlanImage) return matchedPlanImage;
    }

    const firstTravelPlanImage = getImageFromImageArray(travelPlans?.[0]?.images);
    if (firstTravelPlanImage) return firstTravelPlanImage;
  }

  if (booking?.serviceType === "vehicle") {
    const vehicles = provider?.vehicles || [];

    if (booking?.selectedVehicleId) {
      const matchedVehicle = vehicles.find(
        (vehicle) => String(vehicle?._id) === String(booking.selectedVehicleId)
      );

      const matchedVehicleImage = getImageFromImageArray(matchedVehicle?.images);
      if (matchedVehicleImage) return matchedVehicleImage;
    }

    if (booking?.selectedVehicleTitle) {
      const selectedTitle = normalizeText(booking.selectedVehicleTitle);

      const matchedVehicle = vehicles.find((vehicle) => {
        const vehicleTitle = normalizeText(vehicle?.title);
        const vehicleType = normalizeText(vehicle?.vehicleType);
        return vehicleTitle === selectedTitle || vehicleType === selectedTitle;
      });

      const matchedVehicleImage = getImageFromImageArray(matchedVehicle?.images);
      if (matchedVehicleImage) return matchedVehicleImage;
    }

    if (booking?.serviceTitle) {
      const serviceTitle = normalizeText(booking.serviceTitle);

      const matchedVehicle = vehicles.find((vehicle) => {
        const vehicleTitle = normalizeText(vehicle?.title);
        const vehicleType = normalizeText(vehicle?.vehicleType);
        return vehicleTitle === serviceTitle || vehicleType === serviceTitle;
      });

      const matchedVehicleImage = getImageFromImageArray(matchedVehicle?.images);
      if (matchedVehicleImage) return matchedVehicleImage;
    }

    const firstVehicleImage = getImageFromImageArray(vehicles?.[0]?.images);
    if (firstVehicleImage) return firstVehicleImage;
  }

  if (provider?.serviceImage?.url) {
    return provider.serviceImage.url;
  }

  if (provider?.serviceImage) {
    return provider.serviceImage;
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
                    <span>
                      {booking.contactName || booking.user?.name || "-"}
                    </span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Phone</strong>
                    <span>
                      {booking.contactPhone || booking.user?.phone || "-"}
                    </span>
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
                    <strong>Service Type</strong>
                    <span>
                      {booking.serviceType === "vehicle"
                        ? "Vehicle Service"
                        : "Travel Planner"}
                    </span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Service</strong>
                    <span>{booking.displayTitle || "-"}</span>
                  </div>

                  <div className="providerUpcomingInfoCard">
                    <strong>Email</strong>
                    <span>{booking.user?.email || "-"}</span>
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