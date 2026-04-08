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

function normalizeEmail(value = "") {
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

function renderInfoCard(label, value) {
  return `
    <div style="background:#f8fcff;border:1px solid rgba(0,184,241,0.12);border-radius:16px;padding:14px 15px;">
      <div style="font-size:12px;line-height:1.3;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:rgba(15,23,42,0.44);margin-bottom:6px;">
        ${escapeHtml(label)}
      </div>
      <div style="font-size:15px;line-height:1.55;font-weight:700;color:#1e293b;word-break:break-word;">
        ${escapeHtml(value || "-")}
      </div>
    </div>
  `;
}

function renderInfoGrid(items = []) {
  const rows = [];

  for (let i = 0; i < items.length; i += 2) {
    const left = items[i];
    const right = items[i + 1];

    rows.push(`
      <tr>
        <td style="width:50%;padding:0 8px 16px 0;vertical-align:top;">
          ${left ? renderInfoCard(left[0], left[1]) : ""}
        </td>
        <td style="width:50%;padding:0 0 16px 8px;vertical-align:top;">
          ${right ? renderInfoCard(right[0], right[1]) : ""}
        </td>
      </tr>
    `);
  }

  return `
    <table role="presentation" width="100%" style="width:100%;border-collapse:collapse;">
      <tbody>
        ${rows.join("")}
      </tbody>
    </table>
  `;
}

function renderMetaCard(title, value) {
  if (!value) return "";

  return `
    <div style="margin-top:16px;background:#f8fcff;border:1px solid rgba(0,184,241,0.12);border-radius:16px;padding:16px 18px;">
      <div style="font-size:12px;line-height:1.3;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#0284c7;margin-bottom:8px;">
        ${escapeHtml(title)}
      </div>
      <div style="font-size:15px;line-height:1.75;font-weight:600;color:#334155;word-break:break-word;">
        ${escapeHtml(value)}
      </div>
    </div>
  `;
}

function renderSummaryBox(label, value) {
  return `
    <div style="background:#f8fcff;border:1px solid rgba(0,184,241,0.12);border-radius:16px;padding:14px 16px;margin-bottom:12px;">
      <div style="font-size:12px;line-height:1.3;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:rgba(15,23,42,0.44);margin-bottom:6px;">
        ${escapeHtml(label)}
      </div>
      <div style="font-size:15px;line-height:1.55;font-weight:700;color:#1e293b;word-break:break-word;">
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
    <div style="margin:0;padding:24px 12px;background:#eef7f1;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid rgba(0,184,241,0.12);border-radius:24px;overflow:hidden;box-shadow:0 10px 28px rgba(15,23,42,0.08);">
        <div style="background:linear-gradient(135deg,#4ec9f5,#00b8f1);padding:20px 22px;">
          <table role="presentation" width="100%" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="vertical-align:middle;padding:0;">
                <div style="font-size:16px;line-height:1.2;font-weight:800;color:#ffffff;word-break:break-word;">
                  ${escapeHtml(displayName)}
                </div>
              </td>
              <td style="vertical-align:middle;padding:0;text-align:right;width:120px;">
                <span style="display:inline-block;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,0.18);font-size:12px;line-height:1;font-weight:800;letter-spacing:0.05em;text-transform:uppercase;color:#ffffff;">
                  ${escapeHtml(formatLabel(status))}
                </span>
              </td>
            </tr>
          </table>
        </div>

        <div style="padding:22px;">
          <div style="border:1px solid rgba(0,184,241,0.12);border-radius:20px;padding:18px;background:#fcfeff;">
            <div style="border-radius:18px;overflow:hidden;background:#f3f9fc;border:1px solid rgba(0,184,241,0.1);">
              ${
                imageUrl
                  ? `<img src="${escapeHtml(
                      imageUrl
                    )}" alt="${escapeHtml(
                      displayName
                    )}" style="width:100%;max-width:100%;height:220px;display:block;object-fit:cover;" />`
                  : `<div style="height:220px;background:#eaf7fd;"></div>`
              }
            </div>

            <div style="margin-top:18px;">
              ${renderSummaryBox("Service Type", serviceType)}
              ${renderSummaryBox("Recipients", String(recipientsCount || 0))}
              ${renderSummaryBox("Updated", updatedLabel)}
            </div>
          </div>

          <div style="margin-top:18px;">
            ${renderInfoGrid(infoItems)}
          </div>

          ${renderMetaCard("Subject", subject)}
          ${parsed.description ? renderMetaCard("Description", parsed.description) : ""}
          ${parsed.extraMessage ? renderMetaCard("Extra Message", parsed.extraMessage) : ""}

          <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(15,23,42,0.08);text-align:center;font-size:13px;line-height:1.7;color:#64748b;">
            © 2025 <strong style="color:#0f172a;">OnTrip</strong>. All rights reserved.
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

export async function getAllProviderBroadcasts(req, res) {
  try {
    const userId = String(req.user?._id || "");
    const userEmail = normalizeEmail(req.user?.email);

    if (!userId || !userEmail) {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }

    const subscriber = await Subscriber.findOne({
      email: userEmail,
      isSubscribed: true,
    });

    if (!subscriber) {
      return res.status(403).json({
        message: "Only subscribed users can view provider broadcasts.",
      });
    }

    const broadcasts = await ProviderBroadcast.find({
      status: "sent",
    })
      .populate({
        path: "provider",
        populate: {
          path: "owner",
          select: "name email avatar city role",
        },
      })
      .sort({ createdAt: -1 });

    const filteredBroadcasts = broadcasts.filter((item) => {
      const ownerId =
        item?.provider?.owner?._id ||
        item?.provider?.owner?.id ||
        item?.provider?.owner;

      return String(ownerId || "") !== userId;
    });

    return res.json({
      broadcasts: filteredBroadcasts,
    });
  } catch (error) {
    console.error("getAllProviderBroadcasts error:", error);
    return res.status(500).json({
      message: "Failed to fetch provider broadcasts",
    });
  }
}