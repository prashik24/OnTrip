import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import SocialProfile from "../models/SocialProfile.js";
import SocialPost from "../models/SocialPost.js";
import SocialNotification from "../models/SocialNotification.js";
import SocialBookmark from "../models/SocialBookmark.js";

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
  return [...new Set(matches.map((tag) => tag.replace("#", "").toLowerCase()))];
}

function slugifyUsername(input = "") {
  return String(input)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._]+/g, "")
    .slice(0, 30);
}

async function ensureUniqueUsername(base) {
  let candidate = slugifyUsername(base) || `user${Date.now()}`;
  let count = 0;

  while (true) {
    const exists = await SocialProfile.findOne({ username: candidate }).select("_id");
    if (!exists) return candidate;
    count += 1;
    candidate = `${slugifyUsername(base) || "user"}${count}`;
  }
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/social") {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

async function uploadMany(files = [], folder = "ontrip/social/posts") {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer, folder);
    uploaded.push({
      url: result.secure_url,
      publicId: result.public_id,
      type: file.mimetype?.startsWith("video/") ? "video" : "image",
    });
  }

  return uploaded;
}

async function ensureSocialProfile(user) {
  let profile = await SocialProfile.findOne({ user: user._id });

  if (!profile) {
    const username = await ensureUniqueUsername(user.name || user.email?.split("@")[0] || "user");

    profile = await SocialProfile.create({
      user: user._id,
      username,
      displayName: user.name || "",
      bio: user.bio || "",
      profileImage: user.avatar || "",
      location: user.city || "",
      followers: [],
      following: [],
      postsCount: 0,
    });

    user.socialProfileCreated = true;
    await user.save();
  }

  return profile;
}

function normalizeProfile(profile, viewerId = null) {
  const followers = profile.followers || [];
  const following = profile.following || [];

  return {
    id: profile._id,
    userId: profile.user?._id || profile.user,
    username: profile.username,
    displayName: profile.displayName,
    bio: profile.bio || "",
    profileImage: profile.profileImage || "",
    coverImage: profile.coverImage || "",
    website: profile.website || "",
    location: profile.location || "",
    followersCount: followers.length,
    followingCount: following.length,
    postsCount: profile.postsCount || 0,
    isPrivate: !!profile.isPrivate,
    isFollowing: viewerId
      ? followers.some((id) => String(id) === String(viewerId))
      : false,
  };
}

function normalizePost(post, viewerId = null, commentLimit = 3) {
  const likes = post.likes || [];
  const bookmarks = post.bookmarks || [];
  const comments = post.comments || [];

  const visibleComments = comments.slice(0, commentLimit).map((comment) => ({
    id: comment._id,
    user: comment.user
      ? {
          id: comment.user._id || comment.user.id,
          name: comment.user.name,
          avatar: comment.user.avatar || "",
          role: comment.user.role || "user",
          city: comment.user.city || "",
        }
      : null,
    text: comment.text,
    createdAt: comment.createdAt,
    likesCount: (comment.likes || []).length,
    isLikedByMe: viewerId
      ? (comment.likes || []).some((id) => String(id) === String(viewerId))
      : false,
    replies: (comment.replies || []).map((reply) => ({
      id: reply._id,
      user: reply.user
        ? {
            id: reply.user._id || reply.user.id,
            name: reply.user.name,
            avatar: reply.user.avatar || "",
            role: reply.user.role || "user",
            city: reply.user.city || "",
          }
        : null,
      text: reply.text,
      createdAt: reply.createdAt,
      likesCount: (reply.likes || []).length,
      isLikedByMe: viewerId
        ? (reply.likes || []).some((id) => String(id) === String(viewerId))
        : false,
    })),
  }));

  return {
    id: post._id,
    author: post.author
      ? {
          id: post.author._id || post.author.id,
          name: post.author.name,
          avatar: post.author.avatar || "",
          role: post.author.role || "user",
          city: post.author.city || "",
        }
      : null,
    text: post.text || "",
    media: post.media || [],
    hashtags: post.hashtags || [],
    likesCount: likes.length,
    bookmarksCount: bookmarks.length,
    commentsCount: comments.length,
    isLikedByMe: viewerId ? likes.some((id) => String(id) === String(viewerId)) : false,
    isBookmarkedByMe: viewerId
      ? bookmarks.some((id) => String(id) === String(viewerId))
      : false,
    isMine: viewerId
      ? String(post.author?._id || post.author) === String(viewerId)
      : false,
    comments: visibleComments,
    hasMoreComments: comments.length > commentLimit,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
  };
}

