import { getRecommendations } from "../services/recommendationService.js";
import SavedTrip from "../models/SavedTrip.js";
import SocialBookmark from "../models/SocialBookmark.js";
import SocialPost from "../models/SocialPost.js";

/**
 * Controller to fetch personalized destination recommendations
 * GET /api/recommendations/places
 */
export async function getPersonalizedRecommendations(req, res) {
  try {
    const userId = req.user ? req.user._id : null;
    const topK = parseInt(req.query.topK, 10) || 6;
    const preferredTags = req.query.tag ? [req.query.tag] : [];

    const likedPlaces = [];
    const bookmarkedPlaces = [];

    // Also support direct query params for testing or instant client signals
    if (req.query.likedPlaces) {
      const p = req.query.likedPlaces.split(",").map((s) => s.trim().toLowerCase());
      likedPlaces.push(...p);
    }
    if (req.query.bookmarkedPlaces) {
      const b = req.query.bookmarkedPlaces.split(",").map((s) => s.trim().toLowerCase());
      bookmarkedPlaces.push(...b);
    }

    // If user is authenticated, mine implicit preferences from database
    if (userId) {
      try {
        // 1. Fetch saved trips destinations (high user intent)
        const savedTrips = await SavedTrip.find({ user: userId }).select("destination travelStyle").limit(10);
        savedTrips.forEach((trip) => {
          if (trip.destination) {
            bookmarkedPlaces.push(trip.destination.toLowerCase());
          }
          if (trip.travelStyle) {
            preferredTags.push(trip.travelStyle.toLowerCase());
          }
        });

        // 2. Fetch bookmarked social posts
        const bookmarks = await SocialBookmark.find({ user: userId })
          .populate("post", "hashtags text")
          .limit(15);

        bookmarks.forEach((bm) => {
          if (bm.post) {
            (bm.post.hashtags || []).forEach((tag) => preferredTags.push(tag.replace("#", "").toLowerCase()));
            if (bm.post.text) {
              likedPlaces.push(bm.post.text.slice(0, 50).toLowerCase());
            }
          }
        });

        // 3. Fetch liked posts
        const likedPosts = await SocialPost.find({ likes: userId, isDeleted: false })
          .select("hashtags text")
          .limit(15);

        likedPosts.forEach((post) => {
          (post.hashtags || []).forEach((tag) => preferredTags.push(tag.replace("#", "").toLowerCase()));
        });
      } catch (dbErr) {
        console.warn("Could not mine user interaction history for recommendations:", dbErr.message);
      }
    }

    const result = await getRecommendations({
      userId: userId ? String(userId) : null,
      likedPlaces: [...new Set(likedPlaces)],
      bookmarkedPlaces: [...new Set(bookmarkedPlaces)],
      preferredTags: [...new Set(preferredTags)],
      topK,
    });

    return res.status(200).json({
      success: true,
      source: result.source,
      count: result.count,
      recommendations: result.recommendations,
    });
  } catch (err) {
    console.error("Error in getPersonalizedRecommendations:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate recommendations",
      error: err.message,
    });
  }
}

export default { getPersonalizedRecommendations };
