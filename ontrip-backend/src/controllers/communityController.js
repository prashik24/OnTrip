import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import CommunityPost from "../models/CommunityPost.js";
import CommunityFollow from "../models/CommunityFollow.js";
import CommunityNotification from "../models/CommunityNotification.js";
import User from "../models/User.js";

function safeJsonParse(value, fallback) {
  if (!value) return fallback;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function extractHashtags(text = "") {
  const matches = String(text).match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.slice(1).toLowerCase()))];
}

function parseTagArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => String(item).trim().toLowerCase()).filter(Boolean))];
  }

  return [
    ...new Set(
      String(value)
        .split(",")
        .map((item) => item.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
    ),
  ];
}

function toUserShape(user) {
  if (!user) return null;
  return {
    id: user._id || user.id,
    name: user.name || "User",
    email: user.email || "",
    avatar: user.avatar || "",
    city: user.city || "",
    role: user.role || "user",
  };
}

function normalizeReply(reply, viewerId) {
  const likeIds = (reply.likes || []).map((id) => String(id));
  return {
    id: reply._id,
    user: toUserShape(reply.user),
    text: reply.text || "",
    likesCount: likeIds.length,
    isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
  };
}

function normalizeComment(comment, viewerId) {
  const likeIds = (comment.likes || []).map((id) => String(id));
  return {
    id: comment._id,
    user: toUserShape(comment.user),
    text: comment.text || "",
    likesCount: likeIds.length,
    isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
    replies: (comment.replies || []).map((reply) => normalizeReply(reply, viewerId)),
    createdAt: comment.createdAt,
    updatedAt: comment.updatedAt,
  };
}

function normalizePost(post, viewerId) {
  const likeIds = (post.likes || []).map((id) => String(id));
  const bookmarkIds = (post.bookmarks || []).map((id) => String(id));

  return {
    id: post._id,
    author: toUserShape(post.author),
    postType: post.postType,
    text: post.text || "",
    media: post.media || [],
    hashtags: post.hashtags || [],
    taggedUsers: (post.taggedUsers || []).map((item) => ({
      user: item.user?._id || item.user || null,
      nameSnapshot: item.nameSnapshot || "",
    })),
    likesCount: likeIds.length,
    bookmarksCount: bookmarkIds.length,
    commentsCount: (post.comments || []).length,
    sharesCount: post.sharesCount || 0,
    isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
    isBookmarkedByMe: viewerId ? bookmarkIds.includes(String(viewerId)) : false,
    isMine: viewerId ? String(post.author?._id || post.author) === String(viewerId) : false,
    comments: (post.comments || []).map((comment) => normalizeComment(comment, viewerId)),
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

async function uploadBufferToCloudinary(buffer, folder = "ontrip/community", resourceType = "image") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
      },
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
    const resourceType = file.mimetype?.startsWith("video/") ? "video" : "image";
    const result = await uploadBufferToCloudinary(file.buffer, folder, resourceType);

    uploaded.push({
      url: result.secure_url,
      publicId: result.public_id,
      mediaType: resourceType === "video" ? "video" : "image",
      originalName: file.originalname || "",
    });
  }

  return uploaded;
}

async function createNotification({ receiver, sender, type, post = null, commentId = "", replyId = "", text = "" }) {
  if (!receiver) return;
  if (String(receiver) === String(sender)) return;

  await CommunityNotification.create({
    receiver,
    sender,
    type,
    post,
    commentId,
    replyId,
    text,
  });
}

export async function getCommunityFeed(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);
    const filter = String(req.query.filter || "all");
    const q = String(req.query.q || "").trim().toLowerCase();
    const viewerId = req.user?._id || null;

    const dbFilter = { isDeleted: false };

    if (filter === "questions") dbFilter.postType = "question";
    if (filter === "stories") dbFilter.postType = "story";
    if (filter === "offers") dbFilter.postType = "provider_offer";

    if (q) {
      dbFilter.$or = [
        { text: new RegExp(q, "i") },
        { hashtags: new RegExp(q, "i") },
      ];
    }

    const posts = await CommunityPost.find(dbFilter)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name email avatar city role")
      .populate("comments.replies.user", "name email avatar city role")
      .sort({ createdAt: -1 })
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
    console.error("getCommunityFeed error", error);
    return res.status(500).json({
      message: "Failed to load community feed.",
    });
  }
}

