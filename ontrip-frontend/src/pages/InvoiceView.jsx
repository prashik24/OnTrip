import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./InvoiceView.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function InvoiceView() {
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

  const quantity = useMemo(() => {
    if (!booking) return 0;
    return booking.serviceType === "vehicle"
      ? Number(booking.days || 1)
      : Number(booking.peopleCount || 1);
  }, [booking]);

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
    return <LoadingSpinner text="Loading invoice..." />;
  }

  if (!booking) {
    return (
      <div className="invoiceViewPage container">
        <div className="invoiceViewMessage">{msg || "Invoice not found."}</div>
      </div>
    );
  }

  return (
    <div className="invoiceViewPage container">
      {msg && <div className="invoiceViewMessage">{msg}</div>}

      <div className="invoiceViewCard">
        <div className="invoiceViewHeader">
          <div>
            <div className="invoiceViewBrand">OnTrip</div>
            <h1>Invoice</h1>
            <p>{booking.bookingRef}</p>
          </div>
          <div className="invoiceViewStatus">
            <span>{booking.paymentStatus}</span>
            <span>{booking.bookingStatus}</span>
          </div>
        </div>

        <div className="invoiceViewGrid">
          <div className="invoiceViewBox">
            <strong>Billed To</strong>
            <span>{booking.contactName}</span>
            <span>{booking.contactEmail || "-"}</span>
            <span>{booking.contactPhone}</span>
          </div>

          <div className="invoiceViewBox">
            <strong>Service</strong>
            <span>{booking.serviceTitle}</span>
            <span>{booking.provider?.businessName || "Provider"}</span>
            <span>{new Date(booking.bookingDate).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="invoiceTableWrap">
          <table className="invoiceTable">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  {booking.serviceType === "vehicle"
                    ? booking.selectedVehicleTitle || booking.serviceTitle
                    : booking.selectedPackageTitle || booking.serviceTitle}
                </td>
                <td>{quantity}</td>
                <td>₹{booking.unitPrice}</td>
                <td>₹{booking.amount}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {booking.cancellationReason ? (
          <div className="invoiceViewReason">
            <strong>Cancellation Reason</strong>
            <p>{booking.cancellationReason}</p>
          </div>
        ) : null}

        <div className="invoiceViewActions">
          <button
            className="invoiceViewPrimaryBtn"
            onClick={downloadInvoice}
            disabled={downloading}
          >
            {downloading ? "Downloading..." : "Download PDF"}
          </button>

          <button
            className="invoiceViewGhostBtn"
            onClick={() => navigate(`/profile/bookings/${id}`)}
          >
            View Booking Details
          </button>
        </div>
      </div>
    </div>
  );
}