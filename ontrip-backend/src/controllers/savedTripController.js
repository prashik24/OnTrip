import SavedTrip from "../models/SavedTrip.js";

export async function createSavedTrip(req, res) {
  try {
    const userId = req.user?._id;
    const {
      title = "",
      destination = "",
      startCity = "",
      days = 1,
      budget = 0,
      peopleCount = 1,
      travelStyle = "Balanced",
      tripData = null,
    } = req.body || {};

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!destination.trim()) {
      return res.status(400).json({ message: "Destination required" });
    }

    if (!tripData) {
      return res.status(400).json({ message: "Trip data required" });
    }

    const savedTrip = await SavedTrip.create({
      user: userId,
      title: title?.trim() || `${destination.trim()} Trip`,
      destination: destination.trim(),
      startCity: startCity?.trim() || "",
      days: Number(days),
      budget: Number(budget),
      peopleCount: Number(peopleCount),
      travelStyle: travelStyle || "Balanced",
      tripData,
    });

    return res.status(201).json({
      message: "Trip saved successfully",
      trip: savedTrip,
    });
  } catch (error) {
    console.error("createSavedTrip error:", error);
    return res.status(500).json({ message: "Failed to save trip" });
  }
}

export async function getMySavedTrips(req, res) {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const trips = await SavedTrip.find({ user: userId }).sort({ createdAt: -1 });

    return res.json({ trips });
  } catch (error) {
    console.error("getMySavedTrips error:", error);
    return res.status(500).json({ message: "Failed to fetch saved trips" });
  }
}

export async function getSavedTripById(req, res) {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const trip = await SavedTrip.findOne({ _id: id, user: userId });

    if (!trip) {
      return res.status(404).json({ message: "Saved trip not found" });
    }

    return res.json({ trip });
  } catch (error) {
    console.error("getSavedTripById error:", error);
    return res.status(500).json({ message: "Failed to fetch saved trip" });
  }
}

export async function deleteSavedTrip(req, res) {
  try {
    const userId = req.user?._id;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const deleted = await SavedTrip.findOneAndDelete({ _id: id, user: userId });

    if (!deleted) {
      return res.status(404).json({ message: "Saved trip not found" });
    }

    return res.json({ message: "Saved trip deleted successfully" });
  } catch (error) {
    console.error("deleteSavedTrip error:", error);
    return res.status(500).json({ message: "Failed to delete saved trip" });
  }
}