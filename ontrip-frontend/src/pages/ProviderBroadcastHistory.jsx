import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./ProviderBroadcastHistory.css";

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function getTravelPlans(provider) {
  if (!provider) return [];

  if (Array.isArray(provider.travelPlans) && provider.travelPlans.length > 0) {
    return provider.travelPlans;
  }

  if (
    provider.travelPlanner &&
    (provider.travelPlanner.packageTitle ||
      provider.travelPlanner.durationText ||
      (provider.travelPlanner.images || []).length > 0)
  ) {
    return [provider.travelPlanner];
  }

  return [];
}

function parseBroadcastMessage(message = "") {
  const rawLines = String(message || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const skipLines = new Set([
    "Provider Update from OnTrip",
    "Vehicle Details",
    "Trip Details",
    "Listing Type: Vehicle Service",
    "Listing Type: Travel Planner",
    "Description",
    "Extra Message",
  ]);

  const details = {};
  const extraLines = [];
  const descriptionLines = [];

  let mode = "";

  rawLines.forEach((line) => {
    if (line === "Description") {
      mode = "description";
      return;
    }

    if (line === "Extra Message") {
      mode = "extra";
      return;
    }

    if (skipLines.has(line) || line === "-") return;

    const colonIndex = line.indexOf(":");
    const hasLabel = colonIndex > -1;

    if (hasLabel) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      const fieldMap = {
        "Business Name": "businessName",
        City: "city",
        State: "state",
        "Vehicle Type": "vehicleType",
        Title: "title",
        Price: "price",
        "Price Unit": "priceUnit",
        Capacity: "capacity",
        "Fuel Type": "fuelType",
        "With Driver": "withDriver",
        "Planner Type": "plannerType",
        "Package Title": "packageTitle",
        Duration: "duration",
        Days: "days",
        "Price From": "priceFrom",
        "Price Per Person": "pricePerPerson",
        "Places Covered": "placesCovered",
        Inclusions: "inclusions",
        Exclusions: "exclusions",
        Message: "message",
      };

      if (fieldMap[key]) {
        details[fieldMap[key]] = value || "-";
        return;
      }
    }

    if (mode === "description") {
      descriptionLines.push(line);
      return;
    }

    if (mode === "extra") {
      extraLines.push(line);
      return;
    }

    extraLines.push(line);
  });

  return {
    details,
    description: descriptionLines.join(" ").trim(),
    extraMessage: extraLines.join(" ").trim(),
  };
}

function getServiceType(provider, details = {}) {
  if (provider?.listingType === "travel_planner") return "Travel Planner";
  if (provider?.listingType === "vehicle") return "Vehicle Service";

  if (details.packageTitle || details.plannerType || details.duration || details.priceFrom) {
    return "Travel Planner";
  }

  if (details.vehicleType || details.title || details.priceUnit || details.fuelType) {
    return "Vehicle Service";
  }

  return "Broadcast";
}

function getProviderImage(provider, parsed = null) {
  if (!provider) return "/images/places/manali-hero.jpg";

  const details = parsed?.details || {};

  if (getServiceType(provider, details) === "Travel Planner") {
    const travelPlans = getTravelPlans(provider);
    const packageTitle = String(details.packageTitle || "").trim().toLowerCase();

    if (packageTitle) {
      const matchedPlan = travelPlans.find(
        (plan) =>
          String(plan.packageTitle || "").trim().toLowerCase() === packageTitle
      );

      if (matchedPlan?.images?.[0]?.url) {
        return matchedPlan.images[0].url;
      }
    }

    if (travelPlans[0]?.images?.[0]?.url) {
      return travelPlans[0].images[0].url;
    }

    if (provider.travelPlanner?.images?.[0]?.url) {
      return provider.travelPlanner.images[0].url;
    }
  }

  if (getServiceType(provider, details) === "Vehicle Service") {
    const vehicleTitle = String(details.title || "").trim().toLowerCase();
    const vehicleType = String(details.vehicleType || "").trim().toLowerCase();

    if (vehicleTitle || vehicleType) {
      const matchedVehicle = (provider.vehicles || []).find((vehicle) => {
        const vTitle = String(vehicle.title || "").trim().toLowerCase();
        const vType = String(vehicle.vehicleType || "").trim().toLowerCase();

        return (vehicleTitle && vTitle === vehicleTitle) || (vehicleType && vType === vehicleType);
      });

      if (matchedVehicle?.images?.[0]?.url) {
        return matchedVehicle.images[0].url;
      }
    }

    const firstVehicleWithImage = (provider.vehicles || []).find(
      (vehicle) => vehicle?.images?.[0]?.url
    );

    if (firstVehicleWithImage?.images?.[0]?.url) {
      return firstVehicleWithImage.images[0].url;
    }
  }

  return provider.serviceImage?.url || "/images/places/manali-hero.jpg";
}

