import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./MyListingEdit.css";

const vehicleTypes = [
  "car",
  "bike",
  "van",
  "truck",
  "jeep",
  "bus",
  "scooty",
  "cycle",
];

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

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
    existingImages: [],
  };
}

function onlyPhone(value) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export default function MyListingEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);

  const [form, setForm] = useState({
    businessName: "",
    listingType: "vehicle",
    city: "",
    state: "",
    phone: "",
    whatsapp: "",
    description: "",
    serviceImage: null,
    currentServiceImageUrl: "",
    vehicles: [emptyVehicle()],
    travelPlans: [emptyTrip()],
  });

  const listingTypeOptions = useMemo(
    () => [
      { label: formatLabel("vehicle"), value: "vehicle" },
      { label: formatLabel("travel_planner"), value: "travel_planner" },
    ],
    []
  );

  const plannerModeOptions = useMemo(
    () => [
      { label: formatLabel("customized_trip"), value: "customized_trip" },
      { label: formatLabel("self_customized_places"), value: "self_customized_places" },
      { label: formatLabel("day_package"), value: "day_package" },
      { label: formatLabel("multi_day_package"), value: "multi_day_package" },
      { label: formatLabel("group_trip"), value: "group_trip" },
    ],
    []
  );

  const priceUnitOptions = useMemo(
    () => [
      { label: formatLabel("per_day"), value: "per_day" },
      { label: formatLabel("per_hour"), value: "per_hour" },
      { label: formatLabel("fixed"), value: "fixed" },
    ],
    []
  );

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch(`/api/providers/${id}`);
        const item = data.provider;

        const plans =
          item.travelPlans?.length > 0
            ? item.travelPlans
            : item.travelPlanner?.packageTitle ||
              item.travelPlanner?.durationText ||
              item.travelPlanner?.images?.length
            ? [item.travelPlanner]
            : [emptyTrip()];

        setForm({
          businessName: item.businessName || "",
          listingType: item.listingType || "vehicle",
          city: item.city || "",
          state: item.state || "",
          phone: item.phone || "",
          whatsapp: item.whatsapp || "",
          description: item.description || "",
          serviceImage: null,
          currentServiceImageUrl: item.serviceImage?.url || "",
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
          travelPlans: plans.map((trip) => ({
            plannerMode: trip.plannerMode || "customized_trip",
            packageTitle: trip.packageTitle || "",
            durationText: trip.durationText || "",
            days: trip.days || "",
            priceFrom: trip.priceFrom || "",
            pricePerPerson: trip.pricePerPerson || "",
            placesCovered: Array.isArray(trip.placesCovered)
              ? trip.placesCovered.join(", ")
              : trip.placesCovered || "",
            inclusions: Array.isArray(trip.inclusions)
              ? trip.inclusions.join(", ")
              : trip.inclusions || "",
            exclusions: Array.isArray(trip.exclusions)
              ? trip.exclusions.join(", ")
              : trip.exclusions || "",
            images: null,
            existingImages: trip.images || [],
          })),
        });
      } catch (err) {
        setMsg(err.message || "Failed to load listing.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

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
              existingImages: item.existingImages.filter(
                (_, idx) => idx !== imageIndex
              ),
            }
          : item
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

  function removeTripExistingImage(tripIndex, imageIndex) {
    setForm((prev) => ({
      ...prev,
      travelPlans: prev.travelPlans.map((item, i) =>
        i === tripIndex
          ? {
              ...item,
              existingImages: item.existingImages.filter(
                (_, idx) => idx !== imageIndex
              ),
            }
          : item
      ),
    }));
  }

  async function saveEdit(e) {
    e.preventDefault();

    if (form.phone.length !== 10) {
      setMsg("Phone number must be 10 digits.");
      return;
    }

    if (form.whatsapp && form.whatsapp.length !== 10) {
      setMsg("WhatsApp number must be 10 digits.");
      return;
    }

    try {
      setSaveLoading(true);
      setMsg("");

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

        fd.append(
          "existingTravelPlans",
          JSON.stringify(
            form.travelPlans.map((trip) => ({
              images: trip.existingImages || [],
            }))
          )
        );

        form.travelPlans.forEach((trip, index) => {
          Array.from(trip.images || []).forEach((file) => {
            fd.append(`plannerImages_${index}`, file);
          });
        });
      }

      await apiFetch(`/api/providers/${id}`, {
        method: "PUT",
        body: fd,
      });

      setMsg("Listing updated successfully.");
      navigate("/profile/my-listings");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setSaveLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading listing editor..." />;
  }

  return (
    <div className="myListingEditPage container">
      <div className="myListingEditHead">
        <div>
          <h1>Edit Listing</h1>
          <p>Update your service details, images, pricing, and package data.</p>
        </div>

        <button
          className="myListingEditBtn"
          type="button"
          onClick={() => navigate("/profile/my-listings")}
        >
          Back to My Listings
        </button>
      </div>

      {msg && <div className="myListingEditMessage">{msg}</div>}

      <form className="myListingEditCard" onSubmit={saveEdit}>
        <div className="myListingEditTopImageSection">
          <label>Current Service Image</label>
          {form.currentServiceImageUrl ? (
            <div className="myListingEditSinglePreview">
              <img src={form.currentServiceImageUrl} alt="service" />
            </div>
          ) : (
            <div className="myListingEditEmptyPreview">No service image</div>
          )}
        </div>

        <div className="myListingEditFormGrid">
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
              onChange={(e) =>
                setForm((s) => ({ ...s, state: e.target.value }))
              }
            />
          </div>

          <div>
            <label>Phone</label>
            <input
              inputMode="numeric"
              value={form.phone}
              onChange={(e) =>
                setForm((s) => ({ ...s, phone: onlyPhone(e.target.value) }))
              }
              required
            />
          </div>

          <div>
            <label>WhatsApp</label>
            <input
              inputMode="numeric"
              value={form.whatsapp}
              onChange={(e) =>
                setForm((s) => ({ ...s, whatsapp: onlyPhone(e.target.value) }))
              }
            />
          </div>

          <div className="fullSpan">
            <label>Change Service Card Image</label>
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
          <div className="myListingEditBlock">
            <div className="myListingEditBlockHead">
              <h4>Vehicles</h4>
              <button
                className="myListingEditBtn myListingEditBtnPrimary"
                type="button"
                onClick={addVehicle}
              >
                Add Vehicle
              </button>
            </div>

            <div className="myListingEditVehicleList">
              {form.vehicles.map((vehicle, index) => (
                <div className="myListingEditVehicleCard" key={index}>
                  <div className="myListingEditItemTop">
                    <strong>Vehicle {index + 1}</strong>
                    {form.vehicles.length > 1 && (
                      <button
                        className="myListingEditBtn danger"
                        type="button"
                        onClick={() => removeVehicle(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="myListingEditFormGrid">
                    <div>
                      <label>Vehicle Type</label>
                      <CustomSelect
                        value={vehicle.vehicleType}
                        onChange={(e) =>
                          updateVehicle(index, "vehicleType", e.target.value)
                        }
                        options={vehicleTypes.map((type) => ({
                          label: formatLabel(type),
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
                      <div className="myListingEditCheckField">
                        <label className="myListingEditCheck">
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

                    {vehicle.existingImages?.length > 0 && (
                      <div className="fullSpan myListingEditImageGrid">
                        {vehicle.existingImages.map((img, imgIndex) => (
                          <div className="myListingEditThumb" key={imgIndex}>
                            <img src={img.url} alt="vehicle" />
                            <button
                              type="button"
                              className="myListingEditRemoveImage"
                              onClick={() =>
                                removeVehicleExistingImage(index, imgIndex)
                              }
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
          <div className="myListingEditBlock">
            <div className="myListingEditBlockHead">
              <h4>Travel Trips</h4>
              <button
                className="myListingEditBtn myListingEditBtnPrimary"
                type="button"
                onClick={addTrip}
              >
                Add Trip
              </button>
            </div>

            <div className="myListingEditTripList">
              {form.travelPlans.map((trip, index) => (
                <div className="myListingEditTripCard" key={index}>
                  <div className="myListingEditItemTop">
                    <strong>Trip {index + 1}</strong>
                    {form.travelPlans.length > 1 && (
                      <button
                        className="myListingEditBtn danger"
                        type="button"
                        onClick={() => removeTrip(index)}
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="myListingEditFormGrid">
                    <div>
                      <label>Planner Type</label>
                      <CustomSelect
                        value={trip.plannerMode}
                        onChange={(e) =>
                          updateTrip(index, "plannerMode", e.target.value)
                        }
                        options={plannerModeOptions}
                      />
                    </div>

                    <div>
                      <label>Package Title</label>
                      <input
                        value={trip.packageTitle}
                        onChange={(e) =>
                          updateTrip(index, "packageTitle", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label>Duration Text</label>
                      <input
                        value={trip.durationText}
                        onChange={(e) =>
                          updateTrip(index, "durationText", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label>Days</label>
                      <input
                        type="number"
                        value={trip.days}
                        onChange={(e) =>
                          updateTrip(index, "days", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label>Price From</label>
                      <input
                        type="number"
                        value={trip.priceFrom}
                        onChange={(e) =>
                          updateTrip(index, "priceFrom", e.target.value)
                        }
                      />
                    </div>

                    <div>
                      <label>Price Per Person</label>
                      <input
                        type="number"
                        value={trip.pricePerPerson}
                        onChange={(e) =>
                          updateTrip(index, "pricePerPerson", e.target.value)
                        }
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Places Covered</label>
                      <input
                        value={trip.placesCovered}
                        onChange={(e) =>
                          updateTrip(index, "placesCovered", e.target.value)
                        }
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Inclusions</label>
                      <input
                        value={trip.inclusions}
                        onChange={(e) =>
                          updateTrip(index, "inclusions", e.target.value)
                        }
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Exclusions</label>
                      <input
                        value={trip.exclusions}
                        onChange={(e) =>
                          updateTrip(index, "exclusions", e.target.value)
                        }
                      />
                    </div>

                    <div className="fullSpan">
                      <label>Trip Images</label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) =>
                          updateTrip(index, "images", e.target.files)
                        }
                      />
                    </div>

                    {trip.existingImages?.length > 0 && (
                      <div className="fullSpan myListingEditImageGrid">
                        {trip.existingImages.map((img, imgIndex) => (
                          <div className="myListingEditThumb" key={imgIndex}>
                            <img src={img.url} alt="planner" />
                            <button
                              type="button"
                              className="myListingEditRemoveImage"
                              onClick={() =>
                                removeTripExistingImage(index, imgIndex)
                              }
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

        <div className="myListingEditActions">
          <button
            className="myListingEditBtn myListingEditBtnPrimary"
            type="submit"
            disabled={saveLoading}
          >
            {saveLoading ? "Saving..." : "Save Changes"}
          </button>

          <button
            className="myListingEditBtn"
            type="button"
            onClick={() => navigate("/profile/my-listings")}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}