import Provider from "../models/Provider.js";
import Subscriber from "../models/Subscriber.js";
import { sendEmail } from "../config/mailer.js";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatPrice(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num) || num <= 0) return "Contact for price";
  return `₹${num}`;
}

function getListingImage(provider) {
  if (provider?.serviceImage) return provider.serviceImage;

  const vehicleImage =
    provider?.vehicles?.find((item) => Array.isArray(item.images) && item.images.length)?.images?.[0];

  if (vehicleImage) return vehicleImage;

  const tripImage =
    provider?.travelPlanner?.find((item) => Array.isArray(item.images) && item.images.length)?.images?.[0];

  if (tripImage) return tripImage;

  return process.env.BROADCAST_FALLBACK_IMAGE || "";
}

function getPrimaryVehicle(provider) {
  return Array.isArray(provider?.vehicles) && provider.vehicles.length
    ? provider.vehicles[0]
    : null;
}

function getPrimaryTrip(provider) {
  return Array.isArray(provider?.travelPlanner) && provider.travelPlanner.length
    ? provider.travelPlanner[0]
    : null;
}

function buildVehicleBlock(provider) {
  const vehicle = getPrimaryVehicle(provider);
  if (!vehicle) return "";

  return `
    <div style="margin-top:24px;padding:18px;border:1px solid #d9eef8;border-radius:18px;background:#f9fdff;">
      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;">Vehicle Details</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#334155;line-height:1.7;">
        <tr><td style="padding:3px 0;"><strong>Vehicle Type:</strong> ${escapeHtml(vehicle.vehicleType || "-")}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Title:</strong> ${escapeHtml(vehicle.title || "-")}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Price:</strong> ${formatPrice(vehicle.price)}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Price Unit:</strong> ${escapeHtml(
          String(vehicle.priceUnit || "").replaceAll("_", " ") || "-"
        )}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Capacity:</strong> ${escapeHtml(vehicle.capacity || "-")}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Fuel Type:</strong> ${escapeHtml(vehicle.fuelType || "-")}</td></tr>
        <tr><td style="padding:3px 0;"><strong>With Driver:</strong> ${vehicle.withDriver ? "Yes" : "No"}</td></tr>
      </table>
    </div>
  `;
}

function buildTripBlock(provider) {
  const trip = getPrimaryTrip(provider);
  if (!trip) return "";

  const placesCovered = Array.isArray(trip.placesCovered)
    ? trip.placesCovered.join(", ")
    : String(trip.placesCovered || "").trim();

  return `
    <div style="margin-top:24px;padding:18px;border:1px solid #d9eef8;border-radius:18px;background:#f9fdff;">
      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:12px;">Travel Package Details</div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:15px;color:#334155;line-height:1.7;">
        <tr><td style="padding:3px 0;"><strong>Package Title:</strong> ${escapeHtml(trip.packageTitle || "-")}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Planner Mode:</strong> ${escapeHtml(
          String(trip.plannerMode || "").replaceAll("_", " ") || "-"
        )}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Duration:</strong> ${escapeHtml(trip.durationText || `${trip.days || "-"} Days`)}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Price From:</strong> ${formatPrice(trip.priceFrom || trip.pricePerPerson)}</td></tr>
        <tr><td style="padding:3px 0;"><strong>Places Covered:</strong> ${escapeHtml(placesCovered || "-")}</td></tr>
      </table>
    </div>
  `;
}

