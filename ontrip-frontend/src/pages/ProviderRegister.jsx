import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import "./ProviderRegister.css";

const vehicleTypes = ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"];

function emptyVehicle() {
  return {
    vehicleType: "car",
    title: "",
    price: "",
    priceUnit: "per_day",
    capacity: "",
    fuelType: "",
    withDriver: false,
    images: null,
  };
}

function emptyTrip() {
  return {
    plannerMode: "customized_trip",
    packageTitle: "",
    durationText: "",
    days: "",
    priceFrom: "",
    pricePerPerson: "",
    placesCovered: "",
    inclusions: "",
    exclusions: "",
    images: null,
  };
}

function onlyPhone(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function ProviderRegister() {
  const navigate = useNavigate();
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [submitLoading, setSubmitLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    listingType: "vehicle",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    description: "",
    serviceImage: null,
    vehicles: [emptyVehicle()],
    travelPlans: [emptyTrip()],
  });

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const listingTypeOptions = [
    { label: "Vehicle Service", value: "vehicle" },
    { label: "Travel Planner", value: "travel_planner" },
  ];

  const plannerModeOptions = [
    { label: "Customized Trip", value: "customized_trip" },
    { label: "Self Customized Places", value: "self_customized_places" },
    { label: "Day Package", value: "day_package" },
    { label: "Multi Day Package", value: "multi_day_package" },
    { label: "Group Trip", value: "group_trip" },
  ];

  const priceUnitOptions = [
    { label: "Per Day", value: "per_day" },
    { label: "Per Hour", value: "per_hour" },
    { label: "Fixed", value: "fixed" },
  ];

  function addVehicle() {
    setForm((prev) => ({
      ...prev,
      vehicles: [...prev.vehicles, emptyVehicle()],
    }));
  }

  function removeVehicle(index) {
    setForm((prev) => ({
      ...prev,
      vehicles: prev.vehicles.filter((_, i) => i !== index),
    }));
  }

  function updateVehicle(index, key, value) {
    setForm((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  function addTrip() {
    setForm((prev) => ({
      ...prev,
      travelPlans: [...prev.travelPlans, emptyTrip()],
    }));
  }

  function removeTrip(index) {
    setForm((prev) => ({
      ...prev,
      travelPlans: prev.travelPlans.filter((_, i) => i !== index),
    }));
  }

  function updateTrip(index, key, value) {
    setForm((prev) => ({
      ...prev,
      travelPlans: prev.travelPlans.map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      ),
    }));
  }

  async function submitProvider(e) {
    e.preventDefault();

    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    if (form.phone.length !== 10) {
      setMsg({ text: "Phone number must be 10 digits.", type: "error" });
      return;
    }

    if (form.whatsapp && form.whatsapp.length !== 10) {
      setMsg({ text: "WhatsApp number must be 10 digits.", type: "error" });
      return;
    }

    try {
      setSubmitLoading(true);
      const fd = new FormData();

      fd.append("businessName", form.businessName);
      fd.append("listingType", form.listingType);
      fd.append("city", form.city);
      fd.append("state", form.state);
      fd.append("phone", form.phone);
      fd.append("whatsapp", form.whatsapp);
      fd.append("description", form.description);

      if (form.serviceImage) fd.append("serviceImage", form.serviceImage);

      if (form.listingType === "vehicle") {
        fd.append(
          "vehicles",
          JSON.stringify(
            form.vehicles.map((v) => ({
              vehicleType: v.vehicleType,
              title: v.title,
              price: v.price,
              priceUnit: v.priceUnit,
              capacity: v.capacity,
              fuelType: v.fuelType,
              withDriver: v.withDriver,
            }))
          )
        );

        form.vehicles.forEach((v, index) => {
          Array.from(v.images || []).forEach((file) => {
            fd.append(`vehicleImages_${index}`, file);
          });
        });
      }

      if (form.listingType === "travel_planner") {
        fd.append(
          "travelPlans",
          JSON.stringify(
            form.travelPlans.map((trip) => ({
              plannerMode: trip.plannerMode,
              packageTitle: trip.packageTitle,
              durationText: trip.durationText,
              days: trip.days,
              priceFrom: trip.priceFrom,
              pricePerPerson: trip.pricePerPerson,
              placesCovered: trip.placesCovered,
              inclusions: trip.inclusions,
              exclusions: trip.exclusions,
            }))
          )
        );

        form.travelPlans.forEach((trip, index) => {
          Array.from(trip.images || []).forEach((file) => {
            fd.append(`plannerImages_${index}`, file);
          });
        });
      }

      const data = await apiFetch("/api/providers", {
        method: "POST",
        body: fd,
      });

      setMsg({ text: data.message, type: "success" });
      navigate("/profile/my-listings");
    } catch (err) {
      setMsg({ text: err.message, type: "error" });
    } finally {
      setSubmitLoading(false);
    }
  }

  return (
    <div className="providerRegisterPage container">
      <div className="providerRegisterHead">
        <h1>Register as Provider</h1>
        <p>Add your travel planner or vehicle rental service with full business details.</p>
      </div>

      {msg.text && (
        <div className={`providerRegisterMessage ${msg.type}`}>
          {msg.text}
        </div>
      )}

      <form className="providerRegisterForm" onSubmit={submitProvider}>
        <div className="providerRegisterGrid">
          <div className="fullSpan">
            <label>Business Name</label>
            <input
              value={form.businessName}
              onChange={(e) => setForm((s) => ({ ...s, businessName: e.target.value }))}
              required
            />
          </div>

          <div>
            <label>Listing Type</label>
            <CustomSelect
              value={form.listingType}
              onChange={(e) => setForm((s) => ({ ...s, listingType: e.target.value }))}
              options={listingTypeOptions}
            />
          </div>

          <div>
            <label>City</label>
            <input
              value={form.city}
              onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
              required
            />
          </div>

          <div>
            <label>State</label>
            <input
              value={form.state}
              onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
            />
          </div>

          <div>
            <label>Phone</label>
            <input
              inputMode="numeric"
              value={form.phone}
              onChange={(e) => setForm((s) => ({ ...s, phone: onlyPhone(e.target.value) }))}
              required
            />
          </div>

          <div>
            <label>WhatsApp</label>
            <input
              inputMode="numeric"
              value={form.whatsapp}
              onChange={(e) => setForm((s) => ({ ...s, whatsapp: onlyPhone(e.target.value) }))}
            />
          </div>

          <div className="fullSpan">
            <label>Service Card Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                setForm((s) => ({ ...s, serviceImage: e.target.files?.[0] || null }))
              }
            />
          </div>

          <div className="fullSpan">
            <label>Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            />
          </div>
        </div>

        {form.listingType === "vehicle" && (
          <div className="providerRegisterBlock">
            <div className="providerRegisterBlockHead">
              <h3>Vehicles</h3>
              <button className="providerRegisterGhostBtn" type="button" onClick={addVehicle}>
                Add Vehicle
              </button>
            </div>

            <div className="providerRegisterVehicleList">
              {form.vehicles.map((vehicle, index) => (
                <div className="providerRegisterVehicleCard" key={index}>
                  <div className="providerRegisterVehicleTop">
                    <strong>Vehicle {index + 1}</strong>
                    {form.vehicles.length > 1 && (
                      <button
                        className="providerRegisterDangerBtn"
                        type="button"
                        onClick={() => removeVehicle(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="providerRegisterGrid">
                    <div>
                      <label>Vehicle Type</label>
                      <CustomSelect
                        value={vehicle.vehicleType}
                        onChange={(e) => updateVehicle(index, "vehicleType", e.target.value)}
                        options={vehicleTypes.map((type) => ({ label: type, value: type }))}
                      />
                    </div>

                    <div>
                      <label>Title</label>
                      <input
                        value={vehicle.title}
                        onChange={(e) => updateVehicle(index, "title", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Price</label>
                      <input
                        type="number"
                        value={vehicle.price}
                        onChange={(e) => updateVehicle(index, "price", e.target.value)}
                        required
                      />
                    </div>

                    <div>
                      <label>Price Unit</label>
                      <CustomSelect
                        value={vehicle.priceUnit}
                        onChange={(e) => updateVehicle(index, "priceUnit", e.target.value)}
                        options={priceUnitOptions}
                      />
                    </div>

                    <div>
                      <label>Capacity</label>
                      <input
                        type="number"
                        value={vehicle.capacity}
                        onChange={(e) => updateVehicle(index, "capacity", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Fuel Type</label>
                      <input
                        value={vehicle.fuelType}
                        onChange={(e) => updateVehicle(index, "fuelType", e.target.value)}
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Driver Option</label>
                      <div className="providerRegisterCheckField">
                        <label className="providerRegisterCheck">
                          <input
                            type="checkbox"
                            checked={vehicle.withDriver}
                            onChange={(e) => updateVehicle(index, "withDriver", e.target.checked)}
                          />
                          <span>With Driver</span>
                        </label>
                      </div>
                    </div>

                    <div className="fullSpan">
                      <label>Vehicle Images</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => updateVehicle(index, "images", e.target.files)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {form.listingType === "travel_planner" && (
          <div className="providerRegisterBlock">
            <div className="providerRegisterBlockHead">
              <h3>Travel Trips</h3>
              <button className="providerRegisterGhostBtn" type="button" onClick={addTrip}>
                Add Trip
              </button>
            </div>

            <div className="providerRegisterTripList">
              {form.travelPlans.map((trip, index) => (
                <div className="providerRegisterTripCard" key={index}>
                  <div className="providerRegisterVehicleTop">
                    <strong>Trip {index + 1}</strong>
                    {form.travelPlans.length > 1 && (
                      <button
                        className="providerRegisterDangerBtn"
                        type="button"
                        onClick={() => removeTrip(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="providerRegisterGrid">
                    <div>
                      <label>Planner Type</label>
                      <CustomSelect
                        value={trip.plannerMode}
                        onChange={(e) => updateTrip(index, "plannerMode", e.target.value)}
                        options={plannerModeOptions}
                      />
                    </div>

                    <div>
                      <label>Package Title</label>
                      <input
                        value={trip.packageTitle}
                        onChange={(e) => updateTrip(index, "packageTitle", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Duration Text</label>
                      <input
                        value={trip.durationText}
                        onChange={(e) => updateTrip(index, "durationText", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Days</label>
                      <input
                        type="number"
                        value={trip.days}
                        onChange={(e) => updateTrip(index, "days", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Price From</label>
                      <input
                        type="number"
                        value={trip.priceFrom}
                        onChange={(e) => updateTrip(index, "priceFrom", e.target.value)}
                      />
                    </div>

                    <div>
                      <label>Price Per Person</label>
                      <input
                        type="number"
                        value={trip.pricePerPerson}
                        onChange={(e) => updateTrip(index, "pricePerPerson", e.target.value)}
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Places Covered</label>
                      <input
                        value={trip.placesCovered}
                        onChange={(e) => updateTrip(index, "placesCovered", e.target.value)}
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Inclusions</label>
                      <input
                        value={trip.inclusions}
                        onChange={(e) => updateTrip(index, "inclusions", e.target.value)}
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Exclusions</label>
                      <input
                        value={trip.exclusions}
                        onChange={(e) => updateTrip(index, "exclusions", e.target.value)}
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Trip Images</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => updateTrip(index, "images", e.target.files)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button className="providerRegisterPrimaryBtn" type="submit" disabled={submitLoading}>
          {submitLoading ? "Creating..." : "Create Listing"}
        </button>
      </form>
    </div>
  );
}