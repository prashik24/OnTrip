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
    (
      provider.travelPlanner.packageTitle ||
      provider.travelPlanner.durationText ||
      (provider.travelPlanner.images || []).length > 0
    )
  ) {
    return [provider.travelPlanner];
  }

  return [];
}

function getProviderImage(provider) {
  if (!provider) return "/images/places/manali-hero.jpg";

  if (provider.listingType === "travel_planner") {
    const travelPlans = getTravelPlans(provider);

    if (travelPlans[0]?.images?.[0]?.url) {
      return travelPlans[0].images[0].url;
    }
  }

  if (provider.listingType === "vehicle") {
    const firstVehicleWithImage = (provider.vehicles || []).find(
      (vehicle) => vehicle?.images?.[0]?.url
    );

    if (firstVehicleWithImage?.images?.[0]?.url) {
      return firstVehicleWithImage.images[0].url;
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
      const image = getProviderImage(provider);
      const parsed = parseBroadcastMessage(item.message);

      const topClass =
        item.status === "failed"
          ? "failed"
          : item.status === "pending"
          ? "pending"
          : "sent";

      const isTravel =
        provider?.listingType === "travel_planner" ||
        parsed.details.listingType === "Travel Planner";

      const infoItems = isTravel
        ? [
            { label: "Business Name", value: parsed.details.businessName || provider?.businessName || "-" },
            { label: "City", value: parsed.details.city || provider?.city || "-" },
            { label: "State", value: parsed.details.state || provider?.state || "-" },
            { label: "Planner Type", value: parsed.details.plannerType || "-" },
            { label: "Package Title", value: parsed.details.packageTitle || "-" },
            { label: "Duration", value: parsed.details.duration || "-" },
            { label: "Days", value: parsed.details.days || "-" },
            { label: "Price From", value: parsed.details.priceFrom || "-" },
            { label: "Price Per Person", value: parsed.details.pricePerPerson || "-" },
            { label: "Places Covered", value: parsed.details.placesCovered || "-" },
            { label: "Inclusions", value: parsed.details.inclusions || "-" },
            { label: "Exclusions", value: parsed.details.exclusions || "-" },
          ]
        : [
            { label: "Business Name", value: parsed.details.businessName || provider?.businessName || "-" },
            { label: "City", value: parsed.details.city || provider?.city || "-" },
            { label: "State", value: parsed.details.state || provider?.state || "-" },
            { label: "Vehicle Type", value: parsed.details.vehicleType || "-" },
            { label: "Title", value: parsed.details.title || "-" },
            { label: "Price", value: parsed.details.price || "-" },
            { label: "Price Unit", value: parsed.details.priceUnit || "-" },
            { label: "Capacity", value: parsed.details.capacity || "-" },
            { label: "Fuel Type", value: parsed.details.fuelType || "-" },
            { label: "With Driver", value: parsed.details.withDriver || "-" },
          ];

      return {
        ...item,
        provider,
        image,
        parsed,
        topClass,
        isTravel,
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
                <div className="providerBroadcastHistoryCardTopLeft">
                  <h3>{item.subject || "Broadcast"}</h3>
                  <p>
                    {item.isTravel ? "Travel Planner" : "Vehicle Service"}
                  </p>
                </div>

                <div className="providerBroadcastHistoryTopMeta">
                  <div className="providerBroadcastHistoryTopMetaBox">
                    Subject: {item.subject || "-"}
                  </div>
                  <div className="providerBroadcastHistoryTopMetaBox">
                    Recipients: {item.recipientsCount || 0}
                  </div>
                  <div className="providerBroadcastHistoryTopMetaBox">
                    Updated: {formatDateTime(item.updatedAt)}
                  </div>
                </div>
              </div>

              <div className="providerBroadcastHistoryCardBody">
                <div className="providerBroadcastHistoryHero">
                  <div className="providerBroadcastHistoryImageWrap">
                    <img
                      src={item.image}
                      alt={item.subject || "Broadcast"}
                      className="providerBroadcastHistoryImage"
                    />
                  </div>

                  <div className="providerBroadcastHistorySummary">
                    <div className="providerBroadcastHistorySummaryTop">
                      <h4>
                        {item.parsed.details.title ||
                          item.parsed.details.packageTitle ||
                          item.provider?.businessName ||
                          "Service"}
                      </h4>

                      <span className="providerBroadcastHistoryServiceTag">
                        {item.isTravel ? "Travel Planner" : "Vehicle Service"}
                      </span>
                    </div>

                    <p>{item.provider?.description || item.parsed.description || "Provider update from OnTrip."}</p>

                    <div className="providerBroadcastHistoryStatusRow">
                      <div className="providerBroadcastHistoryStatusCard">
                        <strong>Status</strong>
                        <span>{formatLabel(item.status || "-")}</span>
                      </div>

                      <div className="providerBroadcastHistoryStatusCard">
                        <strong>Created</strong>
                        <span>{formatDateTime(item.createdAt)}</span>
                      </div>

                      <div className="providerBroadcastHistoryStatusCard">
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

                {item.parsed.extraMessage ? (
                  <div className="providerBroadcastHistoryNoteCard">
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