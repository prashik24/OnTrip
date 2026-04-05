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

function makeListingOptions(items = []) {
  return items.map((item) => ({
    value: item._id,
    label: `${item.businessName} • ${item.city} • ${
      item.listingType === "vehicle" ? "Vehicle" : "Travel"
    }`,
  }));
}

function makeVehicleOptions(vehicles = []) {
  return vehicles.map((item, index) => ({
    value: String(index),
    label: `${item.title || `Vehicle ${index + 1}`} • ${formatLabel(
      item.vehicleType
    )} • ₹${item.price || 0}`,
  }));
}

function makeTripOptions(travelPlans = []) {
  return travelPlans.map((item, index) => ({
    value: String(index),
    label: `${item.packageTitle || `Trip ${index + 1}`} • ${
      item.durationText || `${item.days || 1} day(s)`
    } • ₹${item.priceFrom || item.pricePerPerson || 0}`,
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

export default function ProviderBroadcast() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [sendLoading, setSendLoading] = useState(false);
  const [msg, setMsg] = useState({ text: "", type: "" });

  const [providers, setProviders] = useState([]);
  const [history, setHistory] = useState([]);

  const [form, setForm] = useState({
    providerId: "",
    itemIndex: "0",
    subject: "",
    customMessage: "",
  });

  async function loadPage() {
    try {
      setLoading(true);
      setMsg({ text: "", type: "" });

      const [providerData, historyData] = await Promise.all([
        apiFetch("/api/providers/mine"),
        apiFetch("/api/provider-broadcasts/my"),
      ]);

      const nextProviders = providerData.providers || [];
      const nextHistory = Array.isArray(historyData)
        ? historyData
        : historyData.broadcasts || [];

      setProviders(nextProviders);
      setHistory(nextHistory);

      if (nextProviders.length > 0) {
        setForm((prev) => ({
          ...prev,
          providerId: prev.providerId || nextProviders[0]._id,
          itemIndex: "0",
        }));
      }
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

  const selectedProvider = useMemo(() => {
    return providers.find((item) => item._id === form.providerId) || null;
  }, [providers, form.providerId]);

  const selectedListingType = selectedProvider?.listingType || "vehicle";

  const vehicleOptions = useMemo(() => {
    return makeVehicleOptions(selectedProvider?.vehicles || []);
  }, [selectedProvider]);

  const tripOptions = useMemo(() => {
    const plans =
      selectedProvider?.travelPlans?.length > 0
        ? selectedProvider.travelPlans
        : selectedProvider?.travelPlanner?.packageTitle ||
          selectedProvider?.travelPlanner?.durationText
        ? [selectedProvider.travelPlanner]
        : [];

    return makeTripOptions(plans);
  }, [selectedProvider]);

  const selectedVehicle =
    selectedListingType === "vehicle"
      ? selectedProvider?.vehicles?.[Number(form.itemIndex)] || null
      : null;

  const tripSource =
    selectedProvider?.travelPlans?.length > 0
      ? selectedProvider.travelPlans
      : selectedProvider?.travelPlanner?.packageTitle ||
        selectedProvider?.travelPlanner?.durationText
      ? [selectedProvider.travelPlanner]
      : [];

  const selectedTrip =
    selectedListingType === "travel_planner"
      ? tripSource?.[Number(form.itemIndex)] || null
      : null;

  async function sendBroadcast(e) {
    e.preventDefault();

    if (!selectedProvider) {
      setMsg({ text: "Please select a listing first.", type: "error" });
      return;
    }

    if (!form.subject.trim()) {
      setMsg({ text: "Subject is required.", type: "error" });
      return;
    }

    if (selectedListingType === "vehicle" && !selectedVehicle) {
      setMsg({ text: "Please select a vehicle.", type: "error" });
      return;
    }

    if (selectedListingType === "travel_planner" && !selectedTrip) {
      setMsg({ text: "Please select a trip.", type: "error" });
      return;
    }

    try {
      setSendLoading(true);
      setMsg({ text: "", type: "" });

      const message =
        selectedListingType === "vehicle"
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

      await loadPage();
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
      <div className="providerBroadcastHead">
        <div>
          <h1>Provider Broadcast</h1>
          <p>
            Send trip or vehicle updates to all subscribed users and review your
            previous broadcasts.
          </p>
        </div>

        <button
          className="providerBroadcastBtn"
          type="button"
          onClick={() => navigate("/provider-dashboard")}
        >
          Back to Dashboard
        </button>
      </div>

      {msg.text ? (
        <div className={`providerBroadcastMessage ${msg.type}`}>
          {msg.text}
        </div>
      ) : null}

      {providers.length === 0 ? (
        <div className="providerBroadcastEmpty">
          No provider listings found. Please create a listing first before
          sending broadcasts.
        </div>
      ) : (
        <form className="providerBroadcastForm" onSubmit={sendBroadcast}>
          <div className="providerBroadcastGrid">
            <div className="fullSpan">
              <label>Select Listing</label>
              <CustomSelect
                value={form.providerId}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    providerId: e.target.value,
                    itemIndex: "0",
                  }))
                }
                options={makeListingOptions(providers)}
              />
            </div>

            <div>
              <label>Listing Type</label>
              <div className="providerBroadcastStaticField">
                {selectedListingType === "vehicle"
                  ? "Vehicle Service"
                  : "Travel Planner"}
              </div>
            </div>

            <div>
              <label>
                {selectedListingType === "vehicle"
                  ? "Select Vehicle"
                  : "Select Trip"}
              </label>
              <CustomSelect
                value={form.itemIndex}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, itemIndex: e.target.value }))
                }
                options={
                  selectedListingType === "vehicle"
                    ? vehicleOptions
                    : tripOptions
                }
              />
            </div>

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
                placeholder="Add your custom update, note, offer, seasonal message, or special details..."
              />
            </div>
          </div>

          {selectedListingType === "vehicle" && selectedVehicle ? (
            <div className="providerBroadcastPreviewBlock">
              <div className="providerBroadcastBlockHead">
                <h3>Vehicle Preview</h3>
              </div>

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
                  <span>{selectedVehicle.withDriver ? "With Driver" : "Self Drive / No Driver"}</span>
                </div>
                <div className="providerBroadcastInfoWide">
                  <strong>Description</strong>
                  <span>{selectedProvider?.description || "-"}</span>
                </div>
              </div>
            </div>
          ) : null}

          {selectedListingType === "travel_planner" && selectedTrip ? (
            <div className="providerBroadcastPreviewBlock">
              <div className="providerBroadcastBlockHead">
                <h3>Trip Preview</h3>
              </div>

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
          ) : null}

          <div className="providerBroadcastActions">
            <button
              className="providerBroadcastBtn providerBroadcastBtnPrimary"
              type="submit"
              disabled={sendLoading}
            >
              {sendLoading ? "Sending..." : "Send Broadcast"}
            </button>

            <button
              className="providerBroadcastBtn"
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

      <div className="providerBroadcastHistoryBlock">
        <div className="providerBroadcastBlockHead">
          <h3>Broadcast History</h3>
        </div>

        {history.length === 0 ? (
          <div className="providerBroadcastEmpty">
            No old broadcasts found yet.
          </div>
        ) : (
          <div className="providerBroadcastHistoryList">
            {history.map((item) => (
              <article className="providerBroadcastHistoryCard" key={item._id}>
                <div className="providerBroadcastHistoryTop">
                  <div>
                    <h4>{item.subject}</h4>
                    <p>
                      Sent on{" "}
                      {item.createdAt
                        ? new Date(item.createdAt).toLocaleString()
                        : "-"}
                    </p>
                  </div>

                  <div
                    className={`providerBroadcastHistoryStatus ${
                      item.status || ""
                    }`}
                  >
                    {formatLabel(item.status || "-")}
                  </div>
                </div>

                <div className="providerBroadcastHistoryBody">
                  {item.message || "-"}
                </div>

                <div className="providerBroadcastHistoryMeta">
                  <span>Recipients: {item.recipientsCount || 0}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}