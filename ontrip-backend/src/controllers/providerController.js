import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import Provider from "../models/Provider.js";

function parseVehicleTypes(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return String(value)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
}

function parseBoolean(value) {
  return value === true || value === "true";
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/providers") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
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

export async function createProvider(req, res) {
  try {
    const body = req.body || {};

    const {
      businessName,
      providerCategory,
      serviceTitle,
      city,
      state,
      phone,
      whatsapp,
      description,
      pricingText,
      priceFrom,
      capacity,
      withDriver,
      deliveryAvailable,
    } = body;

    const vehicleTypes = parseVehicleTypes(body.vehicleTypes);

    if (!businessName || !city || !phone) {
      return res.status(400).json({
        message: "Business name, city and phone are required.",
      });
    }

    if ((providerCategory || "vehicle") === "vehicle" && vehicleTypes.length === 0) {
      return res.status(400).json({
        message: "Please select at least one vehicle type.",
      });
    }

    const uploadedImages = await uploadMany(req.files || []);

    const provider = await Provider.create({
      owner: req.user._id,
      businessName,
      providerCategory: providerCategory || "vehicle",
      vehicleTypes,
      serviceTitle: serviceTitle || "",
      city,
      state: state || "",
      phone,
      whatsapp: whatsapp || "",
      description: description || "",
      pricingText: pricingText || "",
      priceFrom: Number(priceFrom || 0),
      capacity: Number(capacity || 1),
      withDriver: parseBoolean(withDriver),
      deliveryAvailable: parseBoolean(deliveryAvailable),
      images: uploadedImages,
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
      return res.status(404).json({
        message: "Provider listing not found.",
      });
    }

    if (String(provider.owner) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You can edit only your own listing.",
      });
    }

    const body = req.body || {};

    const {
      businessName,
      providerCategory,
      serviceTitle,
      city,
      state,
      phone,
      whatsapp,
      description,
      pricingText,
      priceFrom,
      capacity,
      withDriver,
      deliveryAvailable,
      existingImages,
    } = body;

    const vehicleTypes = parseVehicleTypes(body.vehicleTypes);

    let keptImages = [];
    if (existingImages) {
      try {
        keptImages = JSON.parse(existingImages);
      } catch {
        keptImages = [];
      }
    }

    const newImages = await uploadMany(req.files || []);

    provider.businessName = businessName || provider.businessName;
    provider.providerCategory = providerCategory || provider.providerCategory;
    provider.vehicleTypes = vehicleTypes.length ? vehicleTypes : provider.vehicleTypes;
    provider.serviceTitle = serviceTitle || "";
    provider.city = city || provider.city;
    provider.state = state || "";
    provider.phone = phone || provider.phone;
    provider.whatsapp = whatsapp || "";
    provider.description = description || "";
    provider.pricingText = pricingText || "";
    provider.priceFrom = Number(priceFrom || 0);
    provider.capacity = Number(capacity || 1);
    provider.withDriver = parseBoolean(withDriver);
    provider.deliveryAvailable = parseBoolean(deliveryAvailable);
    provider.images = [...keptImages, ...newImages];

    await provider.save();

    return res.json({
      message: "Provider listing updated successfully.",
      provider,
    });
  } catch (error) {
    console.error("updateProvider error", error);
    return res.status(500).json({
      message: "Failed to update provider listing.",
    });
  }
}

export async function getProviders(req, res) {
  try {
    const { q, city, type } = req.query;

    const filter = { isActive: true };

    if (city) {
      filter.city = new RegExp(city, "i");
    }

    if (type) {
      filter.vehicleTypes = type;
    }

    if (q) {
      filter.$or = [
        { businessName: new RegExp(q, "i") },
        { serviceTitle: new RegExp(q, "i") },
        { city: new RegExp(q, "i") },
        { description: new RegExp(q, "i") },
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
      return res.status(404).json({
        message: "Provider listing not found.",
      });
    }

    return res.json({ provider });
  } catch (error) {
    console.error("getProviderById error", error);
    return res.status(500).json({
      message: "Failed to fetch provider listing.",
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