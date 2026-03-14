import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import "./BookingCheckout.css";

export default function BookingCheckout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = getUser();

  const [provider, setProvider] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    contactName: user?.name || "",
    contactEmail: user?.email || "",
    contactPhone: user?.phone || "",
    destination: "",
    place: "",
    travelDate: "",
    days: 1,
    peopleCount: 1,
    selectedVehicleId: "",
    notes: "",
  });

  useEffect(() => {
    async function loadProvider() {
      try {
        setLoading(true);
        const data = await apiFetch(`/api/providers/${id}`);
        setProvider(data.provider);
      } catch (err) {
        setMsg({ text: err.message, type: "error" });
      } finally {
        setLoading(false);
      }
    }

    loadProvider();
  }, [id]);

  const selectedVehicle = useMemo(() => {
    if (!provider || provider.listingType !== "vehicle") return null;
    return provider.vehicles?.find((v) => String(v._id) === String(form.selectedVehicleId));
  }, [provider, form.selectedVehicleId]);

  const vehicleOptions = [
    { label: "Choose vehicle", value: "" },
    ...((provider?.vehicles || []).map((vehicle) => ({
      label: `${vehicle.title || vehicle.vehicleType} — ₹${vehicle.price}`,
      value: vehicle._id,
    }))),
  ];

  const pricePreview = useMemo(() => {
    if (!provider) return { total: 0, label: "" };

    if (provider.listingType === "travel_planner") {
      const perPerson =
        Number(provider.travelPlanner?.pricePerPerson || 0) ||
        Number(provider.travelPlanner?.priceFrom || 0);

      const people = Math.max(Number(form.peopleCount || 1), 1);

      return {
        total: perPerson * people,
        label: `₹${perPerson} per person × ${people}`,
      };
    }

    if (provider.listingType === "vehicle" && selectedVehicle) {
      const days = Math.max(Number(form.days || 1), 1);
      const unit = Number(selectedVehicle.price || 0);

      if (selectedVehicle.priceUnit === "fixed") {
        return { total: unit, label: "Fixed price" };
      }

      return {
        total: unit * days,
        label:
          selectedVehicle.priceUnit === "per_hour"
            ? `₹${unit} per hour`
            : `₹${unit} per day × ${days}`,
      };
    }

    return { total: 0, label: "" };
  }, [provider, form.peopleCount, form.days, selectedVehicle]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      const data = await apiFetch("/api/bookings/create-order", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          ...form,
          days: Number(form.days || 1),
          peopleCount: Number(form.peopleCount || 1),
        }),
      });

      const options = {
        key: data.razorpayKeyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "OnTrip",
        description: provider.businessName,
        order_id: data.order.id,
        handler: async function (response) {
          try {
            const verify = await apiFetch("/api/bookings/verify-payment", {
              method: "POST",
              body: JSON.stringify({
                bookingId: data.bookingId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            setMsg({ text: verify.message, type: "success" });
            setTimeout(() => navigate("/profile/bookings"), 1000);
          } catch (err) {
            setMsg({ text: err.message, type: "error" });
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
      setMsg({ text: err.message, type: "error" });
    }
  }

  if (!isLoggedIn()) {
    navigate("/login");
    return null;
  }

  if (loading) {
    return (
      <div className="bookingCheckoutPage container">
        <div className="bookingCheckoutNote">Loading booking form...</div>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="bookingCheckoutPage container">
        <div className="bookingCheckoutMessage error">
          {msg.text || "Provider not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="bookingCheckoutPage container">
      {msg.text && (
        <div className={`bookingCheckoutMessage ${msg.type}`}>
          {msg.text}
        </div>
      )}

      <section className="bookingCheckoutCard">
        <div className="bookingCheckoutHeader">
          <div>
            <h1>Book Service</h1>
            <p>{provider.businessName} • {provider.city}</p>
          </div>

          <button className="bookingCheckoutGhostBtn" onClick={() => navigate(`/providers/${id}`)}>
            Back to Details
          </button>
        </div>

        <form className="bookingCheckoutForm" onSubmit={handleSubmit}>
          <div className="bookingCheckoutGrid">
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
                value={form.contactPhone}
                onChange={(e) => setForm((s) => ({ ...s, contactPhone: e.target.value }))}
                required
              />
            </div>

            <div>
              <label>Travel Date</label>
              <input
                type="date"
                value={form.travelDate}
                onChange={(e) => setForm((s) => ({ ...s, travelDate: e.target.value }))}
                required
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
                  <label>Number of Days</label>
                  <input
                    type="number"
                    min="1"
                    value={form.days}
                    onChange={(e) => setForm((s) => ({ ...s, days: e.target.value }))}
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
                  <label>Place</label>
                  <input
                    value={form.place}
                    onChange={(e) => setForm((s) => ({ ...s, place: e.target.value }))}
                    required
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

                <div className="fullSpan">
                  <label>Select Vehicle</label>
                  <CustomSelect
                    value={form.selectedVehicleId}
                    onChange={(e) => setForm((s) => ({ ...s, selectedVehicleId: e.target.value }))}
                    options={vehicleOptions}
                    placeholder="Choose vehicle"
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

          <div className="bookingCheckoutSummary">
            <div className="bookingCheckoutSummaryTitle">Price Summary</div>
            <div className="bookingCheckoutSummaryRow">
              <span>{pricePreview.label || "Select details to calculate"}</span>
              <strong>₹{pricePreview.total || 0}</strong>
            </div>
          </div>

          <button className="bookingCheckoutPrimaryBtn" type="submit">
            Pay & Book
          </button>
        </form>
      </section>
    </div>
  );
}