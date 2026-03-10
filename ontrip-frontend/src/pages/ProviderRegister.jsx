import { useState } from "react";
import { apiFetch } from "../lib/api";
import "./Providers.css";

export default function ProviderRegister() {
  const [providerType, setProviderType] = useState("vehicle");
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    businessName: "",
    city: "",
    phone: "",
    description: "",
    price: "",
    imageUrl: "",
    vehicleType: "car",
    capacity: 4,
    fuelType: "",
    withDriver: false,
    tripMode: "customized_trip",
    durationText: "",
    includes: "",
  });

  function update(key, value) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function submit(e) {
    e.preventDefault();

    try {
      setMsg("");

      const data = await apiFetch("/api/providers", {
        method: "POST",
        body: JSON.stringify({
          providerType,
          businessName: form.businessName,
          city: form.city,
          phone: form.phone,
          description: form.description,
          price: Number(form.price),
          imageUrl: form.imageUrl,
          vehicleType: form.vehicleType,
          capacity: Number(form.capacity),
          fuelType: form.fuelType,
          withDriver: form.withDriver,
          tripMode: form.tripMode,
          durationText: form.durationText,
          includes: form.includes,
        }),
      });

      setMsg(data.message);

      setForm({
        businessName: "",
        city: "",
        phone: "",
        description: "",
        price: "",
        imageUrl: "",
        vehicleType: "car",
        capacity: 4,
        fuelType: "",
        withDriver: false,
        tripMode: "customized_trip",
        durationText: "",
        includes: "",
      });
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="container providerRegisterPage">
      <div className="pageHead">
        <div>
          <h2 className="pageTitle">Register Your Service</h2>
          <p className="pageSub">
            Add your vehicle rental or tour planning business.
          </p>
        </div>
      </div>

      <div className="card providerRegisterCard">
        <div className="tabs providerTabs">
          <button
            className={providerType === "vehicle" ? "tab active" : "tab"}
            type="button"
            onClick={() => setProviderType("vehicle")}
          >
            Vehicle Provider
          </button>

          <button
            className={providerType === "tour" ? "tab active" : "tab"}
            type="button"
            onClick={() => setProviderType("tour")}
          >
            Tour Planner
          </button>
        </div>

        <form className="providerForm" onSubmit={submit}>
          <label className="label">Business Name</label>
          <input
            className="input"
            value={form.businessName}
            onChange={(e) => update("businessName", e.target.value)}
            required
          />

          <div className="row2">
            <div>
              <label className="label">City</label>
              <input
                className="input"
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Phone</label>
              <input
                className="input"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                required
              />
            </div>
          </div>

          <label className="label">Description</label>
          <textarea
            className="textarea"
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            placeholder="Tell users what you provide..."
          />

          <div className="row2">
            <div>
              <label className="label">Price</label>
              <input
                className="input"
                type="number"
                value={form.price}
                onChange={(e) => update("price", e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label">Image URL</label>
              <input
                className="input"
                value={form.imageUrl}
                onChange={(e) => update("imageUrl", e.target.value)}
                placeholder="Optional"
              />
            </div>
          </div>

          {providerType === "vehicle" ? (
            <>
              <label className="label">Vehicle Type</label>
              <select
                className="select"
                value={form.vehicleType}
                onChange={(e) => update("vehicleType", e.target.value)}
              >
                <option value="bus">Bus</option>
                <option value="jeep">Jeep</option>
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="scooty">Scooty</option>
                <option value="cycle">Cycle</option>
              </select>

              <div className="row2">
                <div>
                  <label className="label">Capacity</label>
                  <input
                    className="input"
                    type="number"
                    value={form.capacity}
                    onChange={(e) => update("capacity", e.target.value)}
                  />
                </div>

                <div>
                  <label className="label">Fuel Type</label>
                  <input
                    className="input"
                    value={form.fuelType}
                    onChange={(e) => update("fuelType", e.target.value)}
                    placeholder="Petrol / Diesel / EV"
                  />
                </div>
              </div>

              <label className="authCheck providerCheck">
                <input
                  type="checkbox"
                  checked={form.withDriver}
                  onChange={(e) => update("withDriver", e.target.checked)}
                />
                <span>Available with driver</span>
              </label>
            </>
          ) : (
            <>
              <label className="label">Trip Mode</label>
              <select
                className="select"
                value={form.tripMode}
                onChange={(e) => update("tripMode", e.target.value)}
              >
                <option value="own_trip">Own Trip</option>
                <option value="without_car">Without Car</option>
                <option value="customized_trip">Customized Trip</option>
              </select>

              <label className="label">Duration</label>
              <input
                className="input"
                value={form.durationText}
                onChange={(e) => update("durationText", e.target.value)}
                placeholder="Example: 2 days / 3 nights"
              />

              <label className="label">What you provide</label>
              <input
                className="input"
                value={form.includes}
                onChange={(e) => update("includes", e.target.value)}
                placeholder="hotel, guide, food, sightseeing"
              />
            </>
          )}

          <button className="btn btnPrimary providerSubmitBtn" type="submit">
            Save Service
          </button>

          {msg && <div className="note">{msg}</div>}
        </form>
      </div>
    </div>
  );
}