function normalizeNotification(item) {
  return {
    id: item._id,
    type: item.type,
    actor: item.actor
      ? {
          id: item.actor._id || item.actor.id,
          name: item.actor.name,
          avatar: item.actor.avatar || "",
        }
      : null,
    postId: item.post?._id || item.post || null,
    isRead: !!item.isRead,
    createdAt: item.createdAt,
  };
}

async function createNotification({ recipient, actor, type, post = null, commentId = null, replyId = null }) {
  if (!recipient || !actor) return;
  if (String(recipient) === String(actor)) return;

  await SocialNotification.create({
    recipient,
    actor,
    type,
    post,
    commentId,
    replyId,
  });
}

export async function createMySocialProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const profile = await ensureSocialProfile(user);

    return res.status(201).json({
      message: "Social profile ready.",
      profile: normalizeProfile(profile, req.user._id),
    });
  } catch (error) {
    console.error("createMySocialProfile error", error);
    return res.status(500).json({
      message: "Failed to create social profile.",
    });
  }
}

export async function getMySocialProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const profile = await ensureSocialProfile(user);

    return res.json({
      profile: normalizeProfile(profile, req.user._id),
    });
  } catch (error) {
    console.error("getMySocialProfile error", error);
    return res.status(500).json({
      message: "Failed to load your profile.",
    });
  }
}

export async function updateMySocialProfile(req, res) {
  try {
    const user = await User.findById(req.user._id);
    const profile = await ensureSocialProfile(user);

    const { displayName, bio, website, location, username } = req.body || {};

    if (username && String(username).trim().toLowerCase() !== profile.username) {
      const clean = slugifyUsername(username);
      if (!clean || clean.length < 3) {
        return res.status(400).json({
          message: "Username must be at least 3 valid characters.",
        });
      }

      const exists = await SocialProfile.findOne({
        username: clean,
        _id: { $ne: profile._id },
      }).select("_id");

      if (exists) {
        return res.status(400).json({
          message: "Username already taken.",
        });
      }

      profile.username = clean;
    }

    profile.displayName = String(displayName || profile.displayName || "").trim();
    profile.bio = String(bio || "").trim();
    profile.website = String(website || "").trim();
    profile.location = String(location || "").trim();

    await profile.save();

    return res.json({
      message: "Profile updated.",
      profile: normalizeProfile(profile, req.user._id),
    });
  } catch (error) {
    console.error("updateMySocialProfile error", error);
    return res.status(500).json({
      message: "Failed to update profile.",
    });
  }
}

export async function getProfileByUsername(req, res) {
  try {
    const { username } = req.params;
    const viewerId = req.user?._id || null;

    const profile = await SocialProfile.findOne({
      username: String(username).toLowerCase(),
    });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    return res.json({
      profile: normalizeProfile(profile, viewerId),
    });
  } catch (error) {
    console.error("getProfileByUsername error", error);
    return res.status(500).json({
      message: "Failed to load profile.",
    });
  }
}

