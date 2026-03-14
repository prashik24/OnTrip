import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import "./Providers.css";

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

export default function Providers() {
  const navigate = useNavigate();
  const currentUser = getUser();

  const [providers, setProviders] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

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
  });

  const listingTypeOptions = [
    { label: "Vehicle Service", value: "vehicle" },
    { label: "Travel Planner", value: "travel_planner" },
  ];

  const searchListingTypeOptions = [
    { label: "All Types", value: "" },
    { label: "Vehicle Service", value: "vehicle" },
    { label: "Travel Planner", value: "travel_planner" },
  ];

  const searchVehicleTypeOptions = [
    { label: "All Vehicles", value: "" },
    ...vehicleTypes.map((type) => ({
      label: type,
      value: type,
    })),
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
    });
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

  useEffect(() => {
    loadProviders();
  }, []);

  const visibleProviders = useMemo(() => {
    return providers.filter((item) => {
      if (!currentUser) return true;
      const ownerId = item.owner?._id || item.owner;
      return String(ownerId) !== String(currentUser.id);
    });
  }, [providers, currentUser]);

  function openCreateForm() {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    resetForm();
    setShowForm(true);
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

      if (form.serviceImage) fd.append("serviceImage", form.serviceImage);

      if (form.listingType === "vehicle") {
        const cleanVehicles = form.vehicles.map((v) => ({
          vehicleType: v.vehicleType,
          title: v.title,
          price: v.price,
          priceUnit: v.priceUnit,
          capacity: v.capacity,
          fuelType: v.fuelType,
          withDriver: v.withDriver,
        }));

        fd.append("vehicles", JSON.stringify(cleanVehicles));

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

        Array.from(form.plannerImages || []).forEach((file) => {
          fd.append("plannerImages", file);
        });
      }

      const data = await apiFetch("/api/providers", {
        method: "POST",
        body: fd,
      });

      setMessage(data.message, "success");
      setShowForm(false);
      resetForm();
      await loadProviders();
    } catch (err) {
      setMessage(err.message, "error");
    }
  }

  return (
    <div className="providersPage container">
      <section className="providersHero">
        <div>
          <h1 className="providersTitle">Provider Marketplace</h1>
          <p className="providersSub">
            Discover travel planners and vehicle services with rich cards, cleaner pricing, and a better booking flow.
          </p>
        </div>

        <button className="providersPrimaryBtn" onClick={openCreateForm}>
          Register as Provider
        </button>
      </section>

      {msg.text && (
        <div className={`providersMessage ${msg.type}`}>
          {msg.text}
        </div>
      )}

      {showForm && (
        <section className="providersFormWrap">
          <div className="providersFormHead">
            <div>
              <h2>Create Listing</h2>
              <p>Add your service information with professional structure.</p>
            </div>

            <button
              className="providersGhostBtn"
              type="button"
              onClick={() => setShowForm(false)}
            >
              Close
            </button>
          </div>

          <form className="providersForm" onSubmit={submitProvider}>
            <div className="providersFormGrid">
              <div className="fullSpan">
                <label>Business Name</label>
                <input
                  value={form.businessName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, businessName: e.target.value }))
                  }
                  required
                />
              </div>

              <div>
                <label>Listing Type</label>
                <CustomSelect
                  value={form.listingType}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, listingType: e.target.value }))
                  }
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
                  onChange={(e) =>
                    setForm((s) => ({ ...s, whatsapp: e.target.value }))
                  }
                />
              </div>

              <div className="fullSpan">
                <label>Service Card Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    setForm((s) => ({
                      ...s,
                      serviceImage: e.target.files?.[0] || null,
                    }))
                  }
                />
              </div>

              <div className="fullSpan">
                <label>Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </div>
            </div>

            {form.listingType === "vehicle" && (
              <div className="providersBlock">
                <div className="providersBlockHead">
                  <h3>Vehicles</h3>
                  <button
                    className="providersGhostBtn"
                    type="button"
                    onClick={addVehicle}
                  >
                    Add Vehicle
                  </button>
                </div>

                <div className="providersVehicleList">
                  {form.vehicles.map((vehicle, index) => (
                    <div className="providersVehicleCard" key={index}>
                      <div className="providersVehicleCardTop">
                        <strong>Vehicle {index + 1}</strong>

                        {form.vehicles.length > 1 && (
                          <button
                            className="providersDangerBtn"
                            type="button"
                            onClick={() => removeVehicle(index)}
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="providersFormGrid">
                        <div>
                          <label>Vehicle Type</label>
                          <CustomSelect
                            value={vehicle.vehicleType}
                            onChange={(e) =>
                              updateVehicle(index, "vehicleType", e.target.value)
                            }
                            options={vehicleTypes.map((type) => ({
                              label: type,
                              value: type,
                            }))}
                          />
                        </div>

                        <div>
                          <label>Title</label>
                          <input
                            value={vehicle.title}
                            onChange={(e) =>
                              updateVehicle(index, "title", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Price</label>
                          <input
                            type="number"
                            value={vehicle.price}
                            onChange={(e) =>
                              updateVehicle(index, "price", e.target.value)
                            }
                            required
                          />
                        </div>

                        <div>
                          <label>Price Unit</label>
                          <CustomSelect
                            value={vehicle.priceUnit}
                            onChange={(e) =>
                              updateVehicle(index, "priceUnit", e.target.value)
                            }
                            options={priceUnitOptions}
                          />
                        </div>

                        <div>
                          <label>Capacity</label>
                          <input
                            type="number"
                            value={vehicle.capacity}
                            onChange={(e) =>
                              updateVehicle(index, "capacity", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Fuel Type</label>
                          <input
                            value={vehicle.fuelType}
                            onChange={(e) =>
                              updateVehicle(index, "fuelType", e.target.value)
                            }
                          />
                        </div>

                        <div className="fullSpan">
                          <label>Driver Option</label>
                          <div className="providersCheckField">
                            <label className="providersCheck">
                              <input
                                type="checkbox"
                                checked={vehicle.withDriver}
                                onChange={(e) =>
                                  updateVehicle(
                                    index,
                                    "withDriver",
                                    e.target.checked
                                  )
                                }
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
                            onChange={(e) =>
                              updateVehicle(index, "images", e.target.files)
                            }
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {form.listingType === "travel_planner" && (
              <div className="providersBlock">
                <h3>Travel Planner Details</h3>

                <div className="providersFormGrid">
                  <div>
                    <label>Planner Type</label>
                    <CustomSelect
                      value={form.plannerMode}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, plannerMode: e.target.value }))
                      }
                      options={plannerModeOptions}
                    />
                  </div>

                  <div>
                    <label>Package Title</label>
                    <input
                      value={form.packageTitle}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, packageTitle: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label>Duration Text</label>
                    <input
                      value={form.durationText}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, durationText: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label>Days</label>
                    <input
                      type="number"
                      value={form.days}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, days: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label>Price From</label>
                    <input
                      type="number"
                      value={form.priceFrom}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, priceFrom: e.target.value }))
                      }
                    />
                  </div>

                  <div>
                    <label>Price Per Person</label>
                    <input
                      type="number"
                      value={form.pricePerPerson}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, pricePerPerson: e.target.value }))
                      }
                    />
                  </div>

                  <div className="fullSpan">
                    <label>Places Covered</label>
                    <input
                      value={form.placesCovered}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, placesCovered: e.target.value }))
                      }
                    />
                  </div>

                  <div className="fullSpan">
                    <label>Inclusions</label>
                    <input
                      value={form.inclusions}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, inclusions: e.target.value }))
                      }
                    />
                  </div>

                  <div className="fullSpan">
                    <label>Exclusions</label>
                    <input
                      value={form.exclusions}
                      onChange={(e) =>
                        setForm((s) => ({ ...s, exclusions: e.target.value }))
                      }
                    />
                  </div>

                  <div className="fullSpan">
                    <label>Planner Images</label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(e) =>
                        setForm((s) => ({ ...s, plannerImages: e.target.files }))
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            <button className="providersPrimaryBtn" type="submit">
              Create Listing
            </button>
          </form>
        </section>
      )}

      <section className="providersSearchBox">
        <form
          className="providersSearchGrid"
          onSubmit={(e) => {
            e.preventDefault();
            loadProviders();
          }}
        >
          <input
            className="providersSearchInput"
            placeholder="Search providers"
            value={filters.q}
            onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value }))}
          />

          <input
            className="providersSearchInput"
            placeholder="City / Destination"
            value={filters.city}
            onChange={(e) =>
              setFilters((s) => ({ ...s, city: e.target.value }))
            }
          />

          <CustomSelect
            className="providersSearchSelect"
            value={filters.listingType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, listingType: e.target.value }))
            }
            options={searchListingTypeOptions}
            placeholder="All Types"
          />

          <CustomSelect
            className="providersSearchSelect"
            value={filters.vehicleType}
            onChange={(e) =>
              setFilters((s) => ({ ...s, vehicleType: e.target.value }))
            }
            options={searchVehicleTypeOptions}
            placeholder="All Vehicles"
          />

          <button className="providersSearchBtn" type="submit">
            Search
          </button>
        </form>
      </section>

      <section className="providersGrid">
        {visibleProviders.map((item) => (
          <div className="providerCard" key={item._id}>
            <div className="providerCardMedia">
              {item.serviceImage?.url ? (
                <img src={item.serviceImage.url} alt={item.businessName} />
              ) : item.listingType === "vehicle" ? (
                item.vehicles?.[0]?.images?.[0]?.url ? (
                  <img
                    src={item.vehicles[0].images[0].url}
                    alt={item.businessName}
                  />
                ) : (
                  <div className="providerCardMediaEmpty">No Image</div>
                )
              ) : item.travelPlanner?.images?.[0]?.url ? (
                <img
                  src={item.travelPlanner.images[0].url}
                  alt={item.businessName}
                />
              ) : (
                <div className="providerCardMediaEmpty">No Image</div>
              )}
            </div>

            <div className="providerCardBody">
              <div className="providerCardHeader">
                <div>
                  <h3>{item.businessName}</h3>
                  <p>
                    {item.city} • by {item.owner?.name || "Provider"}
                  </p>
                </div>
                <div className="providerCardRating">
                  ⭐ {item.ratingAverage || 0}
                </div>
              </div>

              <div className="providerTypePill">
                {item.listingType === "vehicle"
                  ? "Vehicle Service"
                  : "Travel Planner"}
              </div>

              <div className="providerCardDesc">
                {item.description || "No description available."}
              </div>

              <button
                className="providersGhostBtn"
                onClick={() => navigate(`/providers/${item._id}`)}
              >
                View Details
              </button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}