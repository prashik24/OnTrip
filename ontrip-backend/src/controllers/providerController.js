import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import Provider from "../models/Provider.js";

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function splitTextList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseBoolean(value) {
  return value === true || value === "true";
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/providers") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "image" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    Readable.from(buffer).pipe(stream);
  });
}

async function uploadMany(files = []) {
  const uploaded = [];
  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer);
    uploaded.push({
      url: result.secure_url,
      publicId: result.public_id,
    });
  }
  return uploaded;
}

function groupFilesByField(files = []) {
  const grouped = {};
  for (const file of files) {
    const key = file.fieldname;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(file);
  }
  return grouped;
}

export async function createProvider(req, res) {
  try {
    const body = req.body || {};
    const {
      businessName,
      listingType,
      city,
      state,
      phone,
      whatsapp,
      description,
    } = body;

    if (!businessName || !listingType || !city || !phone) {
      return res.status(400).json({
        message: "Business name, listing type, city and phone are required.",
      });
    }

    const groupedFiles = groupFilesByField(req.files || []);

    let vehicles = [];
    let travelPlanner = {};

    if (listingType === "vehicle") {
      const rawVehicles = safeJsonParse(body.vehicles, []);

      if (!Array.isArray(rawVehicles) || rawVehicles.length === 0) {
        return res.status(400).json({
          message: "Please add at least one vehicle.",
        });
      }

      vehicles = [];
      for (let i = 0; i < rawVehicles.length; i++) {
        const item = rawVehicles[i];
        const images = await uploadMany(groupedFiles[`vehicleImages_${i}`] || []);

        vehicles.push({
          vehicleType: item.vehicleType,
          title: item.title || "",
          price: Number(item.price || 0),
          capacity: Number(item.capacity || 1),
          fuelType: item.fuelType || "",
          withDriver: parseBoolean(item.withDriver),
          images,
        });
      }
    }

    if (listingType === "travel_planner") {
      const placesCovered = splitTextList(body.placesCovered);
      const inclusions = splitTextList(body.inclusions);
      const exclusions = splitTextList(body.exclusions);
      const plannerImages = await uploadMany(groupedFiles["plannerImages"] || []);

      travelPlanner = {
        plannerMode: body.plannerMode || "customized_trip",
        packageTitle: body.packageTitle || "",
        durationText: body.durationText || "",
        priceFrom: Number(body.priceFrom || 0),
        placesCovered,
        inclusions,
        exclusions,
        images: plannerImages,
      };
    }

    const provider = await Provider.create({
      owner: req.user._id,
      businessName,
      listingType,
      city,
      state: state || "",
      phone,
      whatsapp: whatsapp || "",
      description: description || "",
      vehicles,
      travelPlanner,
    });

    return res.status(201).json({
      message: "Provider listing created successfully.",
      provider,
    });
  } catch (error) {
    console.error("createProvider error", error);
    return res.status(500).json({
      message: "Failed to create provider listing.",
    });
  }
}

export async function updateProvider(req, res) {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (String(provider.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can edit only your own listing." });
    }

    const body = req.body || {};
    const groupedFiles = groupFilesByField(req.files || []);

    provider.businessName = body.businessName || provider.businessName;
    provider.city = body.city || provider.city;
    provider.state = body.state || "";
    provider.phone = body.phone || provider.phone;
    provider.whatsapp = body.whatsapp || "";
    provider.description = body.description || "";
    provider.listingType = body.listingType || provider.listingType;

    if (provider.listingType === "vehicle") {
      const rawVehicles = safeJsonParse(body.vehicles, []);
      const existingVehicles = safeJsonParse(body.existingVehicles, []);

      const updatedVehicles = [];
      for (let i = 0; i < rawVehicles.length; i++) {
        const item = rawVehicles[i];
        const existingImages = existingVehicles[i]?.images || [];
        const newImages = await uploadMany(groupedFiles[`vehicleImages_${i}`] || []);

        updatedVehicles.push({
          vehicleType: item.vehicleType,
          title: item.title || "",
          price: Number(item.price || 0),
          capacity: Number(item.capacity || 1),
          fuelType: item.fuelType || "",
          withDriver: parseBoolean(item.withDriver),
          images: [...existingImages, ...newImages],
        });
      }

      provider.vehicles = updatedVehicles;
      provider.travelPlanner = {};
    }

    if (provider.listingType === "travel_planner") {
      const existingPlannerImages = safeJsonParse(body.existingPlannerImages, []);
      const newPlannerImages = await uploadMany(groupedFiles["plannerImages"] || []);

      provider.vehicles = [];
      provider.travelPlanner = {
        plannerMode: body.plannerMode || "customized_trip",
        packageTitle: body.packageTitle || "",
        durationText: body.durationText || "",
        priceFrom: Number(body.priceFrom || 0),
        placesCovered: splitTextList(body.placesCovered),
        inclusions: splitTextList(body.inclusions),
        exclusions: splitTextList(body.exclusions),
        images: [...existingPlannerImages, ...newPlannerImages],
      };
    }

    await provider.save();

    return res.json({
      message: "Provider listing updated successfully.",
      provider,
    });
  } catch (error) {
    console.error("updateProvider error", error);
    return res.status(500).json({
      message: "Failed to update listing.",
    });
  }
}

export async function deleteProvider(req, res) {
  try {
    const provider = await Provider.findById(req.params.id);

    if (!provider) {
      return res.status(404).json({ message: "Listing not found." });
    }

    if (String(provider.owner) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can remove only your own listing." });
    }

    await Provider.findByIdAndDelete(req.params.id);

    return res.json({
      message: "Provider listing removed successfully.",
    });
  } catch (error) {
    console.error("deleteProvider error", error);
    return res.status(500).json({
      message: "Failed to remove listing.",
    });
  }
}

export async function getProviders(req, res) {
  try {
    const { q, city, listingType, vehicleType } = req.query;

    const filter = { isActive: true };

    if (city) filter.city = new RegExp(city, "i");
    if (listingType) filter.listingType = listingType;
    if (vehicleType) filter["vehicles.vehicleType"] = vehicleType;

    if (q) {
      filter.$or = [
        { businessName: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
        { city: new RegExp(q, "i") },
        { "travelPlanner.packageTitle": new RegExp(q, "i") },
      ];
    }

    const providers = await Provider.find(filter)
      .populate("owner", "name avatar")
      .sort({ createdAt: -1 });

    return res.json({ providers });
  } catch (error) {
    console.error("getProviders error", error);
    return res.status(500).json({
      message: "Failed to fetch providers.",
    });
  }
}

export async function getProviderById(req, res) {
  try {
    const provider = await Provider.findById(req.params.id).populate(
      "owner",
      "name avatar email"
    );

    if (!provider) {
      return res.status(404).json({ message: "Listing not found." });
    }

    return res.json({ provider });
  } catch (error) {
    console.error("getProviderById error", error);
    return res.status(500).json({
      message: "Failed to fetch provider.",
    });
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
    return res.status(500).json({
      message: "Failed to fetch your listings.",
    });
  }
}