import { Readable } from "stream";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import CommunityPost from "../models/CommunityPost.js";
import Provider from "../models/Provider.js";

function splitTags(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function extractHashTags(text = "") {
  const matches = String(text).match(/#[a-zA-Z0-9_]+/g) || [];
  return matches.map((tag) => tag.replace("#", "").toLowerCase());
}

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/community") {
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

async function uploadMany(files = [], folder = "ontrip/community") {
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

function normalizePost(post, viewerId = null) {
  const likeIds = (post.likes || []).map((id) => String(id));
  const saveIds = (post.saves || []).map((id) => String(id));
  const comments = (post.comments || []).map((comment) => {
    const commentLikeIds = (comment.likes || []).map((id) => String(id));
    return {
      id: comment._id,
      user: comment.user
        ? {
            id: comment.user._id || comment.user.id,
            name: comment.user.name,
            avatar: comment.user.avatar || "",
            city: comment.user.city || "",
            role: comment.user.role || "user",
          }
        : null,
      text: comment.text,
      likesCount: commentLikeIds.length,
      isLikedByMe: viewerId ? commentLikeIds.includes(String(viewerId)) : false,
      parentComment: comment.parentComment || null,
      isEdited: !!comment.isEdited,
      editedAt: comment.editedAt || null,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  });

  let poll = null;
  if (post.postType === "poll") {
    const options = post.pollOptions || [];
    const totalVotes = options.reduce((sum, option) => sum + (option.votes?.length || 0), 0);

    poll = {
      totalVotes,
      options: options.map((option) => ({
        id: option._id,
        text: option.text,
        votesCount: option.votes?.length || 0,
        percentage:
          totalVotes > 0 ? Math.round(((option.votes?.length || 0) / totalVotes) * 100) : 0,
        isVotedByMe: viewerId
          ? (option.votes || []).some((id) => String(id) === String(viewerId))
          : false,
      })),
    };
  }

  return {
    id: post._id,
    author: post.author
      ? {
          id: post.author._id || post.author.id,
          name: post.author.name,
          email: post.author.email || "",
          avatar: post.author.avatar || "",
          city: post.author.city || "",
          role: post.author.role || post.authorRoleSnapshot || "user",
        }
      : null,
    authorRoleSnapshot: post.authorRoleSnapshot || "user",
    postType: post.postType,
    text: post.text || "",
    images: post.images || [],
    locationText: post.locationText || "",
    tags: post.tags || [],
    providerId: post.providerId || null,
    linkedListingType: post.linkedListingType || "",
    linkedListingTitle: post.linkedListingTitle || "",
    linkedListingPriceText: post.linkedListingPriceText || "",
    linkedListingImage: post.linkedListingImage || "",
    likesCount: likeIds.length,
    savesCount: saveIds.length,
    commentsCount: comments.length,
    sharesCount: post.sharesCount || 0,
    viewsCount: post.viewsCount || 0,
    isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
    isSavedByMe: viewerId ? saveIds.includes(String(viewerId)) : false,
    isMine: viewerId ? String(post.author?._id || post.author) === String(viewerId) : false,
    city: post.city || "",
    isPinned: !!post.isPinned,
    poll,
    comments,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

export async function getCommunityPosts(req, res) {
  try {
    const viewerId = req.user?._id || null;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);
    const { filter = "all", city = "", q = "" } = req.query;

    const dbFilter = {
      isDeleted: false,
      isHidden: false,
    };

    if (city.trim()) {
      dbFilter.city = new RegExp(city.trim(), "i");
    }

    if (q.trim()) {
      dbFilter.$or = [
        { text: new RegExp(q.trim(), "i") },
        { tags: new RegExp(q.trim(), "i") },
        { locationText: new RegExp(q.trim(), "i") },
        { linkedListingTitle: new RegExp(q.trim(), "i") },
      ];
    }

    if (filter === "questions") dbFilter.postType = "question";
    if (filter === "stories") dbFilter.postType = "trip_story";
    if (filter === "offers") dbFilter.postType = "provider_offer";
    if (filter === "polls") dbFilter.postType = "poll";

    const posts = await CommunityPost.find(dbFilter)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name avatar city role")
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(dbFilter);

    return res.json({
      posts: posts.map((post) => normalizePost(post, viewerId)),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getCommunityPosts error", error);
    return res.status(500).json({
      message: "Failed to load community posts.",
    });
  }
}

export async function getCommunityTrending(req, res) {
  try {
    const posts = await CommunityPost.find({
      isDeleted: false,
      isHidden: false,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }).select("tags city");

    const tagMap = new Map();
    const cityMap = new Map();

    for (const post of posts) {
      for (const tag of post.tags || []) {
        tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
      }
      if (post.city) {
        cityMap.set(post.city, (cityMap.get(post.city) || 0) + 1);
      }
    }

    const trendingTags = [...tagMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([tag, count]) => ({ tag, count }));

    const trendingCities = [...cityMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    return res.json({
      trendingTags,
      trendingCities,
    });
  } catch (error) {
    console.error("getCommunityTrending error", error);
    return res.status(500).json({
      message: "Failed to load trends.",
    });
  }
}

export async function createCommunityPost(req, res) {
  try {
    const user = req.user;
    const body = req.body || {};

    const postType = String(body.postType || "post");
    const text = String(body.text || "").trim();
    const locationText = String(body.locationText || "").trim();
    const manualTags = splitTags(body.tags);
    const autoTags = extractHashTags(text);
    const tags = [...new Set([...manualTags, ...autoTags])];

    if (!text && (!req.files || req.files.length === 0) && postType !== "provider_offer" && postType !== "poll") {
      return res.status(400).json({
        message: "Write something or upload image.",
      });
    }

    const images = await uploadMany(req.files || [], "ontrip/community/posts");

    const postData = {
      author: user._id,
      authorRoleSnapshot: user.role || "user",
      postType,
      text,
      images,
      locationText,
      tags,
      city: user.city || "",
    };

    if (postType === "provider_offer") {
      const providerId = body.providerId;

      if (!providerId || !mongoose.Types.ObjectId.isValid(providerId)) {
        return res.status(400).json({
          message: "Valid provider is required for provider offer.",
        });
      }

      const provider = await Provider.findById(providerId);
      if (!provider) {
        return res.status(404).json({
          message: "Provider listing not found.",
        });
      }

      if (String(provider.owner) !== String(user._id)) {
        return res.status(403).json({
          message: "You can post only your own listing offer.",
        });
      }

      let linkedTitle = provider.businessName;
      let linkedPriceText = "";
      let linkedImage = provider.serviceImage?.url || "";
      let linkedListingType = provider.listingType || "";

      if (provider.listingType === "travel_planner") {
        const plan = provider.travelPlans?.[0] || provider.travelPlanner || {};
        linkedTitle = plan.packageTitle || provider.businessName;
        linkedPriceText = plan.priceFrom ? `₹${plan.priceFrom}` : "";
        linkedImage = plan.images?.[0]?.url || linkedImage;
      }

      if (provider.listingType === "vehicle") {
        const vehicle = provider.vehicles?.[0] || {};
        linkedTitle = vehicle.title || provider.businessName;
        linkedPriceText = vehicle.price ? `₹${vehicle.price}` : "";
        linkedImage = vehicle.images?.[0]?.url || linkedImage;
      }

      postData.providerId = provider._id;
      postData.linkedListingType = linkedListingType;
      postData.linkedListingTitle = linkedTitle;
      postData.linkedListingPriceText = linkedPriceText;
      postData.linkedListingImage = linkedImage;
    }

    if (postType === "poll") {
      const pollOptions = safeJsonParse(body.pollOptions, []);
      if (!Array.isArray(pollOptions) || pollOptions.filter(Boolean).length < 2) {
        return res.status(400).json({
          message: "Poll needs at least 2 options.",
        });
      }

      postData.pollOptions = pollOptions
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 4)
        .map((item) => ({
          text: item,
          votes: [],
        }));
    }

    const created = await CommunityPost.create(postData);

    const post = await CommunityPost.findById(created._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name avatar city role");

    return res.status(201).json({
      message: "Post created successfully.",
      post: normalizePost(post, user._id),
    });
  } catch (error) {
    console.error("createCommunityPost error", error);
    return res.status(500).json({
      message: "Failed to create community post.",
    });
  }
}

export async function togglePostLike(req, res) {
  try {
    const userId = String(req.user._id);
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const alreadyLiked = post.likes.some((id) => String(id) === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== userId);
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    return res.json({
      message: alreadyLiked ? "Post unliked." : "Post liked.",
      likesCount: post.likes.length,
      isLikedByMe: !alreadyLiked,
    });
  } catch (error) {
    console.error("togglePostLike error", error);
    return res.status(500).json({
      message: "Failed to update like.",
    });
  }
}

export async function togglePostSave(req, res) {
  try {
    const userId = String(req.user._id);
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const alreadySaved = post.saves.some((id) => String(id) === userId);

    if (alreadySaved) {
      post.saves = post.saves.filter((id) => String(id) !== userId);
    } else {
      post.saves.push(req.user._id);
    }

    await post.save();

    return res.json({
      message: alreadySaved ? "Post unsaved." : "Post saved.",
      savesCount: post.saves.length,
      isSavedByMe: !alreadySaved,
    });
  } catch (error) {
    console.error("togglePostSave error", error);
    return res.status(500).json({
      message: "Failed to update save.",
    });
  }
}

export async function addPostComment(req, res) {
  try {
    const { postId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required.",
      });
    }

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.comments.push({
      user: req.user._id,
      text,
      likes: [],
    });

    await post.save();

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name avatar city role");

    return res.status(201).json({
      message: "Comment added.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("addPostComment error", error);
    return res.status(500).json({
      message: "Failed to add comment.",
    });
  }
}

export async function voteOnPoll(req, res) {
  try {
    const { postId } = req.params;
    const { optionId } = req.body;
    const userId = String(req.user._id);

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (post.postType !== "poll") {
      return res.status(400).json({ message: "This post is not a poll." });
    }

    for (const option of post.pollOptions) {
      option.votes = option.votes.filter((id) => String(id) !== userId);
    }

    const target = post.pollOptions.id(optionId);
    if (!target) {
      return res.status(404).json({ message: "Poll option not found." });
    }

    target.votes.push(req.user._id);
    await post.save();

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name avatar city role");

    return res.json({
      message: "Vote recorded.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("voteOnPoll error", error);
    return res.status(500).json({
      message: "Failed to vote on poll.",
    });
  }
}

export async function incrementPostShare(req, res) {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.sharesCount += 1;
    await post.save();

    return res.json({
      message: "Share counted.",
      sharesCount: post.sharesCount,
    });
  } catch (error) {
    console.error("incrementPostShare error", error);
    return res.status(500).json({
      message: "Failed to count share.",
    });
  }
}

export async function deleteCommunityPost(req, res) {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const isOwner = String(post.author) === String(req.user._id);
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        message: "You can remove only your own post.",
      });
    }

    post.isDeleted = true;
    await post.save();

    return res.json({
      message: "Post deleted.",
    });
  } catch (error) {
    console.error("deleteCommunityPost error", error);
    return res.status(500).json({
      message: "Failed to delete post.",
    });
  }
}