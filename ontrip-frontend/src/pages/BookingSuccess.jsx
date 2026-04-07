import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingSuccess.css";

const API_URL = import.meta.env.VITE_API_URL;

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

export default function BookingSuccess() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadBooking() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/bookings/${id}`);
        setBooking(data.booking);
      } catch (err) {
        setMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadBooking();
  }, [id]);

  const selectedVehicle = useMemo(() => {
    if (!booking?.provider?.vehicles?.length || !booking?.selectedVehicleTitle) return null;

    const selectedTitle = normalizeText(booking.selectedVehicleTitle);

    return (
      booking.provider.vehicles.find(
        (vehicle) =>
          normalizeText(vehicle.title) === selectedTitle ||
          normalizeText(vehicle.vehicleType) === selectedTitle
      ) || null
    );
  }, [booking]);

  const travelPlans = useMemo(() => {
    if (!booking?.provider) return [];

    if (booking.provider.travelPlans?.length > 0) {
      return booking.provider.travelPlans;
    }

    if (
      booking.provider.travelPlanner?.packageTitle ||
      booking.provider.travelPlanner?.durationText ||
      booking.provider.travelPlanner?.images?.length
    ) {
      return [booking.provider.travelPlanner];
    }

    return [];
  }, [booking]);

  const selectedTravelPlan = useMemo(() => {
    if (!travelPlans.length || !booking?.selectedPackageTitle) return null;

    const selectedTitle = normalizeText(booking.selectedPackageTitle);

    return (
      travelPlans.find(
        (trip) =>
          normalizeText(trip.packageTitle) === selectedTitle ||
          normalizeText(trip.plannerMode) === selectedTitle
      ) || null
    );
  }, [travelPlans, booking]);

  const displayTitle = useMemo(() => {
    if (!booking) return "";

    if (booking.serviceType === "vehicle") {
      return (
        booking.selectedVehicleTitle ||
        selectedVehicle?.title ||
        booking.serviceTitle ||
        "Vehicle Service"
      );
    }

    return (
      booking.selectedPackageTitle ||
      selectedTravelPlan?.packageTitle ||
      booking.serviceTitle ||
      "Travel Planner Service"
    );
  }, [booking, selectedVehicle, selectedTravelPlan]);

  const heroImage = useMemo(() => {
    if (!booking?.provider) return "";

    if (booking.serviceType === "vehicle") {
      return (
        selectedVehicle?.images?.[0]?.url ||
        booking.provider?.vehicles?.[0]?.images?.[0]?.url ||
        booking.provider?.serviceImage?.url ||
        ""
      );
    }

    return (
      selectedTravelPlan?.images?.[0]?.url ||
      booking.provider?.travelPlans?.[0]?.images?.[0]?.url ||
      booking.provider?.travelPlanner?.images?.[0]?.url ||
      booking.provider?.serviceImage?.url ||
      ""
    );
  }, [booking, selectedVehicle, selectedTravelPlan]);

  async function downloadInvoice() {
    try {
      setDownloading(true);
      const token = localStorage.getItem("ontrip_token");

      const res = await fetch(`${API_URL}/api/bookings/${id}/invoice`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to download invoice");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${booking.bookingRef}-invoice.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking details..." />;
  }

  if (!booking) {
    return (
      <div className="bookingSuccessPage container">
        <div className="bookingSuccessMessage">{msg || "Booking not found."}</div>
      </div>
    );
  }

  const isCancelled = booking.bookingStatus === "cancelled";

  return (
    <div className="bookingSuccessPage container">
      {msg && <div className="bookingSuccessMessage">{msg}</div>}

      <div className="bookingSuccessCard">
        <div className={`bookingSuccessBanner ${isCancelled ? "cancelled" : ""}`}>
          <div className="bookingSuccessBannerLeft">
            <h1>{isCancelled ? "Booking Cancelled" : "Booking Placed Successfully"}</h1>
            <p>
              {isCancelled
                ? "Your provider cancelled this booking. They will refund your money soon."
                : "Your payment was completed and your booking is confirmed."}
            </p>
          </div>

          <div className="bookingSuccessBannerRight">
            <div className="bookingSuccessRef">{booking.bookingRef}</div>
            <div className="bookingSuccessPaidTop">Paid: ₹{booking.amount}</div>
          </div>
        </div>

        <div className="bookingSuccessTop">
          <div className="bookingSuccessImageWrap">
            {heroImage ? (
              <img src={heroImage} alt={displayTitle} className="bookingSuccessImage" />
            ) : (
              <div className="bookingSuccessImageEmpty">No Image</div>
            )}
          </div>

          <div className="bookingSuccessSummary">
            <div className="bookingSuccessType">
              {booking.serviceType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
            </div>
            <h2>{displayTitle}</h2>
            <p>{booking.provider?.businessName || "Provider"}</p>

            <div className="bookingSuccessMeta">
              <span>Travel Date: {new Date(booking.bookingDate).toLocaleDateString()}</span>
              <span>Payment: {booking.paymentStatus}</span>
              <span>Status: {booking.bookingStatus}</span>
            </div>

            {isCancelled && booking.cancellationReason ? (
              <div className="bookingSuccessCancelReason">
                Reason: {booking.cancellationReason}
              </div>
            ) : null}
          </div>
        </div>

        <div className="bookingSuccessInfoGrid">
          <div className="bookingSuccessInfoItem">
            <strong>Customer</strong>
            <span>{booking.contactName}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Phone</strong>
            <span>{booking.contactPhone}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Email</strong>
            <span>{booking.contactEmail || "-"}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>People</strong>
            <span>{booking.peopleCount}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Days</strong>
            <span>{booking.days}</span>
          </div>

          <div className="bookingSuccessInfoItem">
            <strong>Unit Price</strong>
            <span>₹{booking.unitPrice}</span>
          </div>

          {booking.destination ? (
            <div className="bookingSuccessInfoItem">
              <strong>Destination</strong>
              <span>{booking.destination}</span>
            </div>
          ) : null}

          {booking.place ? (
            <div className="bookingSuccessInfoItem">
              <strong>Place</strong>
              <span>{booking.place}</span>
            </div>
          ) : null}

          {booking.selectedVehicleTitle ? (
            <div className="bookingSuccessInfoItem">
              <strong>Vehicle</strong>
              <span>{booking.selectedVehicleTitle}</span>
            </div>
          ) : null}

          {booking.selectedPackageTitle ? (
            <div className="bookingSuccessInfoItem">
              <strong>Package</strong>
              <span>{booking.selectedPackageTitle}</span>
            </div>
          ) : null}
        </div>

        {booking.notes ? (
          <div className="bookingSuccessNotes">
            <strong>Notes</strong>
            <p>{booking.notes}</p>
          </div>
        ) : null}

        <div className="bookingSuccessActions">
          <button
            className="bookingSuccessPrimaryBtn"
            onClick={downloadInvoice}
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download Invoice PDF"}
          </button>

          <button
            className="bookingSuccessGhostBtn"
            onClick={() => navigate("/profile/bookings")}
          >
            Go to Booking History
          </button>
        </div>
      </div>
    </div>
  );
}