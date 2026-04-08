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

function getProviderImage(provider) {
  if (!provider) return "/images/places/manali-hero.jpg";

  if (provider.listingType === "travel_planner") {
    if (Array.isArray(provider.travelPlans) && provider.travelPlans.length > 0) {
      if (provider.travelPlans[0]?.images?.[0]?.url) {
        return provider.travelPlans[0].images[0].url;
      }
    }

    if (provider.travelPlanner?.images?.[0]?.url) {
      return provider.travelPlanner.images[0].url;
    }
  }

  if (provider.listingType === "vehicle") {
    if (Array.isArray(provider.vehicles) && provider.vehicles.length > 0) {
      const firstVehicleWithImage = provider.vehicles.find(
        (vehicle) => vehicle?.images?.[0]?.url
      );
      if (firstVehicleWithImage?.images?.[0]?.url) {
        return firstVehicleWithImage.images[0].url;
      }
    }
  }

  return provider.serviceImage?.url || "/images/places/manali-hero.jpg";
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

function buildPrimaryMeta(item, provider) {
  const parsed = parseBroadcastMessage(item.message);
  const details = parsed.details || {};

  const isVehicle = provider?.listingType === "vehicle" || details.vehicleType || details.title;
  const isTrip =
    provider?.listingType === "travel_planner" || details.packageTitle || details.plannerType;

  const type = isVehicle ? "Vehicle Service" : isTrip ? "Travel Planner" : "Broadcast";

  return {
    type,
    parsed,
  };
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
      const image = getProviderImage(provider);
      const topClass =
        item.status === "failed"
          ? "failed"
          : item.status === "pending"
          ? "pending"
          : "sent";

      const meta = buildPrimaryMeta(item, provider);

      return {
        ...item,
        provider,
        image,
        topClass,
        meta,
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
            const details = item.meta.parsed.details || {};
            const description = item.meta.parsed.description || "";
            const extraMessage = item.meta.parsed.extraMessage || "";

            const infoItems =
              item.provider?.listingType === "travel_planner"
                ? [
                    { label: "Business Name", value: details.businessName || item.provider?.businessName || "-" },
                    { label: "City", value: details.city || item.provider?.city || "-" },
                    { label: "State", value: details.state || item.provider?.state || "-" },
                    { label: "Planner Type", value: details.plannerType || "-" },
                    { label: "Package Title", value: details.packageTitle || "-" },
                    { label: "Duration", value: details.duration || "-" },
                    { label: "Days", value: details.days || "-" },
                    { label: "Price From", value: details.priceFrom || "-" },
                    { label: "Price Per Person", value: details.pricePerPerson || "-" },
                    { label: "Places Covered", value: details.placesCovered || "-" },
                    { label: "Inclusions", value: details.inclusions || "-" },
                    { label: "Exclusions", value: details.exclusions || "-" },
                  ]
                : [
                    { label: "Business Name", value: details.businessName || item.provider?.businessName || "-" },
                    { label: "City", value: details.city || item.provider?.city || "-" },
                    { label: "State", value: details.state || item.provider?.state || "-" },
                    { label: "Vehicle Type", value: details.vehicleType || "-" },
                    { label: "Title", value: details.title || "-" },
                    { label: "Price", value: details.price || "-" },
                    { label: "Price Unit", value: details.priceUnit || "-" },
                    { label: "Capacity", value: details.capacity || "-" },
                    { label: "Fuel Type", value: details.fuelType || "-" },
                    { label: "With Driver", value: details.withDriver || "-" },
                  ];

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
                        <div className="providerBroadcastHistorySummaryStat">
                          <strong>Subject</strong>
                          <span>{item.subject || "-"}</span>
                        </div>

                        <div className="providerBroadcastHistorySummaryStat">
                          <strong>Service Type</strong>
                          <span>{item.meta.type}</span>
                        </div>

                        <div className="providerBroadcastHistorySummaryStat">
                          <strong>Recipients</strong>
                          <span>{item.recipientsCount || 0}</span>
                          <small>Updated: {formatDateTime(item.updatedAt)}</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="providerBroadcastHistoryInfoGrid">
                    {infoItems.map((info, index) => (
                      <div
                        key={`${item._id}-info-${index}`}
                        className="providerBroadcastHistoryInfoCard"
                      >
                        <strong>{info.label}</strong>
                        <span>{info.value || "-"}</span>
                      </div>
                    ))}
                  </div>

                  {description ? (
                    <div className="providerBroadcastHistoryContentBox">
                      <strong>Description</strong>
                      <p>{description}</p>
                    </div>
                  ) : null}

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