import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./BookingCheckout.css";

function onlyPhone(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function BookingCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payLoading, setPayLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    contactName: user?.name || "",
    contactEmail: user?.email || "",
    contactPhone: "",
    bookingDate: "",
    peopleCount: 1,
    destination: "",
    notes: "",
    selectedVehicleTitle: "",
    days: 1,
  });

  useEffect(() => {
    async function loadProvider() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/providers/${id}`);
        setProvider(data.provider);
      } catch (err) {
        setMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProvider();
  }, [id]);

  const vehicleOptions = useMemo(() => {
    return (provider?.vehicles || []).map((vehicle) => ({
      label: `${vehicle.title || vehicle.vehicleType} — ₹${vehicle.price}`,
      value: vehicle.title || vehicle.vehicleType,
    }));
  }, [provider]);

  const amount = useMemo(() => {
    if (!provider) return 0;

    if (provider.listingType === "travel_planner") {
      const base = Number(provider.travelPlanner?.pricePerPerson || provider.travelPlanner?.priceFrom || 0);
      return base * Number(form.peopleCount || 1);
    }

    const selected = (provider.vehicles || []).find(
      (v) => (v.title || v.vehicleType) === form.selectedVehicleTitle
    );

    if (!selected) return 0;

    const multiplier = Number(form.days || 1);
    return Number(selected.price || 0) * multiplier;
  }, [provider, form]);

  async function startPayment(e) {
    e.preventDefault();

    if (form.contactPhone.length !== 10) {
      setMsg("Phone number must be 10 digits.");
      return;
    }

    try {
      setPayLoading(true);

      const data = await apiFetch("/api/bookings/create-order", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          bookingDate: form.bookingDate,
          peopleCount: Number(form.peopleCount),
          destination:
            provider.listingType === "vehicle"
              ? form.destination || form.selectedVehicleTitle
              : form.destination,
          notes:
            provider.listingType === "vehicle"
              ? `${form.notes || ""} Vehicle: ${form.selectedVehicleTitle} Days: ${form.days}`.trim()
              : form.notes,
          amount: Number(amount),
        }),
      });

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "OnTrip",
        description: provider.businessName,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            await apiFetch("/api/bookings/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                bookingId: data.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            navigate("/profile/bookings");
          } catch (err) {
            setMsg(err.message);
          } finally {
            setPayLoading(false);
          }
        },
        prefill: {
          name: form.contactName,
          email: form.contactEmail,
          contact: form.contactPhone,
        },
        theme: {
          color: "#00b8f1",
        },
      };

      const rz = new window.Razorpay(options);
      rz.open();
    } catch (err) {
      setMsg(err.message);
      setPayLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading booking page..." />;
  }

  if (!provider) {
    return (
      <div className="bookingCheckoutPage container">
        <div className="bookingCheckoutMessage">{msg || "Provider not found."}</div>
      </div>
    );
  }

  return (
    <div className="bookingCheckoutPage container">
      <div className="bookingCheckoutHead">
        <h1>Book Service</h1>
        <p>Complete your booking details and continue to payment securely.</p>
      </div>

      {msg && <div className="bookingCheckoutMessage">{msg}</div>}

      <form className="bookingCheckoutCard" onSubmit={startPayment}>
        <div className="bookingCheckoutGrid">
          <div className="fullSpan">
            <label>Service</label>
            <input value={provider.businessName} readOnly />
          </div>

          <div>
            <label>Your Name</label>
            <input
              value={form.contactName}
              onChange={(e) => setForm((s) => ({ ...s, contactName: e.target.value }))}
              required
            />
          </div>

          <div>
            <label>Email</label>
            <input
              value={form.contactEmail}
              onChange={(e) => setForm((s) => ({ ...s, contactEmail: e.target.value }))}
            />
          </div>

          <div>
            <label>Phone</label>
            <input
              inputMode="numeric"
              value={form.contactPhone}
              onChange={(e) => setForm((s) => ({ ...s, contactPhone: onlyPhone(e.target.value) }))}
              required
            />
          </div>

          <div>
            <label>Travel Date</label>
            <input
              type="date"
              value={form.bookingDate}
              onChange={(e) => setForm((s) => ({ ...s, bookingDate: e.target.value }))}
              required
              className="bookingCheckoutDate"
            />
          </div>

          {provider.listingType === "travel_planner" ? (
            <>
              <div>
                <label>Destination</label>
                <input
                  value={form.destination}
                  onChange={(e) => setForm((s) => ({ ...s, destination: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label>Number of People</label>
                <input
                  type="number"
                  min="1"
                  value={form.peopleCount}
                  onChange={(e) => setForm((s) => ({ ...s, peopleCount: e.target.value }))}
                  required
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label>Select Vehicle</label>
                <CustomSelect
                  value={form.selectedVehicleTitle}
                  onChange={(e) => setForm((s) => ({ ...s, selectedVehicleTitle: e.target.value }))}
                  options={vehicleOptions}
                  placeholder="Choose vehicle"
                />
              </div>

              <div>
                <label>Number of Days</label>
                <input
                  type="number"
                  min="1"
                  value={form.days}
                  onChange={(e) => setForm((s) => ({ ...s, days: e.target.value }))}
                  required
                />
              </div>
            </>
          )}

          <div className="fullSpan">
            <label>Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
            />
          </div>
        </div>

        <div className="bookingCheckoutAmount">
          Payable Amount: <strong>₹{amount}</strong>
        </div>

        <button className="bookingCheckoutBtn" type="submit" disabled={payLoading}>
          {payLoading ? "Processing..." : "Proceed to Payment"}
        </button>
      </form>
    </div>
  );
}