function buildBroadcastEmailHtml({
  userName,
  provider,
  subjectLine,
  extraMessage,
  listingImage,
  logoUrl,
}) {
  const businessName = provider?.businessName || "OnTrip Provider";
  const city = provider?.city || "-";
  const state = provider?.state || "-";
  const listingType =
    provider?.listingType === "travel_planner"
      ? "Travel Package"
      : provider?.listingType === "vehicle"
      ? "Vehicle Service"
      : "Travel Service";

  const description =
    provider?.description || "Explore this provider listing on OnTrip.";

  const serviceBlock =
    provider?.listingType === "travel_planner"
      ? buildTripBlock(provider)
      : buildVehicleBlock(provider);

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(subjectLine)}</title>
    </head>
    <body style="margin:0;padding:0;background:#eef7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef7fb;margin:0;padding:24px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border-radius:28px;overflow:hidden;border:1px solid #dbeaf2;">
              
              <tr>
                <td style="background:linear-gradient(135deg,#4ec9f5,#00b8f1);padding:30px 32px 28px 32px;">
                  ${
                    logoUrl
                      ? `<img src="${logoUrl}" alt="OnTrip" style="height:54px;display:block;margin-bottom:18px;border-radius:12px;" />`
                      : `<div style="font-size:42px;font-weight:900;color:#ffffff;line-height:1;margin-bottom:18px;">OnTrip</div>`
                  }
                  <div style="font-size:34px;font-weight:900;color:#ffffff;line-height:1.15;">${escapeHtml(subjectLine)}</div>
                  <div style="margin-top:14px;font-size:18px;line-height:1.6;color:rgba(255,255,255,0.96);">
                    Dear ${escapeHtml(userName || "Traveler")},<br/>
                    ${escapeHtml(extraMessage || "We are sharing a special provider update with you from OnTrip.")}
                  </div>
                </td>
              </tr>

              ${
                listingImage
                  ? `
                <tr>
                  <td style="padding:0;">
                    <img src="${listingImage}" alt="${escapeHtml(businessName)}" style="width:100%;display:block;max-height:340px;object-fit:cover;background:#eaf6fc;" />
                  </td>
                </tr>
              `
                  : ""
              }

              <tr>
                <td style="padding:28px 30px 30px 30px;">
                  <div style="border:1px solid #d9eef8;border-radius:20px;padding:20px;background:#ffffff;">
                    <div style="font-size:28px;font-weight:900;color:#0f172a;line-height:1.2;">
                      ${escapeHtml(businessName)}
                    </div>
                    <div style="margin-top:10px;font-size:15px;color:#475569;line-height:1.7;">
                      <strong>City:</strong> ${escapeHtml(city)}<br/>
                      <strong>State:</strong> ${escapeHtml(state)}<br/>
                      <strong>Listing Type:</strong> ${escapeHtml(listingType)}
                    </div>
                  </div>

                  ${serviceBlock}

                  <div style="margin-top:24px;padding:18px;border:1px solid #d9eef8;border-radius:18px;background:#ffffff;">
                    <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:10px;">Description</div>
                    <div style="font-size:15px;line-height:1.75;color:#334155;">
                      ${escapeHtml(description)}
                    </div>
                  </div>

                  ${
                    extraMessage
                      ? `
                    <div style="margin-top:24px;padding:18px;border:1px solid #d9eef8;border-radius:18px;background:#ffffff;">
                      <div style="font-size:18px;font-weight:800;color:#0f172a;margin-bottom:10px;">Message from Provider</div>
                      <div style="font-size:15px;line-height:1.75;color:#334155;">
                        ${escapeHtml(extraMessage)}
                      </div>
                    </div>
                  `
                      : ""
                  }

                  <div style="margin-top:30px;padding-top:18px;border-top:1px solid #e2e8f0;font-size:14px;color:#64748b;line-height:1.7;">
                    Sent via <strong>OnTrip</strong><br/>
                    Provider: <strong>${escapeHtml(businessName)}</strong>
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

export async function sendProviderBroadcastEmail(req, res) {
  try {
    const provider = await Provider.findOne({ owner: req.user._id }).lean();

    if (!provider) {
      return res.status(404).json({
        message: "Provider profile not found.",
      });
    }

    const subjectLine = String(req.body.subject || "").trim() || "Provider Update from OnTrip";
    const extraMessage = String(req.body.message || "").trim();
    const recipients = Array.isArray(req.body.recipients) ? req.body.recipients : [];

    let emails = recipients
      .map((item) => String(item || "").trim().toLowerCase())
      .filter(Boolean);

    if (!emails.length) {
      const subscribers = await Subscriber.find({ isSubscribed: true })
        .select("name email")
        .lean();

      emails = subscribers.map((item) => item.email).filter(Boolean);
    }

    if (!emails.length) {
      return res.status(400).json({
        message: "No recipients found for broadcast.",
      });
    }

    const logoUrl = process.env.SITE_LOGO_URL || "";
    const listingImage = getListingImage(provider);

    const subscribers = await Subscriber.find({
      email: { $in: emails },
      isSubscribed: true,
    })
      .select("name email")
      .lean();

    const byEmail = new Map(subscribers.map((item) => [item.email, item]));

    let sentCount = 0;
    const failed = [];

    for (const email of emails) {
      try {
        const subscriber = byEmail.get(email);
        const userName =
          subscriber?.name ||
          email.split("@")[0] ||
          "Traveler";

        const html = buildBroadcastEmailHtml({
          userName,
          provider,
          subjectLine,
          extraMessage,
          listingImage,
          logoUrl,
        });

        await sendEmail({
          to: email,
          subject: subjectLine,
          html,
        });

        sentCount += 1;
      } catch (err) {
        failed.push(email);
      }
    }

    return res.json({
      message:
        failed.length > 0
          ? `Broadcast sent to ${sentCount} users. Failed for ${failed.length}.`
          : `Broadcast sent successfully to ${sentCount} users.`,
      sentCount,
      failed,
    });
  } catch (error) {
    console.error("sendProviderBroadcastEmail error", error);
    return res.status(500).json({
      message: "Failed to send provider broadcast email.",
    });
  }
}