export async function followUnfollowProfile(req, res) {
  try {
    const { username } = req.params;
    const me = req.user;

    const myProfile = await ensureSocialProfile(await User.findById(me._id));
    const targetProfile = await SocialProfile.findOne({
      username: String(username).toLowerCase(),
    });

    if (!targetProfile) {
      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    if (String(targetProfile.user) === String(me._id)) {
      return res.status(400).json({
        message: "You cannot follow yourself.",
      });
    }

    const alreadyFollowing = targetProfile.followers.some(
      (id) => String(id) === String(me._id)
    );

    if (alreadyFollowing) {
      targetProfile.followers = targetProfile.followers.filter(
        (id) => String(id) !== String(me._id)
      );
      myProfile.following = myProfile.following.filter(
        (id) => String(id) !== String(targetProfile.user)
      );
    } else {
      targetProfile.followers.push(me._id);
      myProfile.following.push(targetProfile.user);

      await createNotification({
        recipient: targetProfile.user,
        actor: me._id,
        type: "follow_user",
      });
    }

    await targetProfile.save();
    await myProfile.save();

    return res.json({
      message: alreadyFollowing ? "Unfollowed." : "Followed.",
      profile: normalizeProfile(targetProfile, me._id),
    });
  } catch (error) {
    console.error("followUnfollowProfile error", error);
    return res.status(500).json({
      message: "Failed to update follow.",
    });
  }
}

export async function createSocialPost(req, res) {
  try {
    const text = String(req.body.text || "").trim();
    const media = await uploadMany(req.files || [], "ontrip/social/posts");
    const hashtags = extractHashtags(text);

    if (!text && media.length === 0) {
      return res.status(400).json({
        message: "Post text or media is required.",
      });
    }

    const post = await SocialPost.create({
      author: req.user._id,
      text,
      media,
      hashtags,
      likes: [],
      bookmarks: [],
      comments: [],
    });

    await SocialProfile.updateOne(
      { user: req.user._id },
      { $inc: { postsCount: 1 } }
    );

    const populated = await SocialPost.findById(post._id)
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city");

    return res.status(201).json({
      message: "Post created.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("createSocialPost error", error);
    return res.status(500).json({
      message: "Failed to create post.",
    });
  }
}

export async function getHomeFeed(req, res) {
  try {
    const viewerId = req.user?._id || null;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);
    const q = String(req.query.q || "").trim();

    const filter = { isDeleted: false };

    if (q) {
      const tag = q.startsWith("#") ? q.slice(1).toLowerCase() : q.toLowerCase();

      filter.$or = [
        { text: new RegExp(q, "i") },
        { hashtags: tag },
      ];
    }

    const posts = await SocialPost.find(filter)
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await SocialPost.countDocuments(filter);

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
    console.error("getHomeFeed error", error);
    return res.status(500).json({
      message: "Failed to load feed.",
    });
  }
}

export async function getMyPosts(req, res) {
  try {
    const posts = await SocialPost.find({
      author: req.user._id,
      isDeleted: false,
    })
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city")
      .sort({ createdAt: -1 });

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user._id)),
    });
  } catch (error) {
    console.error("getMyPosts error", error);
    return res.status(500).json({
      message: "Failed to load my posts.",
    });
  }
}

export async function getPostsByUsername(req, res) {
  try {
    const profile = await SocialProfile.findOne({
      username: String(req.params.username).toLowerCase(),
    });

    if (!profile) {
      return res.status(404).json({
        message: "Profile not found.",
      });
    }

    const posts = await SocialPost.find({
      author: profile.user,
      isDeleted: false,
    })
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city")
      .sort({ createdAt: -1 });

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user?._id || null)),
    });
  } catch (error) {
    console.error("getPostsByUsername error", error);
    return res.status(500).json({
      message: "Failed to load profile posts.",
    });
  }
}

export async function toggleLikePost(req, res) {
  try {
    const { postId } = req.params;
    const userId = String(req.user._id);

    const post = await SocialPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const alreadyLiked = post.likes.some((id) => String(id) === userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== userId);
    } else {
      post.likes.push(req.user._id);

      await createNotification({
        recipient: post.author,
        actor: req.user._id,
        type: "like_post",
        post: post._id,
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
      message: "Failed to update like.",
    });
  }
}

