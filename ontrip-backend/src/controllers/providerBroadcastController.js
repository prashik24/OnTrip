import Subscriber from "../models/Subscriber.js";
import Provider from "../models/Provider.js";
import ProviderBroadcast from "../models/ProviderBroadcast.js";
import { sendTransactionalEmail } from "../config/mailer.js";

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

    const subscribers = await Subscriber.find({ status: "active" });

    const emails = subscribers.map((s) => s.email);

    if (emails.length === 0) {
      return res.status(400).json({
        message: "No subscribers found",
      });
    }

    const broadcast = await ProviderBroadcast.create({
      provider: provider._id,
      subject,
      message,
      recipientsCount: emails.length,
      status: "pending",
    });

    const htmlContent = `
      <div style="font-family:Arial;background:#f4fbff;padding:20px;">
        <div style="max-width:600px;margin:auto;background:#fff;padding:20px;border-radius:16px;">
          
          <h2 style="color:#00b8f1;">${subject}</h2>
          
          <p>${message.replace(/\n/g, "<br/>")}</p>

          <hr style="margin:20px 0;" />

          <p style="font-size:14px;color:#555;">
            Sent by: ${provider.businessName}
          </p>

        </div>
      </div>
    `;

    await sendTransactionalEmail({
      to: emails.map((email) => ({ email })),
      subject,
      htmlContent,
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

    const broadcasts = await ProviderBroadcast.find({
      provider: provider._id,
    }).sort({ createdAt: -1 });

    return res.json(broadcasts);
  } catch (error) {
    console.error("get broadcasts error:", error);
    return res.status(500).json({
      message: "Failed to fetch broadcasts",
    });
  }
}