import { useEffect, useState } from "react";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import { useNavigate } from "react-router-dom";
import "./Providers.css";

const vehicleTypes = ["car", "bike", "van", "truck", "jeep", "bus", "scooty", "cycle"];

function emptyVehicle() {
  return {
    vehicleType: "car",
    title: "",
    price: "",
    capacity: "",
    fuelType: "",
    withDriver: false,
    images: null,
    existingImages: [],
  };
}

export default function Providers() {
  const navigate = useNavigate();
  const user = getUser();

  const [providers, setProviders] = useState([]);
  const [myProviders, setMyProviders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [selectedProvider, setSelectedProvider] = useState(null);

  const [filters, setFilters] = useState({
    q: "",
    city: "",
    listingType: "",
    vehicleType: "",
  });

  const [form, setForm] = useState({
    businessName: "",
    listingType: "vehicle",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    description: "",
    vehicles: [emptyVehicle()],
    plannerMode: "customized_trip",
    packageTitle: "",
    durationText: "",
    priceFrom: "",
    placesCovered: "",
    inclusions: "",
    exclusions: "",
    plannerImages: null,
    existingPlannerImages: [],
  });

  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    comment: "",
  });
  const [reviews, setReviews] = useState([]);

  function setMessage(text, type = "success") {
    setMsg({ text, type });
  }

  function resetForm() {
    setForm({
      businessName: "",
      listingType: "vehicle",
      city: "",
      state: "",
      phone: "",
      whatsapp: "",
      description: "",
      vehicles: [emptyVehicle()],
      plannerMode: "customized_trip",
      packageTitle: "",
      durationText: "",
      priceFrom: "",
      placesCovered: "",
      inclusions: "",
      exclusions: "",
      plannerImages: null,
      existingPlannerImages: [],
    });
    setEditingId(null);
  }

  async function loadProviders() {
    try {
      const params = new URLSearchParams();
      if (filters.q) params.set("q", filters.q);
      if (filters.city) params.set("city", filters.city);
      if (filters.listingType) params.set("listingType", filters.listingType);
      if (filters.vehicleType) params.set("vehicleType", filters.vehicleType);

      const data = await apiFetch(`/api/providers?${params.toString()}`);
      setProviders(data.providers || []);
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function loadMyProviders() {
    if (!isLoggedIn()) return;
    try {
      const data = await apiFetch("/api/providers/mine");
      setMyProviders(data.providers || []);
    } catch {
      // ignore
    }
  }

  async function loadReviews(providerId) {
    try {
      const data = await apiFetch(`/api/reviews/${providerId}`);
      setReviews(data.reviews || []);
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  useEffect(() => {
    loadProviders();
    loadMyProviders();
  }, []);

  function openCreateForm() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    resetForm();
    setShowForm(true);
  }

  function openEditForm(item) {
    setEditingId(item._id);
    setShowForm(true);

    setForm({
      businessName: item.businessName || "",
      listingType: item.listingType || "vehicle",
      city: item.city || "",
      state: item.state || "",
      phone: item.phone || "",
      whatsapp: item.whatsapp || "",
      description: item.description || "",
      vehicles:
        item.vehicles?.length > 0
          ? item.vehicles.map((v) => ({
              vehicleType: v.vehicleType || "car",
              title: v.title || "",
              price: v.price || "",
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
      priceFrom: item.travelPlanner?.priceFrom || "",
      placesCovered: (item.travelPlanner?.placesCovered || []).join(", "),
      inclusions: (item.travelPlanner?.inclusions || []).join(", "),
      exclusions: (item.travelPlanner?.exclusions || []).join(", "),
      plannerImages: null,
      existingPlannerImages: item.travelPlanner?.images || [],
    });
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

  async function submitProvider(e) {
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

      if (form.listingType === "vehicle") {
        const cleanVehicles = form.vehicles.map((v) => ({
          vehicleType: v.vehicleType,
          title: v.title,
          price: v.price,
          capacity: v.capacity,
          fuelType: v.fuelType,
          withDriver: v.withDriver,
        }));

        fd.append("vehicles", JSON.stringify(cleanVehicles));
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
        fd.append("priceFrom", form.priceFrom);
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

      const url = editingId ? `/api/providers/${editingId}` : "/api/providers";
      const method = editingId ? "PUT" : "POST";

      const data = await apiFetch(url, {
        method,
        body: fd,
      });

      setMessage(data.message, "success");
      setShowForm(false);
      resetForm();
      await loadProviders();
      await loadMyProviders();
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function removeProvider(id) {
    const ok = window.confirm("Are you sure you want to remove this listing?");
    if (!ok) return;

    try {
      const data = await apiFetch(`/api/providers/${id}`, {
        method: "DELETE",
      });
      setMessage(data.message, "success");
      await loadProviders();
      await loadMyProviders();
      if (selectedProvider?._id === id) setSelectedProvider(null);
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  async function submitReview(e) {
    e.preventDefault();
    if (!selectedProvider) return;

    try {
      const data = await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({
          providerId: selectedProvider._id,
          rating: Number(reviewForm.rating),
          comment: reviewForm.comment,
        }),
      });
      setMessage(data.message, "success");
      setReviewForm({ rating: 5, comment: "" });
      await loadReviews(selectedProvider._id);
      await loadProviders();
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  const isOwner =
    user &&
    selectedProvider &&
    String(selectedProvider.owner?._id || selectedProvider.owner) === String(user.id);

  return (
    <div className="container providerPlatformPage">
      <div className="providerHero card">
        <div>
          <h1 className="providerHeroTitle">Provider Platform</h1>
          <p className="providerHeroSub">
            Add vehicle services and travel planner packages in a clean, professional marketplace.
          </p>
        </div>

        <div className="providerHeroActions">
          <button className="btn btnPrimary" onClick={openCreateForm}>
            Register as Provider
          </button>
        </div>
      </div>

      {msg.text && (
        <div className={`providerMessage ${msg.type === "success" ? "success" : "error"}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <div className="providerFormCard card">
          <div className="providerFormTop">
            <div>
              <h2 className="providerSectionTitle">
                {editingId ? "Edit Listing" : "Create Listing"}
              </h2>
              <p className="providerSectionSub">
                Keep your vehicle services and travel planner details separate and organized.
              </p>
            </div>

            <button className="btn" type="button" onClick={() => setShowForm(false)}>
              Close
            </button>
          </div>

          <form className="providerForm" onSubmit={submitProvider}>
            <div className="providerFormGrid">
              <div className="fullCol">
                <label className="label">Business Name</label>
                <input
                  className="input"
                  value={form.businessName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, businessName: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label className="label">Listing Type</label>
                <select
                  className="select"
                  value={form.listingType}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, listingType: e.target.value }))
                  }
                >
                  <option value="vehicle">Vehicle Service</option>
                  <option value="travel_planner">Travel Planner</option>
                </select>
              </div>

              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={form.city}
                  onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">State</label>
                <input
                  className="input"
                  value={form.state}
                  onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))}
                />
              </div>

              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="label">WhatsApp</label>
                <input
                  className="input"
                  value={form.whatsapp}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, whatsapp: e.target.value }))
                  }
                />
              </div>

              <div className="fullCol">
                <label className="label">Description</label>
                <textarea
                  className="textarea"
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </div>
            </div>

            {form.listingType === "vehicle" && (
              <div className="providerBlock">
                <div className="providerBlockTop">
                  <h3 className="providerBlockTitle">Vehicles</h3>
                  <button className="btn" type="button" onClick={addVehicle}>
                    Add Vehicle
                  </button>
                </div>

                <div className="vehicleCardList">
                  {form.vehicles.map((vehicle, index) => (
                    <div className="vehicleItemCard" key={index}>
                      <div className="vehicleItemTop">
                        <div className="vehicleItemHeading">Vehicle {index + 1}</div>
                        {form.vehicles.length > 1 && (
                          <button
                            className="removeMiniBtn"
                            type="button"
                            onClick={() => removeVehicle(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="providerFormGrid">
                        <div>
                          <label className="label">Vehicle Type</label>
                          <select
                            className="select"
                            value={vehicle.vehicleType}
                            onChange={(e) =>
                              updateVehicle(index, "vehicleType", e.target.value)
                            }
                          >
                            {vehicleTypes.map((type) => (
                              <option value={type} key={type}>
                                {type}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="label">Title</label>
                          <input
                            className="input"
                            value={vehicle.title}
                            onChange={(e) =>
                              updateVehicle(index, "title", e.target.value)
                            }
                            placeholder="Example: Swift Dzire AC"
                          />
                        </div>

                        <div>
                          <label className="label">Price</label>
                          <input
                            className="input"
                            type="number"
                            value={vehicle.price}
                            onChange={(e) =>
                              updateVehicle(index, "price", e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label className="label">Capacity</label>
                          <input
                            className="input"
                            type="number"
                            value={vehicle.capacity}
                            onChange={(e) =>
                              updateVehicle(index, "capacity", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label className="label">Fuel Type</label>
                          <input
                            className="input"
                            value={vehicle.fuelType}
                            onChange={(e) =>
                              updateVehicle(index, "fuelType", e.target.value)
                            }
                            placeholder="Petrol / Diesel / EV"
                          />
                        </div>

                        <div className="vehicleCheckWrap">
                          <label className="providerCheck">
                            <input
                              type="checkbox"
                              checked={vehicle.withDriver}
                              onChange={(e) =>
                                updateVehicle(index, "withDriver", e.target.checked)
                              }
                            />
                            <span>With Driver</span>
                          </label>
                        </div>

                        <div className="fullCol">
                          <label className="label">Vehicle Images</label>
                          <input
                            className="input"
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              updateVehicle(index, "images", e.target.files)
                            }
                          />
                        </div>

                        {vehicle.existingImages?.length > 0 && (
                          <div className="fullCol">
                            <div className="providerImageGrid">
                              {vehicle.existingImages.map((img, imgIndex) => (
                                <div className="providerImageItem" key={imgIndex}>
                                  <img src={img.url} alt="vehicle" />
                                  <button
                                    type="button"
                                    className="removeImageBtn"
                                    onClick={() =>
                                      removeVehicleExistingImage(index, imgIndex)
                                    }
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.listingType === "travel_planner" && (
              <div className="providerBlock">
                <h3 className="providerBlockTitle">Travel Planner Details</h3>

                <div className="providerFormGrid">
                  <div>
                    <label className="label">Planner Type</label>
                    <select
                      className="select"
                      value={form.plannerMode}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, plannerMode: e.target.value }))
                      }
                    >
                      <option value="customized_trip">Customized Trip</option>
                      <option value="self_customized_places">
                        Self Customized Places
                      </option>
                      <option value="day_package">Day Package</option>
                      <option value="multi_day_package">Multi Day Package</option>
                      <option value="group_trip">Group Trip</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Package Title</label>
                    <input
                      className="input"
                      value={form.packageTitle}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, packageTitle: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label className="label">Duration</label>
                    <input
                      className="input"
                      value={form.durationText}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, durationText: e.target.value }))
                      }
                      placeholder="Example: 2 days 1 night"
                    />
                  </div>

                  <div>
                    <label className="label">Price From</label>
                    <input
                      className="input"
                      type="number"
                      value={form.priceFrom}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, priceFrom: e.target.value }))
                      }
                    />
                  </div>

                  <div className="fullCol">
                    <label className="label">Places Covered</label>
                    <input
                      className="input"
                      value={form.placesCovered}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, placesCovered: e.target.value }))
                      }
                      placeholder="Example: Jaipur Fort, City Palace, Hawa Mahal"
                    />
                  </div>

                  <div className="fullCol">
                    <label className="label">Inclusions</label>
                    <input
                      className="input"
                      value={form.inclusions}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, inclusions: e.target.value }))
                      }
                      placeholder="Example: Guide, transport, breakfast"
                    />
                  </div>

                  <div className="fullCol">
                    <label className="label">Exclusions</label>
                    <input
                      className="input"
                      value={form.exclusions}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, exclusions: e.target.value }))
                      }
                      placeholder="Example: Entry tickets, lunch"
                    />
                  </div>

                  <div className="fullCol">
                    <label className="label">Planner Images</label>
                    <input
                      className="input"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setForm((s) => ({ ...s, plannerImages: e.target.files }))
                      }
                    />
                  </div>

                  {form.existingPlannerImages?.length > 0 && (
                    <div className="fullCol">
                      <div className="providerImageGrid">
                        {form.existingPlannerImages.map((img, index) => (
                          <div className="providerImageItem" key={index}>
                            <img src={img.url} alt="planner" />
                            <button
                              type="button"
                              className="removeImageBtn"
                              onClick={() => removePlannerExistingImage(index)}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="providerFormActions">
              <button className="btn btnPrimary" type="submit">
                {editingId ? "Save Changes" : "Create Listing"}
              </button>
            </div>
          </form>
        </div>
      )}

      {myProviders.length > 0 && (
        <div className="providerOwnedSection">
          <div className="providerSectionTitle">My Listings</div>

          <div className="providerGrid">
            {myProviders.map((item) => (
              <div className="providerCard card" key={item._id}>
                <div className="providerCardTop">
                  <div>
                    <div className="providerCardTitle">{item.businessName}</div>
                    <div className="providerMetaText">
                      {item.city} • {item.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
                    </div>
                  </div>

                  <div className="providerCardActions">
                    <button className="btn" onClick={() => openEditForm(item)}>
                      Edit
                    </button>
                    <button className="btn" onClick={() => removeProvider(item._id)}>
                      Remove
                    </button>
                  </div>
                </div>

                <div className="providerDesc">{item.description || "No description added."}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="providerSearch card">
        <form
          className="providerSearchGrid"
          onSubmit={(e) => {
            e.preventDefault();
            loadProviders();
          }}
        >
          <input
            className="input"
            placeholder="Search providers"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />
          <input
            className="input"
            placeholder="City"
            value={filters.city}
            onChange={(e) => setFilters((s) => ({ ...s, city: e.target.value }))}
          />
          <select
            className="select"
            value={filters.listingType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, listingType: e.target.value }))
            }
          >
            <option value="">All Types</option>
            <option value="vehicle">Vehicle Service</option>
            <option value="travel_planner">Travel Planner</option>
          </select>
          <select
            className="select"
            value={filters.vehicleType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, vehicleType: e.target.value }))
            }
          >
            <option value="">All Vehicles</option>
            {vehicleTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button className="btn btnPrimary" type="submit">
            Search
          </button>
        </form>
      </div>

      <div className="providerGrid">
        {providers.map((item) => (
          <div className="providerCard card" key={item._id}>
            <div className="providerMedia">
              {item.listingType === "vehicle" ? (
                item.vehicles?.[0]?.images?.[0]?.url ? (
                  <img src={item.vehicles[0].images[0].url} alt={item.businessName} />
                ) : (
                  <div className="providerMediaEmpty">No Image</div>
                )
              ) : item.travelPlanner?.images?.[0]?.url ? (
                <img src={item.travelPlanner.images[0].url} alt={item.businessName} />
              ) : (
                <div className="providerMediaEmpty">No Image</div>
              )}
            </div>

            <div className="providerBody">
              <div className="providerCardTop">
                <div>
                  <div className="providerCardTitle">{item.businessName}</div>
                  <div className="providerMetaText">
                    {item.city} • by {item.owner?.name || "Provider"}
                  </div>
                </div>

                <div className="providerRating">
                  ⭐ {item.ratingAverage || 0} ({item.ratingCount || 0})
                </div>
              </div>

              <div className="providerTypeBadge">
                {item.listingType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
              </div>

              {item.listingType === "vehicle" && (
                <div className="providerMiniList">
                  {item.vehicles?.map((v, index) => (
                    <div key={index} className="providerMiniItem">
                      <strong>{v.vehicleType}</strong> — ₹{v.price}
                    </div>
                  ))}
                </div>
              )}

              {item.listingType === "travel_planner" && (
                <div className="providerMiniItem">
                  <strong>{item.travelPlanner?.packageTitle || "Package"}</strong>
                  {" — "}
                  ₹{item.travelPlanner?.priceFrom || 0}
                </div>
              )}

              <div className="providerDesc">
                {item.description || "No description available."}
              </div>

              <div className="providerCardActions">
                <button
                  className="btn"
                  onClick={async () => {
                    setSelectedProvider(item);
                    await loadReviews(item._id);
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProvider && (
        <div className="providerDetail card">
          <div className="providerDetailTop">
            <div>
              <div className="providerSectionTitle">{selectedProvider.businessName}</div>
              <div className="providerMetaText">
                {selectedProvider.city} • {selectedProvider.phone}
              </div>
            </div>
          </div>

          {selectedProvider.listingType === "vehicle" ? (
            <div className="detailVehicleList">
              {selectedProvider.vehicles?.map((vehicle, index) => (
                <div className="detailVehicleCard" key={index}>
                  <div className="detailVehicleHead">
                    <div className="detailVehicleTitle">
                      {vehicle.title || vehicle.vehicleType}
                    </div>
                    <div className="detailVehiclePrice">₹{vehicle.price}</div>
                  </div>

                  <div className="detailVehicleMeta">
                    Capacity: {vehicle.capacity || 1} • Fuel: {vehicle.fuelType || "N/A"} •{" "}
                    {vehicle.withDriver ? "With Driver" : "Without Driver"}
                  </div>

                  <div className="providerImageGrid">
                    {vehicle.images?.map((img, imgIndex) => (
                      <div className="providerImageItem" key={imgIndex}>
                        <img src={img.url} alt={vehicle.title || vehicle.vehicleType} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="plannerDetailBox">
              <div className="plannerTitle">
                {selectedProvider.travelPlanner?.packageTitle || "Travel Package"}
              </div>
              <div className="plannerMeta">
                {selectedProvider.travelPlanner?.plannerMode} • {selectedProvider.travelPlanner?.durationText} • ₹
                {selectedProvider.travelPlanner?.priceFrom || 0}
              </div>

              <div className="plannerInfoGrid">
                <div>
                  <div className="plannerInfoTitle">Places Covered</div>
                  <div className="plannerInfoText">
                    {(selectedProvider.travelPlanner?.placesCovered || []).join(", ") || "N/A"}
                  </div>
                </div>

                <div>
                  <div className="plannerInfoTitle">Inclusions</div>
                  <div className="plannerInfoText">
                    {(selectedProvider.travelPlanner?.inclusions || []).join(", ") || "N/A"}
                  </div>
                </div>

                <div>
                  <div className="plannerInfoTitle">Exclusions</div>
                  <div className="plannerInfoText">
                    {(selectedProvider.travelPlanner?.exclusions || []).join(", ") || "N/A"}
                  </div>
                </div>
              </div>

              <div className="providerImageGrid">
                {(selectedProvider.travelPlanner?.images || []).map((img, index) => (
                  <div className="providerImageItem" key={index}>
                    <img src={img.url} alt="planner" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="reviewSection">
            <div className="providerSectionTitle">Reviews</div>

            {!isLoggedIn() ? (
              <div className="providerNote">Please login to add a review.</div>
            ) : user &&
              String(selectedProvider.owner?._id || selectedProvider.owner) ===
                String(user.id) ? (
              <div className="providerNote">
                You cannot review your own product or service.
              </div>
            ) : (
              <form className="reviewForm" onSubmit={submitReview}>
                <select
                  className="select"
                  value={reviewForm.rating}
                  onChange={(e) =>
                    setReviewForm((s) => ({ ...s, rating: e.target.value }))
                  }
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>

                <textarea
                  className="textarea"
                  rows={3}
                  value={reviewForm.comment}
                  onChange={(e) =>
                    setReviewForm((s) => ({ ...s, comment: e.target.value }))
                  }
                  placeholder="Write your review"
                />

                <button className="btn btnPrimary" type="submit">
                  Submit Review
                </button>
              </form>
            )}

            <div className="reviewList">
              {reviews.length === 0 ? (
                <div className="providerNote">No reviews yet.</div>
              ) : (
                reviews.map((review) => (
                  <div className="reviewItem" key={review._id}>
                    <div className="reviewTop">
                      <div className="reviewUser">{review.user?.name || "User"}</div>
                      <div className="reviewStars">⭐ {review.rating}</div>
                    </div>
                    <div className="reviewText">{review.comment || "No comment"}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}