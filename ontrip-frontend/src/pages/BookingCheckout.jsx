import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
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
    place: "",
    notes: "",
    selectedVehicleId: "",
    selectedVehicleTitle: "",
    selectedPackageTitle: "",
    days: 1,
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
      return;
    }

    async function loadProvider() {
      try {
        setLoading(true);
        setMsg("");
        const data = await apiFetch(`/api/providers/${id}`);
        setProvider(data.provider);

        setForm((prev) => ({
          ...prev,
          selectedPackageTitle:
            data.provider?.travelPlanner?.packageTitle || "",
        }));
      } catch (err) {
        setMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadProvider();
  }, [id, navigate]);

  const vehicleOptions = useMemo(() => {
    return (provider?.vehicles || []).map((vehicle) => ({
      label: `${vehicle.title || vehicle.vehicleType} — ₹${vehicle.price}`,
      value: vehicle._id,
    }));
  }, [provider]);

  const selectedVehicle = useMemo(() => {
    if (!provider || !form.selectedVehicleId) return null;
    return (provider.vehicles || []).find(
      (vehicle) => String(vehicle._id) === String(form.selectedVehicleId)
    );
  }, [provider, form.selectedVehicleId]);

  const pricingLabel = useMemo(() => {
    if (!provider) return "";

    if (provider.listingType === "travel_planner") {
      return "per_person";
    }

    return selectedVehicle?.priceUnit || "per_day";
  }, [provider, selectedVehicle]);

  const pricingLabelText = useMemo(() => {
    if (pricingLabel === "per_hour") return "Per Hour";
    if (pricingLabel === "fixed") return "Fixed";
    if (pricingLabel === "per_day") return "Per Day";
    return "Per Person";
  }, [pricingLabel]);

  const unitPrice = useMemo(() => {
    if (!provider) return 0;

    if (provider.listingType === "travel_planner") {
      return Number(provider.travelPlanner?.priceFrom || 0);
    }

    return Number(selectedVehicle?.price || 0);
  }, [provider, selectedVehicle]);

  const amount = useMemo(() => {
    if (!provider) return 0;

    if (provider.listingType === "travel_planner") {
      return Number(unitPrice) * Number(form.peopleCount || 1);
    }

    if (!selectedVehicle) return 0;

    return Number(unitPrice) * Number(form.days || 1);
  }, [provider, unitPrice, selectedVehicle, form.peopleCount, form.days]);

  async function startPayment(e) {
    e.preventDefault();

    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (form.contactPhone.length !== 10) {
      setMsg("Phone number must be 10 digits.");
      return;
    }

    if (!form.bookingDate) {
      setMsg("Please select booking date.");
      return;
    }

    if (provider.listingType === "travel_planner" && !form.destination.trim()) {
      setMsg("Please enter destination.");
      return;
    }

    if (provider.listingType === "vehicle" && !form.selectedVehicleId) {
      setMsg("Please select a vehicle first.");
      return;
    }

    if (!amount || amount <= 0) {
      setMsg("Invalid booking amount.");
      return;
    }

    try {
      setPayLoading(true);
      setMsg("");

      const data = await apiFetch("/api/bookings/create-order", {
        method: "POST",
        body: JSON.stringify({
          providerId: id,
          contactName: form.contactName,
          contactEmail: form.contactEmail,
          contactPhone: form.contactPhone,
          bookingDate: form.bookingDate,
          peopleCount: Number(form.peopleCount || 1),
          destination:
            provider.listingType === "travel_planner"
              ? form.destination.trim()
              : "",
          place:
            provider.listingType === "vehicle"
              ? form.place.trim()
              : "",
          days: Number(form.days || 1),
          selectedVehicleId:
            provider.listingType === "vehicle" ? form.selectedVehicleId : null,
          selectedVehicleTitle:
            provider.listingType === "vehicle"
              ? form.selectedVehicleTitle
              : "",
          selectedPackageTitle:
            provider.listingType === "travel_planner"
              ? form.selectedPackageTitle
              : "",
          unitPrice: Number(unitPrice),
          pricingLabel: pricingLabelText,
          notes: form.notes.trim(),
          amount: Number(amount),
        }),
      });

      const payableAmount = Number(data?.order?.amount || 0);

      if (!payableAmount || payableAmount <= 0) {
        setMsg("Payment amount is invalid. Please try again.");
        setPayLoading(false);
        return;
      }

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: payableAmount,
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
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            navigate(`/profile/bookings/${verify.bookingId}`);
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
        modal: {
          ondismiss: function () {
            setPayLoading(false);
          },
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
        <div className="bookingCheckoutMessage">
          {msg || "Provider not found."}
        </div>
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
              onChange={(e) =>
                setForm((s) => ({ ...s, contactName: e.target.value }))
              }
              required
            />
          </div>

          <div>
            <label>Email</label>
            <input
              value={form.contactEmail}
              onChange={(e) =>
                setForm((s) => ({ ...s, contactEmail: e.target.value }))
              }
            />
          </div>

          <div>
            <label>Phone</label>
            <input
              inputMode="numeric"
              value={form.contactPhone}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  contactPhone: onlyPhone(e.target.value),
                }))
              }
              required
            />
          </div>

          <div>
            <label>Travel Date</label>
            <input
              type="date"
              value={form.bookingDate}
              onChange={(e) =>
                setForm((s) => ({ ...s, bookingDate: e.target.value }))
              }
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
                  onChange={(e) =>
                    setForm((s) => ({ ...s, destination: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label>Number of People</label>
                <input
                  type="number"
                  min="1"
                  value={form.peopleCount}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, peopleCount: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label>Package</label>
                <input value={form.selectedPackageTitle} readOnly />
              </div>

              <div>
                <label>Price Type</label>
                <input value="Per Person" readOnly />
              </div>
            </>
          ) : (
            <>
              <div>
                <label>Select Vehicle</label>
                <CustomSelect
                  value={form.selectedVehicleId}
                  onChange={(e) => {
                    const vehicle = (provider.vehicles || []).find(
                      (v) => String(v._id) === String(e.target.value)
                    );

                    setForm((s) => ({
                      ...s,
                      selectedVehicleId: e.target.value,
                      selectedVehicleTitle:
                        vehicle?.title || vehicle?.vehicleType || "",
                    }));
                  }}
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
                  onChange={(e) =>
                    setForm((s) => ({ ...s, days: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label>Place</label>
                <input
                  value={form.place}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, place: e.target.value }))
                  }
                  placeholder="Pickup / travel place"
                  required
                />
              </div>

              <div>
                <label>Price Type</label>
                <input value={pricingLabelText} readOnly />
              </div>
            </>
          )}

          <div className="fullSpan">
            <label>Notes</label>
            <textarea
              rows={4}
              value={form.notes}
              onChange={(e) =>
                setForm((s) => ({ ...s, notes: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="bookingCheckoutAmount">
          Payable Amount: <strong>₹{amount}</strong>
        </div>

        <button
          className="bookingCheckoutBtn"
          type="submit"
          disabled={payLoading}
        >
          {payLoading ? "Processing..." : "Proceed to Payment"}
        </button>
      </form>
    </div>
  );
}