import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch, isLoggedIn } from "../lib/api";
import LoadingSpinner from "../components/LoadingSpinner";
import "./SubscriberBroadcasts.css";

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

function normalizeText(value = "") {
  return String(value || "").trim().toLowerCase();
}

function getTravelPlans(provider) {
  if (!provider) return [];

  if (Array.isArray(provider.travelPlans) && provider.travelPlans.length > 0) {
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

function parseBroadcastMessage(message = "") {
  const rawLines = String(message || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const details = {};
  const extraLines = [];
  const descriptionLines = [];

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

    if (line === "-") return;

    const colonIndex = line.indexOf(":");
    const hasLabel = colonIndex > -1;

    if (hasLabel) {
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

function getServiceType(provider, details = {}) {
  const listingType = normalizeText(details.listingType);

  if (listingType.includes("travel")) return "Travel Planner";
  if (listingType.includes("vehicle")) return "Vehicle Service";

  if (provider?.listingType === "travel_planner") return "Travel Planner";
  if (provider?.listingType === "vehicle") return "Vehicle Service";

  if (
    details.packageTitle ||
    details.plannerType ||
    details.duration ||
    details.priceFrom ||
    details.pricePerPerson ||
    details.placesCovered
  ) {
    return "Travel Planner";
  }

  if (
    details.vehicleType ||
    details.title ||
    details.priceUnit ||
    details.fuelType ||
    details.capacity
  ) {
    return "Vehicle Service";
  }

  return "Broadcast";
}

function getProviderImage(provider, parsed = null, previewImage = "") {
  if (previewImage) return previewImage;

  const details = parsed?.details || {};
  const serviceType = getServiceType(provider, details);

  if (!provider) {
    return serviceType === "Travel Planner"
      ? "/images/places/manali-hero.jpg"
      : "/images/places/mumbai-hero.jpg";
  }

  if (serviceType === "Travel Planner") {
    const travelPlans = getTravelPlans(provider);
    const targetPackageTitle = normalizeText(details.packageTitle);
    const targetPlannerType = normalizeText(details.plannerType);
    const targetDuration = normalizeText(details.duration);

    let matchedPlan = null;

    if (targetPackageTitle) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.packageTitle) === targetPackageTitle
      );
    }

    if (!matchedPlan && targetPlannerType) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.plannerMode) === targetPlannerType
      );
    }

    if (!matchedPlan && targetDuration) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.durationText) === targetDuration
      );
    }

    if (
      !matchedPlan &&
      (targetPackageTitle || targetPlannerType || targetDuration)
    ) {
      matchedPlan = travelPlans.find((plan) => {
        const packageTitle = normalizeText(plan.packageTitle);
        const plannerMode = normalizeText(plan.plannerMode);
        const durationText = normalizeText(plan.durationText);

        return (
          (targetPackageTitle && packageTitle.includes(targetPackageTitle)) ||
          (targetPlannerType && plannerMode.includes(targetPlannerType)) ||
          (targetDuration && durationText.includes(targetDuration))
        );
      });
    }

    if (matchedPlan?.images?.[0]?.url) {
      return matchedPlan.images[0].url;
    }

    if (travelPlans[0]?.images?.[0]?.url) {
      return travelPlans[0].images[0].url;
    }

    if (provider.travelPlanner?.images?.[0]?.url) {
      return provider.travelPlanner.images[0].url;
    }
  }

  if (serviceType === "Vehicle Service") {
    const vehicleTitle = normalizeText(details.title);
    const vehicleType = normalizeText(details.vehicleType);

    let matchedVehicle = null;

    if (vehicleTitle || vehicleType) {
      matchedVehicle = (provider.vehicles || []).find((vehicle) => {
        const vTitle = normalizeText(vehicle.title);
        const vType = normalizeText(vehicle.vehicleType);

        return (
          (vehicleTitle && vTitle === vehicleTitle) ||
          (vehicleType && vType === vehicleType)
        );
      });
    }

    if (!matchedVehicle && (vehicleTitle || vehicleType)) {
      matchedVehicle = (provider.vehicles || []).find((vehicle) => {
        const vTitle = normalizeText(vehicle.title);
        const vType = normalizeText(vehicle.vehicleType);

        return (
          (vehicleTitle && vTitle.includes(vehicleTitle)) ||
          (vehicleType && vType.includes(vehicleType))
        );
      });
    }

    if (matchedVehicle?.images?.[0]?.url) {
      return matchedVehicle.images[0].url;
    }

    const firstVehicleWithImage = (provider.vehicles || []).find(
      (vehicle) => vehicle?.images?.[0]?.url
    );

    if (firstVehicleWithImage?.images?.[0]?.url) {
      return firstVehicleWithImage.images[0].url;
    }
  }

  return (
    provider.serviceImage?.url ||
    (serviceType === "Travel Planner"
      ? "/images/places/manali-hero.jpg"
      : "/images/places/mumbai-hero.jpg")
  );
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

