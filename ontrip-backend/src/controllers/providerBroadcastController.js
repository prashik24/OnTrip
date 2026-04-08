import Subscriber from "../models/Subscriber.js";
import Provider from "../models/Provider.js";
import ProviderBroadcast from "../models/ProviderBroadcast.js";
import { sendTransactionalEmail } from "../config/mailer.js";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatLabel(value) {
  return String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
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

function getExactBroadcastImage(provider, parsed = null) {
  const details = parsed?.details || {};
  const serviceType = getServiceType(provider, details);

  if (!provider) return "";

  if (serviceType === "Travel Planner") {
    const travelPlans = getTravelPlans(provider);
    const packageTitle = normalizeText(details.packageTitle);
    const plannerType = normalizeText(details.plannerType);
    const duration = normalizeText(details.duration);

    let matchedPlan = null;

    if (packageTitle) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.packageTitle) === packageTitle
      );
    }

    if (!matchedPlan && plannerType) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.plannerMode) === plannerType
      );
    }

    if (!matchedPlan && duration) {
      matchedPlan = travelPlans.find(
        (plan) => normalizeText(plan.durationText) === duration
      );
    }

    if (!matchedPlan && packageTitle) {
      matchedPlan = travelPlans.find((plan) =>
        normalizeText(plan.packageTitle).includes(packageTitle)
      );
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

  return provider.serviceImage?.url || "";
}

function buildInfoItems(provider, details = {}) {
  const serviceType = getServiceType(provider, details);

  if (serviceType === "Travel Planner") {
    return [
      ["Business Name", details.businessName || provider?.businessName || "-"],
      ["City", details.city || provider?.city || "-"],
      ["State", details.state || provider?.state || "-"],
      ["Planner Type", details.plannerType || "-"],
      ["Package Title", details.packageTitle || "-"],
      ["Duration", details.duration || "-"],
      ["Days", details.days || "-"],
      ["Price From", details.priceFrom || "-"],
      ["Price Per Person", details.pricePerPerson || "-"],
      ["Places Covered", details.placesCovered || "-"],
      ["Inclusions", details.inclusions || "-"],
      ["Exclusions", details.exclusions || "-"],
    ];
  }

  return [
    ["Business Name", details.businessName || provider?.businessName || "-"],
    ["City", details.city || provider?.city || "-"],
    ["State", details.state || provider?.state || "-"],
    ["Vehicle Type", details.vehicleType || "-"],
    ["Title", details.title || "-"],
    ["Price", details.price || "-"],
    ["Price Unit", details.priceUnit || "-"],
    ["Capacity", details.capacity || "-"],
    ["Fuel Type", details.fuelType || "-"],
    ["With Driver", details.withDriver || "-"],
  ];
}

function renderSummaryRow(label, value) {
  return `
    <div style="display:grid;grid-template-columns:98px minmax(0,1fr);gap:6px;align-items:start;background:#ffffff;border:1px solid rgba(0,184,241,0.1);border-radius:14px;padding:12px 14px;">
      <div style="color:#334155;font-size:13px;font-weight:800;line-height:1.35;white-space:nowrap;">${escapeHtml(label)}:</div>
      <div style="color:#334155;font-size:13px;font-weight:700;line-height:1.45;word-break:break-word;">${escapeHtml(value)}</div>
    </div>
  `;
}

