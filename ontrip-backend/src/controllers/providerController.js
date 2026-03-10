import Provider from "../models/Provider.js";

export async function createProvider(req, res) {
  try {
    const {
      providerType,
      businessName,
      city,
      phone,
      description,
      price,
      imageUrl,
      vehicleType,
      capacity,
      fuelType,
      withDriver,
      tripMode,
      durationText,
      includes,
    } = req.body;

    if (!providerType || !businessName || !city || !phone || price === undefined) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const doc = await Provider.create({
      owner: req.user._id,
      providerType,
      businessName,
      city,
      phone,
      description,
      price,
      imageUrl,
      vehicleType: providerType === "vehicle" ? vehicleType || "" : "",
      capacity: providerType === "vehicle" ? Number(capacity || 1) : 1,
      fuelType: providerType === "vehicle" ? fuelType || "" : "",
      withDriver: providerType === "vehicle" ? Boolean(withDriver) : false,
      tripMode: providerType === "tour" ? tripMode || "" : "",
      durationText: providerType === "tour" ? durationText || "" : "",
      includes:
        providerType === "tour"
          ? Array.isArray(includes)
            ? includes
            : String(includes || "")
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean)
          : [],
    });

    return res.status(201).json({
      message: "Provider created successfully",
      provider: doc,
    });
  } catch (error) {
    console.error("createProvider error", error);
    return res.status(500).json({ message: "Could not create provider" });
  }
}

export async function getProviders(req, res) {
  try {
    const { providerType, city, q } = req.query;

    const filter = {};

    if (providerType) filter.providerType = providerType;
    if (city) filter.city = new RegExp(city, "i");

    if (q) {
      filter.$or = [
        { businessName: new RegExp(q, "i") },
        { city: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { vehicleType: new RegExp(q, "i") },
        { tripMode: new RegExp(q, "i") },
      ];
    }

    const providers = await Provider.find(filter)
      .populate("owner", "name email")
      .sort({ createdAt: -1 });

    return res.json({ providers });
  } catch (error) {
    console.error("getProviders error", error);
    return res.status(500).json({ message: "Could not fetch providers" });
  }
}

export async function getProviderById(req, res) {
  try {
    const provider = await Provider.findById(req.params.id).populate(
      "owner",
      "name email"
    );

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }

    return res.json({ provider });
  } catch (error) {
    console.error("getProviderById error", error);
    return res.status(500).json({ message: "Could not fetch provider" });
  }
}

export async function getMyProviders(req, res) {
  try {
    const providers = await Provider.find({ owner: req.user._id }).sort({
      createdAt: -1,
    });

    return res.json({ providers });
  } catch (error) {
    console.error("getMyProviders error", error);
    return res.status(500).json({ message: "Could not fetch your providers" });
  }
}