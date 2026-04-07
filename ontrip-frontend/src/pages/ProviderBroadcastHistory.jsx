import { useEffect, useState } from "react";
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
    if (provider.vehicles?.[0]?.images?.[0]?.url) {
      return provider.vehicles[0].images[0].url;
    }
  }

  return provider.serviceImage?.url || "/images/places/manali-hero.jpg";
}

function cleanBroadcastMessage(message = "") {
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

  const output = [];

  rawLines.forEach((line) => {
    if (skipLines.has(line)) return;

    if (line.startsWith("Business Name:")) {
      output.push(`Business Name: ${line.replace("Business Name:", "").trim()}`);
      return;
    }

    if (line.startsWith("City:")) {
      output.push(`City: ${line.replace("City:", "").trim()}`);
      return;
    }

    if (line.startsWith("State:")) {
      output.push(`State: ${line.replace("State:", "").trim()}`);
      return;
    }

    if (line.startsWith("Listing Type:")) {
      return;
    }

    if (line.startsWith("Vehicle Type:")) {
      output.push(`Vehicle Type: ${line.replace("Vehicle Type:", "").trim()}`);
      return;
    }

    if (line.startsWith("Title:")) {
      output.push(`Title: ${line.replace("Title:", "").trim()}`);
      return;
    }

    if (line.startsWith("Price:")) {
      output.push(`Price: ${line.replace("Price:", "").trim()}`);
      return;
    }

    if (line.startsWith("Price Unit:")) {
      output.push(`Price Unit: ${line.replace("Price Unit:", "").trim()}`);
      return;
    }

    if (line.startsWith("Capacity:")) {
      output.push(`Capacity: ${line.replace("Capacity:", "").trim()}`);
      return;
    }

    if (line.startsWith("Fuel Type:")) {
      output.push(`Fuel Type: ${line.replace("Fuel Type:", "").trim()}`);
      return;
    }

    if (line.startsWith("With Driver:")) {
      output.push(`With Driver: ${line.replace("With Driver:", "").trim()}`);
      return;
    }

    if (line.startsWith("Planner Type:")) {
      output.push(`Planner Type: ${line.replace("Planner Type:", "").trim()}`);
      return;
    }

    if (line.startsWith("Package Title:")) {
      output.push(`Package Title: ${line.replace("Package Title:", "").trim()}`);
      return;
    }

    if (line.startsWith("Duration:")) {
      output.push(`Duration: ${line.replace("Duration:", "").trim()}`);
      return;
    }

    if (line.startsWith("Days:")) {
      output.push(`Days: ${line.replace("Days:", "").trim()}`);
      return;
    }

    if (line.startsWith("Price From:")) {
      output.push(`Price From: ${line.replace("Price From:", "").trim()}`);
      return;
    }

    if (line.startsWith("Price Per Person:")) {
      output.push(`Price Per Person: ${line.replace("Price Per Person:", "").trim()}`);
      return;
    }

    if (line.startsWith("Places Covered:")) {
      output.push(`Places Covered: ${line.replace("Places Covered:", "").trim()}`);
      return;
    }

    if (line.startsWith("Inclusions:")) {
      output.push(`Inclusions: ${line.replace("Inclusions:", "").trim()}`);
      return;
    }

    if (line.startsWith("Exclusions:")) {
      output.push(`Exclusions: ${line.replace("Exclusions:", "").trim()}`);
      return;
    }

    if (line.toLowerCase().startsWith("how ")) {
      output.push(`Message: ${line}`);
      return;
    }

    if (line.toLowerCase().includes("extra message")) {
      return;
    }

    if (line.toLowerCase().includes("description")) {
      return;
    }

    output.push(line);
  });

  return output;
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

      {history.length === 0 ? (
        <div className="providerBroadcastHistoryEmpty">No broadcast history found yet.</div>
      ) : (
        <div className="providerBroadcastHistoryGrid">
          {history.map((item) => {
            const image = getProviderImage(item.provider);
            const topClass =
              item.status === "failed"
                ? "failed"
                : item.status === "pending"
                ? "pending"
                : "sent";

            const cleanedLines = cleanBroadcastMessage(item.message);

            return (
              <div className="providerBroadcastHistoryCard" key={item._id}>
                <div className={`providerBroadcastHistoryCardTop ${topClass}`}>
                  <div className="providerBroadcastHistoryCardTopLeft">
                    <h3>{item.subject || "Broadcast"}</h3>
                    <p>Created: {formatDateTime(item.createdAt)}</p>
                  </div>
                </div>

                <div className="providerBroadcastHistoryCardBody">
                  <div className="providerBroadcastHistoryPreview">
                    <div className="providerBroadcastHistoryImageWrap">
                      <img
                        src={image}
                        alt={item.subject || "Broadcast"}
                        className="providerBroadcastHistoryImage"
                      />
                    </div>

                    <div className="providerBroadcastHistoryPreviewMeta">
                      <span>Status: {formatLabel(item.status || "-")}</span>
                      <span>Recipients: {item.recipientsCount || 0}</span>
                      <span>Updated: {formatDateTime(item.updatedAt)}</span>
                    </div>
                  </div>

                  <div className="providerBroadcastHistoryInfo">
                    <div>
                      <strong>Subject</strong>
                      <span>{item.subject || "-"}</span>
                    </div>

                    <div>
                      <strong>Status</strong>
                      <span>{formatLabel(item.status || "-")}</span>
                    </div>

                    <div>
                      <strong>Recipients</strong>
                      <span>{item.recipientsCount || 0}</span>
                    </div>

                    <div>
                      <strong>Created At</strong>
                      <span>{formatDateTime(item.createdAt)}</span>
                    </div>

                    <div className="providerBroadcastHistoryInfoWide">
                      <strong>Broadcast Message</strong>
                      <span className="providerBroadcastHistoryMessageLines">
                        {cleanedLines.map((line, index) => (
                          <span key={index}>{line}</span>
                        ))}
                      </span>
                    </div>
                  </div>

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