function buildInfoItems(provider, details = {}) {
  const serviceType = getServiceType(provider, details);

  if (serviceType === "Travel Planner") {
    return [
      { label: "Business Name", value: details.businessName || provider?.businessName || "-" },
      { label: "City", value: details.city || provider?.city || "-" },
      { label: "State", value: details.state || provider?.state || "-" },
      { label: "Planner Type", value: details.plannerType || "-" },
      { label: "Package Title", value: details.packageTitle || "-" },
      { label: "Duration", value: details.duration || "-" },
      { label: "Days", value: details.days || "-" },
      { label: "Price From", value: details.priceFrom || "-" },
      { label: "Price Per Person", value: details.pricePerPerson || "-" },
      { label: "Places Covered", value: details.placesCovered || "-" },
      { label: "Inclusions", value: details.inclusions || "-" },
      { label: "Exclusions", value: details.exclusions || "-" },
    ];
  }

  return [
    { label: "Business Name", value: details.businessName || provider?.businessName || "-" },
    { label: "City", value: details.city || provider?.city || "-" },
    { label: "State", value: details.state || provider?.state || "-" },
    { label: "Vehicle Type", value: details.vehicleType || "-" },
    { label: "Title", value: details.title || "-" },
    { label: "Price", value: details.price || "-" },
    { label: "Price Unit", value: details.priceUnit || "-" },
    { label: "Capacity", value: details.capacity || "-" },
    { label: "Fuel Type", value: details.fuelType || "-" },
    { label: "With Driver", value: details.withDriver || "-" },
  ];
}

export default function ProviderBroadcastHistory() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        setLoading(true);
        setMsg("");

        const historyData = await apiFetch("/api/provider-broadcasts/my");
        const list = Array.isArray(historyData)
          ? historyData
          : historyData.broadcasts || [];

        setHistory(list);
      } catch (err) {
        setMsg(err.message || "Failed to load broadcast history.");
      } finally {
        setLoading(false);
      }
    }

    loadHistory();
  }, []);

  const normalizedHistory = useMemo(() => {
    return history.map((item) => {
      const provider = item.provider || null;
      const parsed = parseBroadcastMessage(item.message);
      const image = getProviderImage(provider, parsed);
      const serviceType = getServiceType(provider, parsed.details);
      const infoItems = buildInfoItems(provider, parsed.details);

      const topClass =
        item.status === "failed"
          ? "failed"
          : item.status === "pending"
          ? "pending"
          : "sent";

      return {
        ...item,
        provider,
        parsed,
        image,
        serviceType,
        infoItems,
        topClass,
      };
    });
  }, [history]);

  if (loading) {
    return <LoadingSpinner text="Loading broadcast history..." />;
  }

  return (
    <div className="providerBroadcastHistoryPage container">
      <div className="providerBroadcastHistoryHead">
        <div className="providerBroadcastHistoryHeadLeft">
          <h1>Provider Broadcast History</h1>
          <p>View all sent, pending, and failed broadcasts in one place.</p>
        </div>

        <button
          className="providerBroadcastHistoryTopBtn"
          type="button"
          onClick={() => navigate("/provider-broadcast")}
        >
          Back to Provider Broadcast
        </button>
      </div>

      {msg ? <div className="providerBroadcastHistoryMessage">{msg}</div> : null}

      {normalizedHistory.length === 0 ? (
        <div className="providerBroadcastHistoryEmpty">No broadcast history found yet.</div>
      ) : (
        <div className="providerBroadcastHistoryGrid">
          {normalizedHistory.map((item) => {
            const details = item.parsed.details || {};
            const description = item.parsed.description || "";
            const extraMessage = item.parsed.extraMessage || "";

            return (
              <div className="providerBroadcastHistoryCard" key={item._id}>
                <div className={`providerBroadcastHistoryCardTop ${item.topClass}`}>
                  <div className="providerBroadcastHistoryBlueHeader">
                    <div className="providerBroadcastHistoryBlueHeaderLeft">
                      <h3>
                        {details.businessName || item.provider?.businessName || "Provider Broadcast"}
                      </h3>
                    </div>

                    <div className="providerBroadcastHistoryBlueHeaderRight">
                      <div className="providerBroadcastHistoryStatusBadge">
                        {formatLabel(item.status || "-")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="providerBroadcastHistoryCardBody">
                  <div className="providerBroadcastHistoryTopSection">
                    <div className="providerBroadcastHistoryImageWrap">
                      <img
                        src={item.image}
                        alt={details.businessName || "Provider Broadcast"}
                        className="providerBroadcastHistoryImage"
                      />
                    </div>

                    <div className="providerBroadcastHistorySummaryCard">
                      <div className="providerBroadcastHistorySummaryStats">
                        <div className="providerBroadcastHistorySummaryRow">
                          <strong>Service Type:</strong>
                          <span>{item.serviceType}</span>
                        </div>

                        <div className="providerBroadcastHistorySummaryRow">
                          <strong>Recipients:</strong>
                          <span>{item.recipientsCount || 0}</span>
                        </div>

                        <div className="providerBroadcastHistorySummaryRow">
                          <strong>Updated:</strong>
                          <span>{formatDateTime(item.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="providerBroadcastHistoryInfoGrid">
                    {item.infoItems.map((info, index) => (
                      <div
                        key={`${item._id}-info-${index}`}
                        className="providerBroadcastHistoryInfoCard"
                      >
                        <strong>{info.label}</strong>
                        <span>{info.value || "-"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="providerBroadcastHistoryMetaSection">
                    <div className="providerBroadcastHistoryMetaCard">
                      <strong>Subject</strong>
                      <span>{item.subject || "-"}</span>
                    </div>

                    {description ? (
                      <div className="providerBroadcastHistoryMetaCard">
                        <strong>Description</strong>
                        <span>{description}</span>
                      </div>
                    ) : null}
                  </div>

                  {extraMessage ? (
                    <div className="providerBroadcastHistoryContentBox providerBroadcastHistoryContentBoxMessage">
                      <strong>Extra Message</strong>
                      <p>{extraMessage}</p>
                    </div>
                  ) : null}

                  <div className="providerBroadcastHistoryActions">
                    <button
                      className="providerBroadcastHistoryBtn primary"
                      type="button"
                      onClick={() => navigate("/provider-broadcast")}
                    >
                      Send New Broadcast
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}