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

  const details = {};
  const descriptionLines = [];
  const extraLines = [];

  let mode = "";

  rawLines.forEach((line) => {
    if (line === "Provider Update from OnTrip") return;
    if (line === "Vehicle Details" || line === "Trip Details") return;

    if (line === "Description") {
      mode = "description";
      return;
    }

    if (line === "Extra Message") {
      mode = "extra";
      return;
    }

    if (line === "-" || !line) return;

    const colonIndex = line.indexOf(":");

    if (colonIndex > -1) {
      const key = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      const fieldMap = {
        "Business Name": "businessName",
        City: "city",
        State: "state",
        "Listing Type": "listingType",
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
      const details = parsed.details || {};
      const image = getProviderImage(provider);

      const topClass =
        item.status === "failed"
          ? "failed"
          : item.status === "pending"
          ? "pending"
          : "sent";

      const isVehicle =
        provider?.listingType === "vehicle" ||
        details.listingType === "Vehicle Service" ||
        !!details.vehicleType;

      const headingTitle = isVehicle
        ? details.title || item.subject || "Vehicle Service"
        : details.packageTitle || item.subject || "Travel Planner";

      const subtitle = details.businessName || provider?.businessName || "-";

      const infoItems = isVehicle
        ? [
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
          ]
        : [
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

      return {
        ...item,
        provider,
        parsed,
        image,
        topClass,
        headingTitle,
        subtitle,
        isVehicle,
        infoItems,
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
          {normalizedHistory.map((item) => (
            <div className="providerBroadcastHistoryCard" key={item._id}>
              <div className={`providerBroadcastHistoryCardTop ${item.topClass}`}>
                <div className="providerBroadcastHistoryHeroLeft">
                  <h3>{item.subject || "Broadcast"}</h3>
                  <p>
                    {item.isVehicle ? "Vehicle Service" : "Travel Planner"} update shared with
                    subscribers.
                  </p>
                </div>
              </div>

              <div className="providerBroadcastHistoryCardBody">
                <div className="providerBroadcastHistoryTopSection">
                  <div className="providerBroadcastHistoryImageWrap">
                    <img
                      src={item.image}
                      alt={item.headingTitle}
                      className="providerBroadcastHistoryImage"
                    />
                  </div>

                  <div className="providerBroadcastHistorySummaryCard">
                    <div className="providerBroadcastHistorySummaryTop">
                      <h4>{item.headingTitle}</h4>
                      <span className="providerBroadcastHistoryServiceBadge">
                        {item.isVehicle ? "Vehicle Service" : "Travel Planner"}
                      </span>
                    </div>

                    <div className="providerBroadcastHistorySummarySub">
                      {item.subtitle}
                    </div>

                    <div className="providerBroadcastHistorySummaryMeta">
                      <div>
                        <strong>Status</strong>
                        <span>{formatLabel(item.status || "-")}</span>
                      </div>
                      <div>
                        <strong>Created</strong>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>
                      <div>
                        <strong>Recipients</strong>
                        <span>{item.recipientsCount || 0}</span>
                      </div>
                      <div>
                        <strong>Updated</strong>
                        <span>{formatDateTime(item.updatedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="providerBroadcastHistoryInfo">
                  {item.infoItems.map((info, index) => (
                    <div key={`${item._id}-${index}`}>
                      <strong>{info.label}</strong>
                      <span>{info.value || "-"}</span>
                    </div>
                  ))}
                </div>

                {item.parsed.description ? (
                  <div className="providerBroadcastHistoryContentBox">
                    <strong>Description</strong>
                    <p>{item.parsed.description}</p>
                  </div>
                ) : null}

                {item.parsed.extraMessage ? (
                  <div className="providerBroadcastHistoryContentBox providerBroadcastHistoryContentBoxMessage">
                    <strong>Extra Message</strong>
                    <p>{item.parsed.extraMessage}</p>
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
          ))}
        </div>
      )}
    </div>
  );
}