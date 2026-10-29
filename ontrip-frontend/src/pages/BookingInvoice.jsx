import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getUser } from "../lib/api";
import "./BookingInvoice.css";

export default function BookingInvoice() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pdfUrl, setPdfUrl] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    async function loadInvoice() {
      try {
        const token = localStorage.getItem("ontrip_token");

        const res = await fetch(
          `${import.meta.env.VITE_API_URL}/api/bookings/${id}/invoice`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Failed to load invoice.");
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        setMsg(err.message);
      }
    }

    loadInvoice();

    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [id]);

  return (
    <div className="bookingInvoicePage container">
      <div className="bookingInvoiceTop">
        <div>
          <h1>Invoice</h1>
          <p>Preview and download your paid booking invoice.</p>
        </div>

        <div className="bookingInvoiceActions">
          {pdfUrl ? (
            <a className="bookingInvoiceBtn" href={pdfUrl} download={`OnTrip-Invoice-${id}.pdf`}>
              Download PDF
            </a>
          ) : null}

          <button className="bookingInvoiceGhostBtn" onClick={() => navigate(-1)}>
            Back
          </button>
        </div>
      </div>

      {msg ? (
        <div className="bookingInvoiceMessage">{msg}</div>
      ) : pdfUrl ? (
        <div className="bookingInvoiceFrameWrap">
          <iframe
            title="Booking Invoice"
            src={pdfUrl}
            className="bookingInvoiceFrame"
          />
        </div>
      ) : (
        <div className="bookingInvoiceMessage">Loading invoice...</div>
      )}
    </div>
  );
}