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

function getProviderCardImage(provider) {
  if (!provider) return "";

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

  return provider.serviceImage?.url || "";
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

  const details = [];
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
      const label = line.slice(0, colonIndex).trim();
      const value = line.slice(colonIndex + 1).trim();

      if (label === "Listing Type") {
        details.push({
          label,
          value,
          fullWidth: true,
        });
        return;
      }

      const knownLabels = new Set([
        "Business Name",
        "City",
        "State",
        "Vehicle Type",
        "Title",
        "Price",
        "Price Unit",
        "Capacity",
        "Fuel Type",
        "With Driver",
        "Planner Type",
        "Package Title",
        "Duration",
        "Days",
        "Price From",
        "Price Per Person",
        "Places Covered",
        "Inclusions",
        "Exclusions",
        "Message",
      ]);

      if (knownLabels.has(label)) {
        details.push({
          label,
          value: value || "-",
          fullWidth: [
            "Places Covered",
            "Inclusions",
            "Exclusions",
            "Message",
          ].includes(label),
        });
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

function buildDetailsGrid(details = []) {
  if (!details.length) return "";

  return `
    <div style="margin-top:18px;">
      <div style="font-size:15px;font-weight:800;line-height:1.4;color:#0b1b2a;margin-bottom:12px;">
        Broadcast Details
      </div>
      <table style="width:100%;border-collapse:separate;border-spacing:10px 10px;">
        <tbody>
          ${details
            .map((item) => {
              const cellContent = `
                <div style="padding:14px 15px;border-radius:14px;background:#f8fbff;border:1px solid rgba(0,184,241,0.12);">
                  <div style="font-size:12px;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;color:#7b8794;margin-bottom:6px;">
                    ${escapeHtml(item.label)}
                  </div>
                  <div style="font-size:14px;font-weight:700;line-height:1.65;color:#0b1b2a;">
                    ${escapeHtml(item.value || "-")}
                  </div>
                </div>
              `;

              if (item.fullWidth) {
                return `
                  <tr>
                    <td colspan="2" style="padding:0;">
                      ${cellContent}
                    </td>
                  </tr>
                `;
              }

              return `
                <tr>
                  <td colspan="2" style="padding:0;">
                    ${cellContent}
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

function buildContentCard(title, content, background = "#ffffff", border = "rgba(0,184,241,0.12)") {
  if (!content) return "";

  return `
    <div style="margin-top:16px;padding:16px;border-radius:14px;background:${background};border:1px solid ${border};">
      <div style="font-size:14px;font-weight:800;color:#0b1b2a;margin-bottom:6px;">
        ${escapeHtml(title)}
      </div>
      <div style="font-size:14px;line-height:1.75;color:#5b6570;">
        ${escapeHtml(content)}
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
}) {
  const parsed = parseBroadcastMessage(message);
  const displayName = provider?.businessName || "OnTrip Provider";
  const serviceType = formatLabel(provider?.listingType || "broadcast");

  return `
    <div style="margin:0;padding:20px;background:#f4fbff;font-family:Arial,Helvetica,sans-serif;color:#0b1b2a;">
      <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid rgba(0,184,241,0.14);border-radius:18px;overflow:hidden;">
        <div style="background:linear-gradient(135deg,#4ec9f5,#00b8f1);padding:22px 22px 18px;color:#ffffff;">
          <div style="font-size:26px;font-weight:800;line-height:1.1;">OnTrip</div>
          <div style="font-size:18px;font-weight:800;line-height:1.35;margin-top:14px;">
            ${escapeHtml(subject)}
          </div>
          <div style="font-size:14px;line-height:1.55;opacity:0.96;margin-top:6px;">
            New update from ${escapeHtml(displayName)} for OnTrip subscribers.
          </div>
        </div>

        ${
          imageUrl
            ? `<img src="${escapeHtml(imageUrl)}" alt="Provider Service" style="display:block;width:100%;height:240px;object-fit:cover;margin:0;padding:0;border:0;" />`
            : ""
        }

        <div style="padding:20px 22px 22px;">
          <div style="font-size:15px;line-height:1.7;color:#4b5563;">
            Hello, ${escapeHtml(displayName)} has shared a new update with you on
            <strong style="color:#0b1b2a;">OnTrip</strong>.
          </div>

          <div style="margin-top:16px;">
            <span style="display:inline-block;padding:10px 18px;border-radius:999px;border:1px solid rgba(11,27,42,0.18);font-size:14px;font-weight:800;letter-spacing:0.02em;color:#0b1b2a;background:#ffffff;">
              ${escapeHtml(serviceType)}
            </span>
          </div>

          <div style="margin-top:18px;padding:18px;border:1px solid rgba(0,184,241,0.12);background:#f8fbff;border-radius:16px;">
            <div style="font-size:16px;font-weight:800;line-height:1.35;color:#0b1b2a;">
              ${escapeHtml(subject)}
            </div>
            <div style="font-size:14px;line-height:1.6;color:#5b6570;margin-top:8px;">
              Sent by: <strong style="color:#0b1b2a;">${escapeHtml(displayName)}</strong>
            </div>
            <div style="font-size:14px;line-height:1.6;color:#5b6570;margin-top:2px;">
              Category: ${escapeHtml(serviceType)}
            </div>
            <div style="font-size:14px;line-height:1.6;color:#5b6570;margin-top:2px;">
              Recipients: <strong style="color:#0b1b2a;">${Number(recipientsCount || 0)}</strong>
            </div>
          </div>

          ${buildDetailsGrid(parsed.details)}

          ${buildContentCard(
            "Provider Description",
            parsed.description,
            "#ffffff",
            "rgba(0,184,241,0.12)"
          )}

          ${buildContentCard(
            "Extra Message",
            parsed.extraMessage,
            "#f8fbff",
            "rgba(0,184,241,0.12)"
          )}

          <div style="margin-top:18px;padding:18px;border-radius:16px;background:#f9f6ef;border:1px solid rgba(11,27,42,0.06);">
            <div style="font-size:15px;font-weight:800;line-height:1.4;color:#0b1b2a;">
              Thank you for being part of OnTrip!
            </div>
            <div style="font-size:14px;line-height:1.75;color:#5b6570;margin-top:6px;">
              You are receiving this email because you subscribed for provider updates.
            </div>
          </div>

          <div style="margin-top:18px;padding-top:16px;border-top:1px solid rgba(11,27,42,0.08);text-align:center;font-size:13px;line-height:1.7;color:#8a94a6;">
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
    const { subject, message } = req.body;

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

    const broadcast = await ProviderBroadcast.create({
      provider: provider._id,
      subject: String(subject).trim(),
      message: String(message).trim(),
      recipientsCount: emails.length,
      status: "pending",
    });

    const imageUrl = getProviderCardImage(provider);

    await sendTransactionalEmail({
      to: emails.map((email) => ({ email })),
      subject: String(subject).trim(),
      htmlContent: providerBroadcastEmailHtml({
        subject: String(subject).trim(),
        message: String(message).trim(),
        provider,
        imageUrl,
        recipientsCount: emails.length,
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