export default function SubscriberBroadcasts() {
  const navigate = useNavigate();
  const [broadcasts, setBroadcasts] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }

    async function loadBroadcasts() {
      try {
        setLoading(true);
        setMsg("");

        const data = await apiFetch("/api/provider-broadcasts/all");
        setBroadcasts(data.broadcasts || []);
      } catch (err) {
        setMsg(err.message || "Failed to load provider broadcasts.");
      } finally {
        setLoading(false);
      }
    }

    loadBroadcasts();
  }, [navigate]);

  const normalizedBroadcasts = useMemo(() => {
    return broadcasts.map((item) => {
      const provider = item.provider || null;
      const parsed = parseBroadcastMessage(item.message);
      const serviceType = getServiceType(provider, parsed.details);
      const infoItems = buildInfoItems(provider, parsed.details);
      const image = getProviderImage(provider, parsed, item.previewImage || "");
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
        serviceType,
        infoItems,
        image,
        topClass,
      };
    });
  }, [broadcasts]);

  if (loading) {
    return <LoadingSpinner text="Loading provider broadcasts..." />;
  }

  return (
    <div className="subscriberBroadcastsPage container">
      <div className="subscriberBroadcastsHead">
        <div className="subscriberBroadcastsHeadLeft">
          <h1>Provider Broadcasts</h1>
          <p>View all latest updates, offers, trips, and vehicle broadcasts sent by providers.</p>
        </div>

        <button
          className="subscriberBroadcastsTopBtn"
          type="button"
          onClick={() => navigate("/providers")}
        >
          Back to Providers
        </button>
      </div>

      {msg ? <div className="subscriberBroadcastsMessage">{msg}</div> : null}

      {normalizedBroadcasts.length === 0 ? (
        <div className="subscriberBroadcastsEmpty">No provider broadcasts found yet.</div>
      ) : (
        <div className="subscriberBroadcastsGrid">
          {normalizedBroadcasts.map((item) => {
            const details = item.parsed.details || {};
            const description = item.parsed.description || "";
            const extraMessage = item.parsed.extraMessage || "";

            return (
              <div className="subscriberBroadcastsCard" key={item._id}>
                <div className={`subscriberBroadcastsCardTop ${item.topClass}`}>
                  <div className="subscriberBroadcastsBlueHeader">
                    <div className="subscriberBroadcastsBlueHeaderLeft">
                      <h3>
                        {details.businessName ||
                          item.provider?.businessName ||
                          "Provider Broadcast"}
                      </h3>
                    </div>

                    <div className="subscriberBroadcastsBlueHeaderRight">
                      <div className="subscriberBroadcastsStatusBadge">
                        {formatLabel(item.status || "-")}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="subscriberBroadcastsCardBody">
                  <div className="subscriberBroadcastsTopSection">
                    <div className="subscriberBroadcastsImageWrap">
                      <img
                        src={item.image}
                        alt={details.businessName || "Provider Broadcast"}
                        className="subscriberBroadcastsImage"
                      />
                    </div>

                    <div className="subscriberBroadcastsSummaryCard">
                      <div className="subscriberBroadcastsSummaryStats">
                        <div className="subscriberBroadcastsSummaryRow">
                          <strong>Service Type:</strong>
                          <span>{item.serviceType}</span>
                        </div>

                        <div className="subscriberBroadcastsSummaryRow">
                          <strong>Recipients:</strong>
                          <span>{item.recipientsCount || 0}</span>
                        </div>

                        <div className="subscriberBroadcastsSummaryRow">
                          <strong>Updated:</strong>
                          <span>{formatDateTime(item.updatedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="subscriberBroadcastsInfoGrid">
                    {item.infoItems.map((info, index) => (
                      <div
                        key={`${item._id}-info-${index}`}
                        className="subscriberBroadcastsInfoCard"
                      >
                        <strong>{info.label}</strong>
                        <span>{info.value || "-"}</span>
                      </div>
                    ))}
                  </div>

                  <div className="subscriberBroadcastsMetaSection">
                    <div className="subscriberBroadcastsMetaCard">
                      <strong>Subject</strong>
                      <span>{item.subject || "-"}</span>
                    </div>

                    {description ? (
                      <div className="subscriberBroadcastsMetaCard">
                        <strong>Description</strong>
                        <span>{description}</span>
                      </div>
                    ) : null}
                  </div>

                  {extraMessage ? (
                    <div className="subscriberBroadcastsContentBox subscriberBroadcastsContentBoxMessage">
                      <strong>Extra Message</strong>
                      <p>{extraMessage}</p>
                    </div>
                  ) : null}

                  <div className="subscriberBroadcastsActions">
                    <button
                      className="subscriberBroadcastsBtn primary"
                      type="button"
                      onClick={() => {
                        if (item.provider?._id) {
                          navigate(`/providers/${item.provider._id}`);
                        }
                      }}
                    >
                      View Provider Details
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