export async function createPost(req, res) {
  try {
    if (!req.user?._id) {
      return res.status(401).json({ message: "Not authorized." });
    }

    const body = req.body || {};
    const postType = String(body.postType || "post");
    const text = String(body.text || "").trim();
    const manualTags = parseTagArray(body.hashtags);
    const autoTags = extractHashtags(text);
    const hashtags = [...new Set([...manualTags, ...autoTags])];

    const taggedUsers = safeJsonParse(body.taggedUsers, [])
      .filter((item) => item?.user)
      .map((item) => ({
        user: item.user,
        nameSnapshot: item.nameSnapshot || "",
      }));

    if (!text && (!req.files || req.files.length === 0)) {
      return res.status(400).json({
        message: "Post text or media is required.",
      });
    }

    const media = await uploadMany(req.files || [], "ontrip/community/posts");

    const created = await CommunityPost.create({
      author: req.user._id,
      postType,
      text,
      media,
      hashtags,
      taggedUsers,
    });

    for (const tag of taggedUsers) {
      await createNotification({
        receiver: tag.user,
        sender: req.user._id,
        type: "tag_post",
        post: created._id,
        text: `${req.user.name} tagged you in a post.`,
      });
    }

    const post = await CommunityPost.findById(created._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name email avatar city role")
      .populate("comments.replies.user", "name email avatar city role");

    return res.status(201).json({
      message: "Post created successfully.",
      post: normalizePost(post, req.user._id),
    });
  } catch (error) {
    console.error("createPost error", error);
    return res.status(500).json({
      message: "Failed to create post.",
    });
  }
}

export async function getMyCommunityProfile(req, res) {
  try {
    const userId = req.user._id;

    const [user, followersCount, followingCount, myPosts, likedPosts, bookmarkedPosts, unreadNotifications] =
      await Promise.all([
        User.findById(userId).select("name email avatar city bio role"),
        CommunityFollow.countDocuments({ following: userId }),
        CommunityFollow.countDocuments({ follower: userId }),
        CommunityPost.find({ author: userId, isDeleted: false })
          .populate("author", "name email avatar city role")
          .populate("comments.user", "name email avatar city role")
          .populate("comments.replies.user", "name email avatar city role")
          .sort({ createdAt: -1 }),
        CommunityPost.find({ likes: userId, isDeleted: false })
          .populate("author", "name email avatar city role")
          .populate("comments.user", "name email avatar city role")
          .populate("comments.replies.user", "name email avatar city role")
          .sort({ createdAt: -1 }),
        CommunityPost.find({ bookmarks: userId, isDeleted: false })
          .populate("author", "name email avatar city role")
          .populate("comments.user", "name email avatar city role")
          .populate("comments.replies.user", "name email avatar city role")
          .sort({ createdAt: -1 }),
        CommunityNotification.countDocuments({ receiver: userId, isRead: false }),
      ]);

    return res.json({
      profile: {
        user: toUserShape(user),
        followersCount,
        followingCount,
        unreadNotifications,
      },
      myPosts: myPosts.map((post) => normalizePost(post, userId)),
      likedPosts: likedPosts.map((post) => normalizePost(post, userId)),
      bookmarkedPosts: bookmarkedPosts.map((post) => normalizePost(post, userId)),
    });
  } catch (error) {
    console.error("getMyCommunityProfile error", error);
    return res.status(500).json({
      message: "Failed to load profile.",
    });
  }
}

export async function getUserCommunityProfile(req, res) {
  try {
    const targetUserId = req.params.userId;
    const viewerId = req.user?._id || null;

    const [user, followersCount, followingCount, isFollowing, posts] = await Promise.all([
      User.findById(targetUserId).select("name email avatar city bio role"),
      CommunityFollow.countDocuments({ following: targetUserId }),
      CommunityFollow.countDocuments({ follower: targetUserId }),
      viewerId
        ? CommunityFollow.findOne({ follower: viewerId, following: targetUserId })
        : null,
      CommunityPost.find({ author: targetUserId, isDeleted: false })
        .populate("author", "name email avatar city role")
        .populate("comments.user", "name email avatar city role")
        .populate("comments.replies.user", "name email avatar city role")
        .sort({ createdAt: -1 }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.json({
      profile: {
        user: toUserShape(user),
        followersCount,
        followingCount,
        isFollowing: !!isFollowing,
      },
      posts: posts.map((post) => normalizePost(post, viewerId)),
    });
  } catch (error) {
    console.error("getUserCommunityProfile error", error);
    return res.status(500).json({
      message: "Failed to load user community profile.",
    });
  }
}

export async function toggleLikePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await CommunityPost.findById(postId).populate("author", "name email avatar city role");
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(userId));
    } else {
      post.likes.push(userId);

      await createNotification({
        receiver: post.author?._id || post.author,
        sender: userId,
        type: "like_post",
        post: post._id,
        text: `${req.user.name} liked your post.`,
      });
    }

    await post.save();

    return res.json({
      message: alreadyLiked ? "Post unliked." : "Post liked.",
      likesCount: post.likes.length,
      isLikedByMe: !alreadyLiked,
    });
  } catch (error) {
    console.error("toggleLikePost error", error);
    return res.status(500).json({
      message: "Failed to update post like.",
    });
  }
}

