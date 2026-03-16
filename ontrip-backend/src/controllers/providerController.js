import { Readable } from "stream";
import mongoose from "mongoose";
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

async function uploadMany(files = [], folder = "ontrip/providers") {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer, folder);
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

function buildLegacyTravelPlannerFromPlans(travelPlans = []) {
  if (!Array.isArray(travelPlans) || travelPlans.length === 0) {
    return {};
  }
  return travelPlans[0];
}

function getTravelPlansFromBody(body, groupedFiles) {
  const rawTravelPlans = safeJsonParse(body.travelPlans, null);

  if (Array.isArray(rawTravelPlans) && rawTravelPlans.length > 0) {
    return Promise.all(
      rawTravelPlans.map(async (item, index) => {
        const images = await uploadMany(
          groupedFiles[`plannerImages_${index}`] || [],
          "ontrip/providers/planner"
        );

        return {
          plannerMode: item.plannerMode || "customized_trip",
          packageTitle: item.packageTitle || "",
          durationText: item.durationText || "",
          days: Number(item.days || 1),
          priceFrom: Number(item.priceFrom || 0),
          pricePerPerson: Number(item.pricePerPerson || 0),
          placesCovered: splitTextList(item.placesCovered),
          inclusions: splitTextList(item.inclusions),
          exclusions: splitTextList(item.exclusions),
          images,
        };
      })
    );
  }

  return (async () => {
    const plannerImages = await uploadMany(
      groupedFiles["plannerImages"] || [],
      "ontrip/providers/planner"
    );

    return [
      {
        plannerMode: body.plannerMode || "customized_trip",
        packageTitle: body.packageTitle || "",
        durationText: body.durationText || "",
        days: Number(body.days || 1),
        priceFrom: Number(body.priceFrom || 0),
        pricePerPerson: Number(body.pricePerPerson || 0),
        placesCovered: splitTextList(body.placesCovered),
        inclusions: splitTextList(body.inclusions),
        exclusions: splitTextList(body.exclusions),
        images: plannerImages,
      },
    ];
  })();
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

    const serviceImageUpload = await uploadMany(
      groupedFiles["serviceImage"] || [],
      "ontrip/providers/service"
    );

    let vehicles = [];
    let travelPlans = [];
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
        const images = await uploadMany(
          groupedFiles[`vehicleImages_${i}`] || [],
          "ontrip/providers/vehicles"
        );

        vehicles.push({
          vehicleType: item.vehicleType,
          title: item.title || "",
          price: Number(item.price || 0),
          priceUnit: item.priceUnit || "per_day",
          capacity: Number(item.capacity || 1),
          fuelType: item.fuelType || "",
          withDriver: parseBoolean(item.withDriver),
          images,
        });
      }
    }

    if (listingType === "travel_planner") {
      travelPlans = await getTravelPlansFromBody(body, groupedFiles);

      if (!Array.isArray(travelPlans) || travelPlans.length === 0) {
        return res.status(400).json({
          message: "Please add at least one trip.",
        });
      }

      travelPlanner = buildLegacyTravelPlannerFromPlans(travelPlans);
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
      serviceImage: serviceImageUpload[0] || null,
      vehicles,
      travelPlans,
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
      return res.status(404).json({
        message: "Listing not found.",
      });
    }

    if (String(provider.owner) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You can edit only your own listing.",
      });
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

    const serviceImageUpload = await uploadMany(
      groupedFiles["serviceImage"] || [],
      "ontrip/providers/service"
    );

    if (serviceImageUpload.length > 0) {
      provider.serviceImage = serviceImageUpload[0];
    }

    if (provider.listingType === "vehicle") {
      const rawVehicles = safeJsonParse(body.vehicles, []);
      const existingVehicles = safeJsonParse(body.existingVehicles, []);

      const updatedVehicles = [];

      for (let i = 0; i < rawVehicles.length; i++) {
        const item = rawVehicles[i];
        const existingImages = existingVehicles[i]?.images || [];
        const newImages = await uploadMany(
          groupedFiles[`vehicleImages_${i}`] || [],
          "ontrip/providers/vehicles"
        );

        updatedVehicles.push({
          vehicleType: item.vehicleType,
          title: item.title || "",
          price: Number(item.price || 0),
          priceUnit: item.priceUnit || "per_day",
          capacity: Number(item.capacity || 1),
          fuelType: item.fuelType || "",
          withDriver: parseBoolean(item.withDriver),
          images: [...existingImages, ...newImages],
        });
      }

      provider.vehicles = updatedVehicles;
      provider.travelPlans = [];
      provider.travelPlanner = {};
    }

    if (provider.listingType === "travel_planner") {
      const rawTravelPlans = safeJsonParse(body.travelPlans, null);
      const existingTravelPlans = safeJsonParse(body.existingTravelPlans, null);
      let updatedTravelPlans = [];

      if (Array.isArray(rawTravelPlans) && rawTravelPlans.length > 0) {
        for (let i = 0; i < rawTravelPlans.length; i++) {
          const item = rawTravelPlans[i];
          const existingImages = existingTravelPlans?.[i]?.images || [];
          const newImages = await uploadMany(
            groupedFiles[`plannerImages_${i}`] || [],
            "ontrip/providers/planner"
          );

          updatedTravelPlans.push({
            plannerMode: item.plannerMode || "customized_trip",
            packageTitle: item.packageTitle || "",
            durationText: item.durationText || "",
            days: Number(item.days || 1),
            priceFrom: Number(item.priceFrom || 0),
            pricePerPerson: Number(item.pricePerPerson || 0),
            placesCovered: splitTextList(item.placesCovered),
            inclusions: splitTextList(item.inclusions),
            exclusions: splitTextList(item.exclusions),
            images: [...existingImages, ...newImages],
          });
        }
      } else {
        const existingPlannerImages = safeJsonParse(body.existingPlannerImages, []);
        const newPlannerImages = await uploadMany(
          groupedFiles["plannerImages"] || [],
          "ontrip/providers/planner"
        );

        updatedTravelPlans = [
          {
            plannerMode: body.plannerMode || "customized_trip",
            packageTitle: body.packageTitle || "",
            durationText: body.durationText || "",
            days: Number(body.days || 1),
            priceFrom: Number(body.priceFrom || 0),
            pricePerPerson: Number(body.pricePerPerson || 0),
            placesCovered: splitTextList(body.placesCovered),
            inclusions: splitTextList(body.inclusions),
            exclusions: splitTextList(body.exclusions),
            images: [...existingPlannerImages, ...newPlannerImages],
          },
        ];
      }

      provider.vehicles = [];
      provider.travelPlans = updatedTravelPlans;
      provider.travelPlanner = buildLegacyTravelPlannerFromPlans(updatedTravelPlans);
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
      return res.status(404).json({
        message: "Listing not found.",
      });
    }

    if (String(provider.owner) !== String(req.user._id)) {
      return res.status(403).json({
        message: "You can remove only your own listing.",
      });
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
        { "travelPlans.packageTitle": new RegExp(q, "i") },
        { "travelPlans.placesCovered": new RegExp(q, "i") },
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
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid provider id.",
      });
    }

    const provider = await Provider.findById(id).populate(
      "owner",
      "name avatar email"
    );

    if (!provider) {
      return res.status(404).json({
        message: "Listing not found.",
      });
    }

    const similarProviders = await Provider.find({
      _id: { $ne: provider._id },
      isActive: true,
      listingType: provider.listingType,
      city: provider.city,
    })
      .populate("owner", "name avatar")
      .sort({ ratingAverage: -1, createdAt: -1 })
      .limit(4);

    return res.json({ provider, similarProviders });
  } catch (error) {
    console.error("getProviderById error", error);
    return res.status(500).json({
      message: "Failed to fetch provider.",
    });
  }
}

export async function getMyProviders(req, res) {
  try {
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        message: "Not authorized.",
      });
    }

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