import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import "./MyListings.css";

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
    existingImages: [],
  };
}

export default function MyListings() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");
  const [editingId, setEditingId] = useState(null);

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
    plannerMode: "customized_trip",
    packageTitle: "",
    durationText: "",
    days: "",
    priceFrom: "",
    pricePerPerson: "",
    placesCovered: "",
    inclusions: "",
    exclusions: "",
    plannerImages: null,
    existingPlannerImages: [],
  });

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

  async function load() {
    try {
      const data = await apiFetch("/api/providers/mine");
      setItems(data.providers || []);
    } catch (err) {
      setMsg(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openEdit(item) {
    setEditingId(item._id);

    setForm({
      businessName: item.businessName || "",
      listingType: item.listingType || "vehicle",
      city: item.city || "",
      state: item.state || "",
      phone: item.phone || "",
      whatsapp: item.whatsapp || "",
      description: item.description || "",
      serviceImage: null,
      vehicles:
        item.vehicles?.length > 0
          ? item.vehicles.map((v) => ({
              vehicleType: v.vehicleType || "car",
              title: v.title || "",
              price: v.price || "",
              priceUnit: v.priceUnit || "per_day",
              capacity: v.capacity || "",
              fuelType: v.fuelType || "",
              withDriver: !!v.withDriver,
              images: null,
              existingImages: v.images || [],
            }))
          : [emptyVehicle()],
      plannerMode: item.travelPlanner?.plannerMode || "customized_trip",
      packageTitle: item.travelPlanner?.packageTitle || "",
      durationText: item.travelPlanner?.durationText || "",
      days: item.travelPlanner?.days || "",
      priceFrom: item.travelPlanner?.priceFrom || "",
      pricePerPerson: item.travelPlanner?.pricePerPerson || "",
      placesCovered: (item.travelPlanner?.placesCovered || []).join(", "),
      inclusions: (item.travelPlanner?.inclusions || []).join(", "),
      exclusions: (item.travelPlanner?.exclusions || []).join(", "),
      plannerImages: null,
      existingPlannerImages: item.travelPlanner?.images || [],
    });
  }

  function closeEdit() {
    setEditingId(null);
    setMsg("");
  }

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

  function removeVehicleExistingImage(vehicleIndex, imageIndex) {
    setForm((prev) => ({
      ...prev,
      vehicles: prev.vehicles.map((item, i) =>
        i === vehicleIndex
          ? {
              ...item,
              existingImages: item.existingImages.filter((_, idx) => idx !== imageIndex),
            }
          : item
      ),
    }));
  }

  function removePlannerExistingImage(index) {
    setForm((prev) => ({
      ...prev,
      existingPlannerImages: prev.existingPlannerImages.filter((_, i) => i !== index),
    }));
  }

  async function saveEdit(e) {
    e.preventDefault();

    try {
      const fd = new FormData();

      fd.append("businessName", form.businessName);
      fd.append("listingType", form.listingType);
      fd.append("city", form.city);
      fd.append("state", form.state);
      fd.append("phone", form.phone);
      fd.append("whatsapp", form.whatsapp);
      fd.append("description", form.description);

      if (form.serviceImage) {
        fd.append("serviceImage", form.serviceImage);
      }

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

        fd.append(
          "existingVehicles",
          JSON.stringify(
            form.vehicles.map((v) => ({
              images: v.existingImages || [],
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
        fd.append("plannerMode", form.plannerMode);
        fd.append("packageTitle", form.packageTitle);
        fd.append("durationText", form.durationText);
        fd.append("days", form.days);
        fd.append("priceFrom", form.priceFrom);
        fd.append("pricePerPerson", form.pricePerPerson);
        fd.append("placesCovered", form.placesCovered);
        fd.append("inclusions", form.inclusions);
        fd.append("exclusions", form.exclusions);
        fd.append(
          "existingPlannerImages",
          JSON.stringify(form.existingPlannerImages || [])
        );

        Array.from(form.plannerImages || []).forEach((file) => {
          fd.append("plannerImages", file);
        });
      }

      await apiFetch(`/api/providers/${editingId}`, {
        method: "PUT",
        body: fd,
      });

      setEditingId(null);
      await load();
      setMsg("Listing updated successfully");
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function removeItem(id) {
    const ok = window.confirm("Remove this service?");
    if (!ok) return;

    try {
      await apiFetch(`/api/providers/${id}`, { method: "DELETE" });
      await load();
      if (editingId === id) setEditingId(null);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="myListingsPage container">
      <section className="myListingsHero">
        <h1>My Listings</h1>
        <p>
          View, update, and remove your provider services from one clean page.
        </p>
      </section>

      {msg && <div className="myListingsMessage">{msg}</div>}

      <div className="myListingsGrid">
        {items.map((item) => (
          <article className="myListingsCard" key={item._id}>
            <div className="myListingsMedia">
              {item.serviceImage?.url ? (
                <img src={item.serviceImage.url} alt={item.businessName} />
              ) : item.listingType === "vehicle" ? (
                item.vehicles?.[0]?.images?.[0]?.url ? (
                  <img src={item.vehicles[0].images[0].url} alt={item.businessName} />
                ) : (
                  <div className="myListingsMediaEmpty">No Image</div>
                )
              ) : item.travelPlanner?.images?.[0]?.url ? (
                <img src={item.travelPlanner.images[0].url} alt={item.businessName} />
              ) : (
                <div className="myListingsMediaEmpty">No Image</div>
              )}
            </div>

            <div className="myListingsBody">
              <div className="myListingsTop">
                <div>
                  <h3>{item.businessName}</h3>
                  <p>
                    {item.city} • {item.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
                  </p>
                </div>

                <div className="myListingsType">
                  {item.listingType === "vehicle" ? "Vehicle" : "Travel"}
                </div>
              </div>

              <div className="myListingsDesc">
                {item.description || "No description available."}
              </div>

              <div className="myListingsActions">
                <button className="myListingsBtn" onClick={() => openEdit(item)}>
                  {editingId === item._id ? "Editing" : "Edit"}
                </button>

                <button className="myListingsBtn danger" onClick={() => removeItem(item._id)}>
                  Remove
                </button>
              </div>

              {editingId === item._id && (
                <form className="myListingsEditForm" onSubmit={saveEdit}>
                  <div className="myListingsFormGrid">
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
                        value={form.phone}
                        onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                        required
                      />
                    </div>

                    <div>
                      <label>WhatsApp</label>
                      <input
                        value={form.whatsapp}
                        onChange={(e) => setForm((s) => ({ ...s, whatsapp: e.target.value }))}
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
                    <div className="myListingsBlock">
                      <div className="myListingsBlockHead">
                        <h4>Vehicles</h4>
                        <button className="myListingsBtn" type="button" onClick={addVehicle}>
                          Add Vehicle
                        </button>
                      </div>

                      <div className="myListingsVehicleList">
                        {form.vehicles.map((vehicle, index) => (
                          <div className="myListingsVehicleCard" key={index}>
                            <div className="myListingsVehicleTop">
                              <strong>Vehicle {index + 1}</strong>
                              {form.vehicles.length > 1 && (
                                <button className="myListingsBtn danger" type="button" onClick={() => removeVehicle(index)}>
                                  Remove
                                </button>
                              )}
                            </div>

                            <div className="myListingsFormGrid">
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

                              <div className="myListingsCheckWrap">
                                <label className="myListingsCheck">
                                  <input
                                    type="checkbox"
                                    checked={vehicle.withDriver}
                                    onChange={(e) => updateVehicle(index, "withDriver", e.target.checked)}
                                  />
                                  <span>With Driver</span>
                                </label>
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

                              {vehicle.existingImages?.length > 0 && (
                                <div className="fullSpan myListingsImageGrid">
                                  {vehicle.existingImages.map((img, imgIndex) => (
                                    <div className="myListingsThumb" key={imgIndex}>
                                      <img src={img.url} alt="vehicle" />
                                      <button
                                        type="button"
                                        className="myListingsRemoveImage"
                                        onClick={() => removeVehicleExistingImage(index, imgIndex)}
                                      >
                                        Remove
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {form.listingType === "travel_planner" && (
                    <div className="myListingsBlock">
                      <h4>Travel Planner Details</h4>

                      <div className="myListingsFormGrid">
                        <div>
                          <label>Planner Type</label>
                          <CustomSelect
                            value={form.plannerMode}
                            onChange={(e) => setForm((s) => ({ ...s, plannerMode: e.target.value }))}
                            options={plannerModeOptions}
                          />
                        </div>

                        <div>
                          <label>Package Title</label>
                          <input
                            value={form.packageTitle}
                            onChange={(e) => setForm((s) => ({ ...s, packageTitle: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label>Duration Text</label>
                          <input
                            value={form.durationText}
                            onChange={(e) => setForm((s) => ({ ...s, durationText: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label>Days</label>
                          <input
                            type="number"
                            value={form.days}
                            onChange={(e) => setForm((s) => ({ ...s, days: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label>Price From</label>
                          <input
                            type="number"
                            value={form.priceFrom}
                            onChange={(e) => setForm((s) => ({ ...s, priceFrom: e.target.value }))}
                          />
                        </div>

                        <div>
                          <label>Price Per Person</label>
                          <input
                            type="number"
                            value={form.pricePerPerson}
                            onChange={(e) => setForm((s) => ({ ...s, pricePerPerson: e.target.value }))}
                          />
                        </div>

                        <div className="fullSpan">
                          <label>Places Covered</label>
                          <input
                            value={form.placesCovered}
                            onChange={(e) => setForm((s) => ({ ...s, placesCovered: e.target.value }))}
                          />
                        </div>

                        <div className="fullSpan">
                          <label>Inclusions</label>
                          <input
                            value={form.inclusions}
                            onChange={(e) => setForm((s) => ({ ...s, inclusions: e.target.value }))}
                          />
                        </div>

                        <div className="fullSpan">
                          <label>Exclusions</label>
                          <input
                            value={form.exclusions}
                            onChange={(e) => setForm((s) => ({ ...s, exclusions: e.target.value }))}
                          />
                        </div>

                        <div className="fullSpan">
                          <label>Planner Images</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) => setForm((s) => ({ ...s, plannerImages: e.target.files }))}
                          />
                        </div>

                        {form.existingPlannerImages?.length > 0 && (
                          <div className="fullSpan myListingsImageGrid">
                            {form.existingPlannerImages.map((img, index) => (
                              <div className="myListingsThumb" key={index}>
                                <img src={img.url} alt="planner" />
                                <button
                                  type="button"
                                  className="myListingsRemoveImage"
                                  onClick={() => removePlannerExistingImage(index)}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="myListingsActions">
                    <button className="myListingsBtn" type="submit">
                      Save Changes
                    </button>
                    <button className="myListingsBtn" type="button" onClick={closeEdit}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}