export async function toggleBookmarkPost(req, res) {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const alreadyBookmarked = post.bookmarks.some((id) => String(id) === String(userId));

    if (alreadyBookmarked) {
      post.bookmarks = post.bookmarks.filter((id) => String(id) !== String(userId));
    } else {
      post.bookmarks.push(userId);
    }

    await post.save();

    return res.json({
      message: alreadyBookmarked ? "Bookmark removed." : "Post bookmarked.",
      bookmarksCount: post.bookmarks.length,
      isBookmarkedByMe: !alreadyBookmarked,
    });
  } catch (error) {
    console.error("toggleBookmarkPost error", error);
    return res.status(500).json({
      message: "Failed to update bookmark.",
    });
  }
}

export async function addComment(req, res) {
  try {
    const { postId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Comment text is required." });
    }

    const post = await CommunityPost.findById(postId).populate("author", "name");
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    post.comments.push({
      user: req.user._id,
      text,
    });

    await post.save();

    await createNotification({
      receiver: post.author?._id || post.author,
      sender: req.user._id,
      type: "comment_post",
      post: post._id,
      text: `${req.user.name} commented on your post.`,
    });

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name email avatar city role")
      .populate("comments.replies.user", "name email avatar city role");

    return res.status(201).json({
      message: "Comment added.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("addComment error", error);
    return res.status(500).json({
      message: "Failed to add comment.",
    });
  }
}

export async function likeComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const userId = req.user._id;

    const post = await CommunityPost.findById(postId).populate("comments.user", "name");
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    const alreadyLiked = comment.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => String(id) !== String(userId));
    } else {
      comment.likes.push(userId);

      await createNotification({
        receiver: comment.user?._id || comment.user,
        sender: userId,
        type: "like_comment",
        post: post._id,
        commentId: String(comment._id),
        text: `${req.user.name} liked your comment.`,
      });
    }

    await post.save();

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name email avatar city role")
      .populate("comments.replies.user", "name email avatar city role");

    return res.json({
      message: alreadyLiked ? "Comment unliked." : "Comment liked.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("likeComment error", error);
    return res.status(500).json({
      message: "Failed to update comment like.",
    });
  }
}

export async function addReplyToComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Reply text is required." });
    }

    const post = await CommunityPost.findById(postId).populate("comments.user", "name");
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({ message: "Comment not found." });
    }

    comment.replies.push({
      user: req.user._id,
      text,
    });

    const latestReply = comment.replies[comment.replies.length - 1];

    await post.save();

    await createNotification({
      receiver: comment.user?._id || comment.user,
      sender: req.user._id,
      type: "reply_comment",
      post: post._id,
      commentId: String(comment._id),
      replyId: String(latestReply._id),
      text: `${req.user.name} replied to your comment.`,
    });

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city role")
      .populate("comments.user", "name email avatar city role")
      .populate("comments.replies.user", "name email avatar city role");

    return res.status(201).json({
      message: "Reply added.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("addReplyToComment error", error);
    return res.status(500).json({
      message: "Failed to add reply.",
    });
  }
}

export async function toggleFollowUser(req, res) {
  try {
    const follower = req.user._id;
    const following = req.params.userId;

    if (String(follower) === String(following)) {
      return res.status(400).json({
        message: "You cannot follow yourself.",
      });
    }

    const existing = await CommunityFollow.findOne({ follower, following });

    if (existing) {
      await CommunityFollow.findByIdAndDelete(existing._id);

      return res.json({
        message: "Unfollowed user.",
        isFollowing: false,
      });
    }

    await CommunityFollow.create({ follower, following });

    await createNotification({
      receiver: following,
      sender: follower,
      type: "follow_user",
      text: `${req.user.name} started following you.`,
    });

    return res.json({
      message: "User followed.",
      isFollowing: true,
    });
  } catch (error) {
    console.error("toggleFollowUser error", error);
    return res.status(500).json({
      message: "Failed to update follow status.",
    });
  }
}

export async function getNotifications(req, res) {
  try {
    const notifications = await CommunityNotification.find({
      receiver: req.user._id,
    })
      .populate("sender", "name email avatar city role")
      .populate("post", "text media")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      notifications: notifications.map((item) => ({
        id: item._id,
        sender: toUserShape(item.sender),
        type: item.type,
        post: item.post
          ? {
              id: item.post._id,
              text: item.post.text || "",
              media: item.post.media || [],
            }
          : null,
        commentId: item.commentId || "",
        replyId: item.replyId || "",
        text: item.text || "",
        isRead: !!item.isRead,
        createdAt: item.createdAt,
      })),
    });
  } catch (error) {
    console.error("getNotifications error", error);
    return res.status(500).json({
      message: "Failed to load notifications.",
    });
  }
}

export async function markNotificationsRead(req, res) {
  try {
    await CommunityNotification.updateMany(
      { receiver: req.user._id, isRead: false },
      { $set: { isRead: true } }
    );

    return res.json({
      message: "Notifications marked as read.",
    });
  } catch (error) {
    console.error("markNotificationsRead error", error);
    return res.status(500).json({
      message: "Failed to update notifications.",
    });
  }
}