function renderInfoGrid(items = []) {
  return `
    <div style="margin-top:16px;">
      <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:12px 12px;">
        <tbody>
          ${Array.from({ length: Math.ceil(items.length / 2) })
            .map((_, rowIndex) => {
              const left = items[rowIndex * 2];
              const right = items[rowIndex * 2 + 1];

              return `
                <tr>
                  <td style="width:50%;vertical-align:top;${!left ? "display:none;" : ""}">
                    ${
                      left
                        ? `
                      <div style="background:rgba(244,251,255,0.94);border-radius:14px;padding:14px 15px;border:1px solid rgba(0,184,241,0.1);">
                        <div style="font-size:12px;text-transform:uppercase;color:rgba(15,23,42,0.46);font-weight:700;letter-spacing:0.03em;margin-bottom:4px;">
                          ${escapeHtml(left[0])}
                        </div>
                        <div style="font-size:14px;font-weight:650;color:rgba(15,23,42,0.88);line-height:1.55;word-break:break-word;">
                          ${escapeHtml(left[1])}
                        </div>
                      </div>
                    `
                        : ""
                    }
                  </td>
                  <td style="width:50%;vertical-align:top;${!right ? "display:none;" : ""}">
                    ${
                      right
                        ? `
                      <div style="background:rgba(244,251,255,0.94);border-radius:14px;padding:14px 15px;border:1px solid rgba(0,184,241,0.1);">
                        <div style="font-size:12px;text-transform:uppercase;color:rgba(15,23,42,0.46);font-weight:700;letter-spacing:0.03em;margin-bottom:4px;">
                          ${escapeHtml(right[0])}
                        </div>
                        <div style="font-size:14px;font-weight:650;color:rgba(15,23,42,0.88);line-height:1.55;word-break:break-word;">
                          ${escapeHtml(right[1])}
                        </div>
                      </div>
                    `
                        : ""
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderMetaCard(title, value) {
  if (!value) return "";

  return `
    <div style="margin-top:12px;background:linear-gradient(180deg,rgba(248,252,255,0.96),rgba(241,249,255,0.96));border:1px solid rgba(0,184,241,0.1);border-radius:14px;padding:14px 15px;">
      <div style="color:#0369a1;font-size:13px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;margin-bottom:6px;">
        ${escapeHtml(title)}
      </div>
      <div style="color:rgba(15,23,42,0.86);font-size:14px;line-height:1.7;font-weight:600;word-break:break-word;">
        ${escapeHtml(value)}
      </div>
    </div>
  `;
}

function renderExtraMessageCard(value) {
  if (!value) return "";

  return `
    <div style="margin-top:12px;background:linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,252,255,0.98));border:1px solid rgba(0,184,241,0.1);border-radius:14px;padding:14px 15px;">
      <div style="color:#0369a1;font-size:13px;font-weight:800;letter-spacing:0.02em;text-transform:uppercase;margin-bottom:6px;">
        Extra Message
      </div>
      <div style="color:rgba(15,23,42,0.86);font-size:14px;line-height:1.7;font-weight:600;word-break:break-word;">
        ${escapeHtml(value)}
      </div>
    </div>
  `;
}

function providerBroadcastEmailHtml({
  subject,
  message,
  provider,
  imageUrl = "",
  recipientsCount = 0,
  updatedAt = null,
  status = "sent",
}) {
  const parsed = parseBroadcastMessage(message);
  const details = parsed.details || {};
  const serviceType = getServiceType(provider, details);
  const infoItems = buildInfoItems(provider, details);
  const displayName =
    details.businessName || provider?.businessName || "OnTrip Provider";
  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleString()
    : new Date().toLocaleString();

  return `
    <div style="margin:0;padding:20px;background:#f4fbff;font-family:Arial,Helvetica,sans-serif;color:#0b1b2a;">
      <div style="max-width:760px;margin:0 auto;background:rgba(255,255,255,0.97);border:1px solid rgba(0,184,241,0.12);border-radius:18px;box-shadow:0 8px 22px rgba(10,22,35,0.05);overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4ec9f5,#00b8f1);padding:18px;display:flex;justify-content:space-between;align-items:center;gap:14px;">
          <div style="min-width:0;">
            <div style="margin:0;font-size:21px;font-weight:760;line-height:1.25;color:#ffffff;word-break:break-word;">
              ${escapeHtml(displayName)}
            </div>
          </div>
          <div style="padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.16);color:#ffffff;font-size:12px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;white-space:nowrap;">
            ${escapeHtml(formatLabel(status))}
          </div>
        </div>

        <div style="padding:18px;">
          <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="width:235px;vertical-align:top;padding:0 16px 0 0;">
                <div style="border-radius:14px;overflow:hidden;background:rgba(177,227,250,0.14);height:150px;min-height:150px;border:1px solid rgba(0,184,241,0.1);">
                  ${
                    imageUrl
                      ? `<img src="${escapeHtml(
                          imageUrl
                        )}" alt="${escapeHtml(
                          displayName
                        )}" style="width:100%;height:150px;display:block;object-fit:cover;" />`
                      : ""
                  }
                </div>
              </td>
              <td style="vertical-align:top;padding:0;">
                <div style="background:rgba(244,251,255,0.94);border-radius:18px;padding:14px;border:1px solid rgba(0,184,241,0.1);">
                  <div style="display:grid;grid-template-columns:1fr;gap:8px;">
                    ${renderSummaryRow("Service Type", serviceType)}
                    ${renderSummaryRow(
                      "Recipients",
                      String(recipientsCount || 0)
                    )}
                    ${renderSummaryRow("Updated", updatedLabel)}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          ${renderInfoGrid(infoItems)}
          ${renderMetaCard("Subject", subject)}
          ${parsed.description ? renderMetaCard("Description", parsed.description) : ""}
          ${renderExtraMessageCard(parsed.extraMessage)}

          <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(11,27,42,0.08);text-align:center;font-size:13px;line-height:1.7;color:#8a94a6;">
            © 2025 <strong style="color:#0b1b2a;">OnTrip</strong>. All rights reserved.
          </div>
        </div>
      </div>
    </div>
  `;
}

export async function sendProviderBroadcast(req, res) {
  try {
    const userId = req.user?._id;
    const { subject, message, previewImage } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        message: "Subject and message are required",
      });
    }

    const provider = await Provider.findOne({ owner: userId });

    if (!provider) {
      return res.status(403).json({
        message: "Only providers can send broadcasts",
      });
    }

    const subscribers = await Subscriber.find({ isSubscribed: true });

    const emails = subscribers
      .map((subscriber) => String(subscriber.email || "").trim())
      .filter(Boolean);

    if (emails.length === 0) {
      return res.status(400).json({
        message: "No subscribers found",
      });
    }

    const cleanSubject = String(subject).trim();
    const cleanMessage = String(message).trim();
    const cleanPreviewImage = String(previewImage || "").trim();

    const parsed = parseBroadcastMessage(cleanMessage);
    const exactImageUrl =
      cleanPreviewImage || getExactBroadcastImage(provider, parsed);

    const broadcast = await ProviderBroadcast.create({
      provider: provider._id,
      subject: cleanSubject,
      message: cleanMessage,
      recipientsCount: emails.length,
      status: "pending",
      previewImage: exactImageUrl,
    });

    await sendTransactionalEmail({
      to: emails.map((email) => ({ email })),
      subject: cleanSubject,
      htmlContent: providerBroadcastEmailHtml({
        subject: cleanSubject,
        message: cleanMessage,
        provider,
        imageUrl: exactImageUrl,
        recipientsCount: emails.length,
        updatedAt: broadcast.updatedAt || new Date(),
        status: "sent",
      }),
    });

    broadcast.status = "sent";
    await broadcast.save();

    return res.json({
      message: "Broadcast sent successfully",
      count: emails.length,
    });
  } catch (error) {
    console.error("broadcast error:", error);

    return res.status(500).json({
      message: "Failed to send broadcast",
    });
  }
}

export async function getProviderBroadcasts(req, res) {
  try {
    const provider = await Provider.findOne({
      owner: req.user._id,
    });

    if (!provider) {
      return res.status(404).json({
        message: "Provider not found",
      });
    }

    const broadcasts = await ProviderBroadcast.find({
      provider: provider._id,
    })
      .populate("provider")
      .sort({ createdAt: -1 });

    return res.json(broadcasts);
  } catch (error) {
    console.error("get broadcasts error:", error);
    return res.status(500).json({
      message: "Failed to fetch broadcasts",
    });
  }
}