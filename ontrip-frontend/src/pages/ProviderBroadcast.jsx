import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderBroadcast.css";

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildServiceTypeOptions() {
  return [
    { value: "vehicle", label: "Vehicle Service" },
    { value: "travel_planner", label: "Travel Planner" },
  ];
}

function makeProviderOptions(items = [], type = "vehicle") {
  return items
    .filter((item) => item.listingType === type)
    .map((item) => ({
      value: item._id,
      label: `${item.businessName}`,
    }));
}

function makeVehicleTypeOptions(vehicles = []) {
  const uniqueTypes = [
    ...new Set((vehicles || []).map((item) => item.vehicleType).filter(Boolean)),
  ];

  return uniqueTypes.map((type) => ({
    value: type,
    label: formatLabel(type),
  }));
}

function getDefaultVehicleByType(vehicles = [], selectedVehicleType = "") {
  return (
    (vehicles || []).find((item) =>
      selectedVehicleType
        ? String(item.vehicleType || "").toLowerCase() ===
          String(selectedVehicleType || "").toLowerCase()
        : true
    ) || null
  );
}

function makeTripOptions(travelPlans = []) {
  return travelPlans.map((item, index) => ({
    value: String(index),
    label: `${item.packageTitle || `Trip ${index + 1}`}`,
  }));
}

function buildVehicleMessage({ provider, listing, vehicle, customMessage }) {
  return `
Provider Update from OnTrip

Business Name: ${provider?.businessName || listing?.businessName || "-"}
City: ${listing?.city || "-"}
State: ${listing?.state || "-"}
Listing Type: Vehicle Service

Vehicle Details
Vehicle Type: ${formatLabel(vehicle?.vehicleType || "-")}
Title: ${vehicle?.title || "-"}
Price: ₹${vehicle?.price || 0}
Price Unit: ${formatLabel(vehicle?.priceUnit || "-")}
Capacity: ${vehicle?.capacity || "-"}
Fuel Type: ${vehicle?.fuelType || "-"}
With Driver: ${vehicle?.withDriver ? "Yes" : "No"}

Description
${listing?.description || "-"}

Extra Message
${customMessage || "-"}
  `.trim();
}

function buildTripMessage({ provider, listing, trip, customMessage }) {
  return `
Provider Update from OnTrip

Business Name: ${provider?.businessName || listing?.businessName || "-"}
City: ${listing?.city || "-"}
State: ${listing?.state || "-"}
Listing Type: Travel Planner

Trip Details
Planner Type: ${formatLabel(trip?.plannerMode || "-")}
Package Title: ${trip?.packageTitle || "-"}
Duration: ${trip?.durationText || "-"}
Days: ${trip?.days || "-"}
Price From: ₹${trip?.priceFrom || 0}
Price Per Person: ₹${trip?.pricePerPerson || 0}
Places Covered: ${
    Array.isArray(trip?.placesCovered)
      ? trip.placesCovered.join(", ")
      : trip?.placesCovered || "-"
  }
Inclusions: ${
    Array.isArray(trip?.inclusions)
      ? trip.inclusions.join(", ")
      : trip?.inclusions || "-"
  }
Exclusions: ${
    Array.isArray(trip?.exclusions)
      ? trip.exclusions.join(", ")
      : trip?.exclusions || "-"
  }

Description
${listing?.description || "-"}

Extra Message
${customMessage || "-"}
  `.trim();
}

function getTravelPlans(provider) {
  if (!provider) return [];

  if (provider.travelPlans?.length > 0) {
    return provider.travelPlans;
  }

  if (
    provider.travelPlanner?.packageTitle ||
    provider.travelPlanner?.durationText ||
    provider.travelPlanner?.images?.length
  ) {
    return [provider.travelPlanner];
  }

  return [];
}

function getSelectedHeroImage(provider, listingType, selectedVehicle, selectedTrip) {
  if (listingType === "vehicle") {
    return (
      selectedVehicle?.images?.[0]?.url ||
      provider?.serviceImage?.url ||
      "/images/places/mumbai-hero.jpg"
    );
  }

  return (
    selectedTrip?.images?.[0]?.url ||
    provider?.serviceImage?.url ||
    "/images/places/manali-hero.jpg"
  );
}