export async function toggleBookmarkPost(req, res) {
  try {
    const { postId } = req.params;
    const userId = String(req.user._id);

    const post = await SocialPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const alreadyBookmarked = post.bookmarks.some((id) => String(id) === userId);

    if (alreadyBookmarked) {
      post.bookmarks = post.bookmarks.filter((id) => String(id) !== userId);
      await SocialBookmark.deleteOne({ user: req.user._id, post: post._id });
    } else {
      post.bookmarks.push(req.user._id);
      await SocialBookmark.updateOne(
        { user: req.user._id, post: post._id },
        { user: req.user._id, post: post._id },
        { upsert: true }
      );
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

export async function getBookmarkedPosts(req, res) {
  try {
    const bookmarks = await SocialBookmark.find({ user: req.user._id })
      .populate({
        path: "post",
        populate: [
          { path: "author", select: "name avatar role city" },
          { path: "comments.user", select: "name avatar role city" },
          { path: "comments.replies.user", select: "name avatar role city" },
        ],
      })
      .sort({ createdAt: -1 });

    const posts = bookmarks
      .map((item) => item.post)
      .filter((post) => post && !post.isDeleted)
      .map((post) => normalizePost(post, req.user._id));

    return res.json({ posts });
  } catch (error) {
    console.error("getBookmarkedPosts error", error);
    return res.status(500).json({
      message: "Failed to load bookmarks.",
    });
  }
}

export async function getLikedPosts(req, res) {
  try {
    const posts = await SocialPost.find({
      likes: req.user._id,
      isDeleted: false,
    })
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city")
      .sort({ createdAt: -1 });

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user._id)),
    });
  } catch (error) {
    console.error("getLikedPosts error", error);
    return res.status(500).json({
      message: "Failed to load liked posts.",
    });
  }
}

export async function addCommentToPost(req, res) {
  try {
    const { postId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required.",
      });
    }

    const post = await SocialPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    post.comments.push({
      user: req.user._id,
      text,
      likes: [],
      replies: [],
    });

    await post.save();

    const latestComment = post.comments[post.comments.length - 1];

    await createNotification({
      recipient: post.author,
      actor: req.user._id,
      type: "comment_post",
      post: post._id,
      commentId: latestComment?._id || null,
    });

    const populated = await SocialPost.findById(post._id)
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city");

    return res.status(201).json({
      message: "Comment added.",
      post: normalizePost(populated, req.user._id, populated.comments.length),
    });
  } catch (error) {
    console.error("addCommentToPost error", error);
    return res.status(500).json({
      message: "Failed to add comment.",
    });
  }
}

export async function replyToComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const text = String(req.body.text || "").trim();

    if (!text) {
      return res.status(400).json({
        message: "Reply text is required.",
      });
    }

    const post = await SocialPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found.",
      });
    }

    comment.replies.push({
      user: req.user._id,
      text,
      likes: [],
      createdAt: new Date(),
    });

    await post.save();

    const latestReply = comment.replies[comment.replies.length - 1];

    await createNotification({
      recipient: comment.user,
      actor: req.user._id,
      type: "reply_comment",
      post: post._id,
      commentId: comment._id,
      replyId: latestReply?._id || null,
    });

    const populated = await SocialPost.findById(post._id)
      .populate("author", "name avatar role city")
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city");

    return res.status(201).json({
      message: "Reply added.",
      post: normalizePost(populated, req.user._id, populated.comments.length),
    });
  } catch (error) {
    console.error("replyToComment error", error);
    return res.status(500).json({
      message: "Failed to add reply.",
    });
  }
}