export default function ProviderBroadcast() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });
  const [providers, setProviders] = useState([]);

  const [form, setForm] = useState({
    serviceType: "vehicle",
    providerId: "",
    vehicleType: "",
    selectedTripIndex: "0",
    subject: "",
    customMessage: "",
  });

  async function loadPage() {
    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const providerData = await apiFetch("/api/providers/mine");
      const nextProviders = providerData.providers || [];
      setProviders(nextProviders);
    } catch (err) {
      setMsg({
        text: err.message || "Failed to load provider broadcast page.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPage();
  }, []);

  const vehicleProviders = useMemo(
    () => providers.filter((item) => item.listingType === "vehicle"),
    [providers]
  );

  const travelProviders = useMemo(
    () => providers.filter((item) => item.listingType === "travel_planner"),
    [providers]
  );

  useEffect(() => {
    if (!providers.length) return;

    const hasSelectedTypeProvider =
      form.serviceType === "vehicle"
        ? vehicleProviders.some((item) => item._id === form.providerId)
        : travelProviders.some((item) => item._id === form.providerId);

    if (hasSelectedTypeProvider) return;

    const firstProvider =
      form.serviceType === "vehicle" ? vehicleProviders[0] : travelProviders[0];

    setForm((prev) => ({
      ...prev,
      providerId: firstProvider?._id || "",
      vehicleType: "",
      selectedTripIndex: "0",
    }));
  }, [providers, vehicleProviders, travelProviders, form.serviceType, form.providerId]);

  const selectedProvider = useMemo(() => {
    return providers.find((item) => item._id === form.providerId) || null;
  }, [providers, form.providerId]);

  const vehicleTypeOptions = useMemo(() => {
    return makeVehicleTypeOptions(selectedProvider?.vehicles || []);
  }, [selectedProvider]);

  useEffect(() => {
    if (form.serviceType !== "vehicle") return;
    if (!selectedProvider) return;

    const availableTypes = makeVehicleTypeOptions(selectedProvider.vehicles || []);
    const hasVehicleType = availableTypes.some((item) => item.value === form.vehicleType);

    if (hasVehicleType) return;

    setForm((prev) => ({
      ...prev,
      vehicleType: availableTypes[0]?.value || "",
    }));
  }, [form.serviceType, selectedProvider, form.vehicleType]);

  const selectedVehicle = useMemo(() => {
    if (form.serviceType !== "vehicle" || !selectedProvider) return null;
    return getDefaultVehicleByType(selectedProvider.vehicles || [], form.vehicleType);
  }, [form.serviceType, selectedProvider, form.vehicleType]);

  const tripSource = useMemo(() => getTravelPlans(selectedProvider), [selectedProvider]);

  const tripOptions = useMemo(() => makeTripOptions(tripSource), [tripSource]);

  useEffect(() => {
    if (form.serviceType !== "travel_planner") return;

    const maxIndex = Math.max(0, tripOptions.length - 1);
    const currentIndex = Number(form.selectedTripIndex || 0);

    if (currentIndex <= maxIndex) return;

    setForm((prev) => ({
      ...prev,
      selectedTripIndex: "0",
    }));
  }, [form.serviceType, tripOptions, form.selectedTripIndex]);

  const selectedTrip = useMemo(() => {
    if (form.serviceType !== "travel_planner") return null;
    return tripSource?.[Number(form.selectedTripIndex || 0)] || null;
  }, [form.serviceType, tripSource, form.selectedTripIndex]);

  const previewImage = useMemo(() => {
    return getSelectedHeroImage(
      selectedProvider,
      form.serviceType,
      selectedVehicle,
      selectedTrip
    );
  }, [selectedProvider, form.serviceType, selectedVehicle, selectedTrip]);

  const previewTitle =
    form.serviceType === "vehicle"
      ? selectedVehicle?.title || selectedProvider?.businessName || "Vehicle Service"
      : selectedTrip?.packageTitle || selectedProvider?.businessName || "Travel Planner";

  const previewSubtitle =
    form.serviceType === "vehicle"
      ? `${formatLabel(selectedVehicle?.vehicleType || "vehicle")} • ${
          selectedProvider?.city || "-"
        }`
      : `${selectedTrip?.durationText || `${selectedTrip?.days || 1} day(s)`} • ${
          selectedProvider?.city || "-"
        }`;

  async function sendBroadcast(e) {
    e.preventDefault();

    if (!selectedProvider) {
      setMsg({ text: "Please select a service first.", type: "error" });
      return;
    }

    if (!form.subject.trim()) {
      setMsg({ text: "Subject is required.", type: "error" });
      return;
    }

    if (form.serviceType === "vehicle" && !selectedVehicle) {
      setMsg({ text: "Please select a vehicle type.", type: "error" });
      return;
    }

    if (form.serviceType === "travel_planner" && !selectedTrip) {
      setMsg({ text: "Please select a trip.", type: "error" });
      return;
    }

    try {
      setSendLoading(true);
      setMsg({ text: "", type: "" });

      const message =
        form.serviceType === "vehicle"
          ? buildVehicleMessage({
              provider: selectedProvider,
              listing: selectedProvider,
              vehicle: selectedVehicle,
              customMessage: form.customMessage,
            })
          : buildTripMessage({
              provider: selectedProvider,
              listing: selectedProvider,
              trip: selectedTrip,
              customMessage: form.customMessage,
            });

      const response = await apiFetch("/api/provider-broadcasts/send", {
        method: "POST",
        body: JSON.stringify({
          subject: form.subject.trim(),
          message,
        }),
      });

      setMsg({
        text:
          response.message ||
          `Broadcast sent successfully to ${response.count || 0} subscribers.`,
        type: "success",
      });

      setForm((prev) => ({
        ...prev,
        subject: "",
        customMessage: "",
      }));
    } catch (err) {
      setMsg({
        text: err.message || "Failed to send broadcast.",
        type: "error",
      });
    } finally {
      setSendLoading(false);
    }
  }

  if (loading) {
    return <LoadingSpinner text="Loading provider broadcast..." />;
  }

  return (
    <div className="providerBroadcastPage container">
      {msg.text ? (
        <div className={`providerBroadcastMessage ${msg.type}`}>
          {msg.text}
        </div>
      ) : null}

      {!providers.length ? (
        <div className="providerBroadcastEmpty">
          No provider listings found. Please create a listing first before sending broadcasts.
        </div>
      ) : (
        <form className="providerBroadcastCard" onSubmit={sendBroadcast}>
          <div className="providerBroadcastBanner">
            <div>
              <div className="providerBroadcastKicker">OnTrip Provider Tools</div>
              <h1>Send Provider Broadcast</h1>
              <p>
                Create a professional trip or vehicle update for all subscribed users.
              </p>
            </div>

            <button
              className="providerBroadcastRefBtn"
              type="button"
              onClick={() => navigate("/provider-broadcast-history")}
            >
              View Broadcast History
            </button>
          </div>

          <div className="providerBroadcastTop">
            <div className="providerBroadcastImageWrap">
              <img
                src={previewImage}
                alt={previewTitle}
                className="providerBroadcastImage"
              />
            </div>

            <div className="providerBroadcastSummary">
              <div className="providerBroadcastType">
                {form.serviceType === "vehicle" ? "Vehicle Service" : "Travel Planner"}
              </div>

              <h2>{previewTitle}</h2>
              <p>{previewSubtitle}</p>

              <div className="providerBroadcastMeta">
                <span>Business: {selectedProvider?.businessName || "-"}</span>
                <span>City: {selectedProvider?.city || "-"}</span>
                <span>State: {selectedProvider?.state || "-"}</span>
              </div>
            </div>
          </div>

          <div className="providerBroadcastFormBlock">
            <div className="providerBroadcastGrid">
              <div className="fullSpan">
                <label>Select Listing</label>
                <CustomSelect
                  value={form.serviceType}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      serviceType: e.target.value,
                      providerId: "",
                      vehicleType: "",
                      selectedTripIndex: "0",
                    }))
                  }
                  options={buildServiceTypeOptions()}
                />
              </div>

              {form.serviceType === "vehicle" ? (
                <>
                  <div>
                    <label>Select Vehicle Service</label>
                    <CustomSelect
                      value={form.providerId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          providerId: e.target.value,
                          vehicleType: "",
                        }))
                      }
                      options={makeProviderOptions(providers, "vehicle")}
                      placeholder="Choose vehicle service"
                    />
                  </div>

                  <div>
                    <label>Select Vehicle Type</label>
                    <CustomSelect
                      value={form.vehicleType}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          vehicleType: e.target.value,
                        }))
                      }
                      options={vehicleTypeOptions}
                      placeholder="Choose vehicle type"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label>Select Travel Planner</label>
                    <CustomSelect
                      value={form.providerId}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          providerId: e.target.value,
                          selectedTripIndex: "0",
                        }))
                      }
                      options={makeProviderOptions(providers, "travel_planner")}
                      placeholder="Choose travel planner"
                    />
                  </div>

                  <div>
                    <label>Select Trip</label>
                    <CustomSelect
                      value={form.selectedTripIndex}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          selectedTripIndex: e.target.value,
                        }))
                      }
                      options={tripOptions}
                      placeholder="Choose trip"
                    />
                  </div>
                </>
              )}

              <div className="fullSpan">
                <label>Subject</label>
                <input
                  value={form.subject}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, subject: e.target.value }))
                  }
                  placeholder="Example: New Goa group trip now open"
                  required
                />
              </div>

              <div className="fullSpan">
                <label>Extra Message</label>
                <textarea
                  rows={5}
                  value={form.customMessage}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      customMessage: e.target.value,
                    }))
                  }
                  placeholder="Add your custom update, seasonal offer, note, or special message..."
                />
              </div>
            </div>
          </div>

          {form.serviceType === "vehicle" && selectedVehicle ? (
            <div className="providerBroadcastPreviewCard">
              <div className="providerBroadcastPreviewHead">
                <h3>Vehicle Preview</h3>
              </div>

              <div className="providerBroadcastPreviewBody">
                <div className="providerBroadcastInfoGrid">
                  <div>
                    <strong>Business</strong>
                    <span>{selectedProvider?.businessName || "-"}</span>
                  </div>
                  <div>
                    <strong>City</strong>
                    <span>{selectedProvider?.city || "-"}</span>
                  </div>
                  <div>
                    <strong>Vehicle Type</strong>
                    <span>{formatLabel(selectedVehicle.vehicleType || "-")}</span>
                  </div>
                  <div>
                    <strong>Title</strong>
                    <span>{selectedVehicle.title || "-"}</span>
                  </div>
                  <div>
                    <strong>Price</strong>
                    <span>₹{selectedVehicle.price || 0}</span>
                  </div>
                  <div>
                    <strong>Price Unit</strong>
                    <span>{formatLabel(selectedVehicle.priceUnit || "-")}</span>
                  </div>
                  <div>
                    <strong>Capacity</strong>
                    <span>{selectedVehicle.capacity || "-"}</span>
                  </div>
                  <div>
                    <strong>Fuel Type</strong>
                    <span>{selectedVehicle.fuelType || "-"}</span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Driver Option</strong>
                    <span>
                      {selectedVehicle.withDriver ? "With Driver" : "Self Drive / No Driver"}
                    </span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Description</strong>
                    <span>{selectedProvider?.description || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {form.serviceType === "travel_planner" && selectedTrip ? (
            <div className="providerBroadcastPreviewCard">
              <div className="providerBroadcastPreviewHead">
                <h3>Trip Preview</h3>
              </div>

              <div className="providerBroadcastPreviewBody">
                <div className="providerBroadcastInfoGrid">
                  <div>
                    <strong>Business</strong>
                    <span>{selectedProvider?.businessName || "-"}</span>
                  </div>
                  <div>
                    <strong>City</strong>
                    <span>{selectedProvider?.city || "-"}</span>
                  </div>
                  <div>
                    <strong>Planner Type</strong>
                    <span>{formatLabel(selectedTrip.plannerMode || "-")}</span>
                  </div>
                  <div>
                    <strong>Package Title</strong>
                    <span>{selectedTrip.packageTitle || "-"}</span>
                  </div>
                  <div>
                    <strong>Duration</strong>
                    <span>{selectedTrip.durationText || "-"}</span>
                  </div>
                  <div>
                    <strong>Days</strong>
                    <span>{selectedTrip.days || "-"}</span>
                  </div>
                  <div>
                    <strong>Price From</strong>
                    <span>₹{selectedTrip.priceFrom || 0}</span>
                  </div>
                  <div>
                    <strong>Price Per Person</strong>
                    <span>₹{selectedTrip.pricePerPerson || 0}</span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Places Covered</strong>
                    <span>
                      {Array.isArray(selectedTrip.placesCovered)
                        ? selectedTrip.placesCovered.join(", ")
                        : selectedTrip.placesCovered || "-"}
                    </span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Inclusions</strong>
                    <span>
                      {Array.isArray(selectedTrip.inclusions)
                        ? selectedTrip.inclusions.join(", ")
                        : selectedTrip.inclusions || "-"}
                    </span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Exclusions</strong>
                    <span>
                      {Array.isArray(selectedTrip.exclusions)
                        ? selectedTrip.exclusions.join(", ")
                        : selectedTrip.exclusions || "-"}
                    </span>
                  </div>
                  <div className="providerBroadcastInfoWide">
                    <strong>Description</strong>
                    <span>{selectedProvider?.description || "-"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="providerBroadcastActions">
            <button
              className="providerBroadcastPrimaryBtn"
              type="submit"
              disabled={sendLoading}
            >
              {sendLoading ? "Sending..." : "Send Broadcast"}
            </button>

            <button
              className="providerBroadcastGhostBtn"
              type="button"
              onClick={() =>
                setForm((prev) => ({
                  ...prev,
                  subject: "",
                  customMessage: "",
                }))
              }
            >
              Clear
            </button>
          </div>
        </form>
      )}
    </div>
  );
}