export async function toggleLikeComment(req, res) {
  try {
    const { postId, commentId } = req.params;
    const userId = String(req.user._id);

    const post = await SocialPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const comment = post.comments.id(commentId);
    if (!comment) {
      return res.status(404).json({
        message: "Comment not found.",
      });
    }

    const alreadyLiked = comment.likes.some((id) => String(id) === userId);

    if (alreadyLiked) {
      comment.likes = comment.likes.filter((id) => String(id) !== userId);
    } else {
      comment.likes.push(req.user._id);

      await createNotification({
        recipient: comment.user,
        actor: req.user._id,
        type: "like_comment",
        post: post._id,
        commentId: comment._id,
      });
    }

    await post.save();

    return res.json({
      message: alreadyLiked ? "Comment unliked." : "Comment liked.",
      likesCount: comment.likes.length,
      isLikedByMe: !alreadyLiked,
    });
  } catch (error) {
    console.error("toggleLikeComment error", error);
    return res.status(500).json({
      message: "Failed to update comment like.",
    });
  }
}

export async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);

    const post = await SocialPost.findById(postId)
      .populate("comments.user", "name avatar role city")
      .populate("comments.replies.user", "name avatar role city");

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const start = (page - 1) * limit;
    const sliced = post.comments.slice(start, start + limit).map((comment) => ({
      id: comment._id,
      user: comment.user
        ? {
            id: comment.user._id || comment.user.id,
            name: comment.user.name,
            avatar: comment.user.avatar || "",
            role: comment.user.role || "user",
            city: comment.user.city || "",
          }
        : null,
      text: comment.text,
      likesCount: (comment.likes || []).length,
      isLikedByMe: (comment.likes || []).some(
        (id) => String(id) === String(req.user?._id || "")
      ),
      replies: (comment.replies || []).map((reply) => ({
        id: reply._id,
        user: reply.user
          ? {
              id: reply.user._id || reply.user.id,
              name: reply.user.name,
              avatar: reply.user.avatar || "",
              role: reply.user.role || "user",
              city: reply.user.city || "",
            }
          : null,
        text: reply.text,
        createdAt: reply.createdAt,
        likesCount: (reply.likes || []).length,
        isLikedByMe: (reply.likes || []).some(
          (id) => String(id) === String(req.user?._id || "")
        ),
      })),
      createdAt: comment.createdAt,
    }));

    return res.json({
      comments: sliced,
      pagination: {
        page,
        limit,
        total: post.comments.length,
        hasMore: page * limit < post.comments.length,
      },
    });
  } catch (error) {
    console.error("getPostComments error", error);
    return res.status(500).json({
      message: "Failed to load comments.",
    });
  }
}

export async function getNotifications(req, res) {
  try {
    const items = await SocialNotification.find({
      recipient: req.user._id,
    })
      .populate("actor", "name avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.json({
      notifications: items.map(normalizeNotification),
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
    await SocialNotification.updateMany(
      { recipient: req.user._id, isRead: false },
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

export async function searchProfilesAndPosts(req, res) {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        profiles: [],
        posts: [],
      });
    }

    const usernameQ = q.replace(/^#/, "").toLowerCase();

    const profiles = await SocialProfile.find({
      $or: [
        { username: new RegExp(usernameQ, "i") },
        { displayName: new RegExp(q, "i") },
        { bio: new RegExp(q, "i") },
      ],
    }).limit(10);

    const postFilter = q.startsWith("#")
      ? { hashtags: usernameQ, isDeleted: false }
      : {
          $or: [
            { text: new RegExp(q, "i") },
            { hashtags: usernameQ },
          ],
          isDeleted: false,
        };

    const posts = await SocialPost.find(postFilter)
      .populate("author", "name avatar role city")
      .sort({ createdAt: -1 })
      .limit(10);

    return res.json({
      profiles: profiles.map((item) => normalizeProfile(item, req.user?._id || null)),
      posts: posts.map((item) => normalizePost(item, req.user?._id || null, 0)),
    });
  } catch (error) {
    console.error("searchProfilesAndPosts error", error);
    return res.status(500).json({
      message: "Failed to search.",
    });
  }
}