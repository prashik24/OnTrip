import { Readable } from "stream";
import mongoose from "mongoose";
import cloudinary from "../config/cloudinary.js";
import CommunityPost from "../models/CommunityPost.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

function extractHashTags(text = "") {
  const matches = String(text).match(/#[a-zA-Z0-9_]+/g) || [];
  return [...new Set(matches.map((tag) => tag.replace("#", "").toLowerCase()))];
}

function extractMentionNames(text = "") {
  const matches = String(text).match(/@[a-zA-Z0-9_.-]+/g) || [];
  return [...new Set(matches.map((item) => item.replace("@", "").toLowerCase()))];
}

async function findMentionUsersByNames(names = []) {
  if (!names.length) return [];
  const regexes = names.map((name) => new RegExp(`^${name}$`, "i"));
  return User.find({
    $or: regexes.map((regex) => ({ name: regex })),
  }).select("_id name");
}

function uploadBufferToCloudinary(buffer, folder = "ontrip/community") {
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

async function uploadMany(files = [], folder = "ontrip/community") {
  const uploaded = [];

  for (const file of files) {
    const result = await uploadBufferToCloudinary(file.buffer, folder);
    const type = String(file.mimetype || "").startsWith("video/") ? "video" : "image";

    uploaded.push({
      type,
      url: result.secure_url,
      publicId: result.public_id,
    });
  }

  return uploaded;
}

function normalizeUser(user, viewerId = null) {
  if (!user) return null;

  const userId = String(user._id || user.id);
  const followers = (user.followers || []).map((id) => String(id));
  const following = (user.following || []).map((id) => String(id));

  return {
    id: userId,
    name: user.name,
    email: user.email || "",
    avatar: user.avatar || "",
    city: user.city || "",
    bio: user.bio || "",
    role: user.role || "user",
    followersCount: followers.length,
    followingCount: following.length,
    isFollowing:
      viewerId && String(viewerId) !== userId ? followers.includes(String(viewerId)) : false,
    isMe: viewerId ? String(viewerId) === userId : false,
  };
}

function buildNestedComments(comments = [], viewerId = null) {
  const map = new Map();

  const normalized = comments.map((comment) => {
    const likeIds = (comment.likes || []).map((id) => String(id));

    const item = {
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
      parentComment: comment.parentComment || null,
      likesCount: likeIds.length,
      isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
      isEdited: !!comment.isEdited,
      editedAt: comment.editedAt || null,
      createdAt: comment.createdAt,
      replies: [],
    };

    map.set(String(item.id), item);
    return item;
  });

  const root = [];

  for (const item of normalized) {
    if (item.parentComment && map.has(String(item.parentComment))) {
      map.get(String(item.parentComment)).replies.push(item);
    } else {
      root.push(item);
    }
  }

  return root;
}

function normalizePost(post, viewerId = null) {
  const likeIds = (post.likes || []).map((id) => String(id));
  const bookmarkIds = (post.bookmarks || []).map((id) => String(id));

  return {
    id: post._id,
    author: normalizeUser(post.author, viewerId),
    postType: post.postType,
    text: post.text || "",
    media: post.media || [],
    tags: post.tags || [],
    mentions: (post.mentions || []).map((id) => String(id)),
    likesCount: likeIds.length,
    bookmarksCount: bookmarkIds.length,
    commentsCount: post.comments?.length || 0,
    sharesCount: post.sharesCount || 0,
    locationText: post.locationText || "",
    isLikedByMe: viewerId ? likeIds.includes(String(viewerId)) : false,
    isBookmarkedByMe: viewerId ? bookmarkIds.includes(String(viewerId)) : false,
    isMine: viewerId ? String(post.author?._id || post.author) === String(viewerId) : false,
    createdAt: post.createdAt,
    updatedAt: post.updatedAt,
    comments: buildNestedComments(post.comments || [], viewerId),
  };
}

async function createNotification({
  userId,
  actorId = null,
  type,
  postId = null,
  commentId = null,
  text = "",
}) {
  if (!userId) return;
  if (actorId && String(userId) === String(actorId)) return;

  await Notification.create({
    user: userId,
    actor: actorId,
    type,
    post: postId,
    commentId,
    text,
  });
}

export async function getCommunityFeed(req, res) {
  try {
    const viewerId = req.user?._id || null;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all").trim();

    const filter = {
      isDeleted: false,
    };

    if (type !== "all") {
      filter.postType = type;
    }

    if (q) {
      filter.$or = [
        { text: new RegExp(q, "i") },
        { tags: new RegExp(q.replace("#", ""), "i") },
      ];

      const people = await User.find({
        name: new RegExp(q.replace("@", ""), "i"),
      }).select("_id");

      if (people.length) {
        filter.$or.push({
          author: { $in: people.map((item) => item._id) },
        });
      }
    }

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(filter);

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

export async function createCommunityPost(req, res) {
  try {
    const postType = String(req.body.postType || "post").trim();
    const text = String(req.body.text || "").trim();
    const locationText = String(req.body.locationText || "").trim();
    const files = Array.isArray(req.files) ? req.files : [];

    if (!text && files.length === 0) {
      return res.status(400).json({
        message: "Write something or upload image/video.",
      });
    }

    const uploadedMedia = await uploadMany(files, "ontrip/community/posts");
    const textTags = extractHashTags(text);
    const manualTags = String(req.body.tags || "")
      .split(",")
      .map((item) => item.trim().replace(/^#/, "").toLowerCase())
      .filter(Boolean);

    const tags = [...new Set([...textTags, ...manualTags])];

    const mentionNames = extractMentionNames(text);
    const mentionUsers = await findMentionUsersByNames(mentionNames);

    const post = await CommunityPost.create({
      author: req.user._id,
      postType,
      text,
      media: uploadedMedia,
      tags,
      mentions: mentionUsers.map((user) => user._id),
      locationText,
    });

    for (const mentionedUser of mentionUsers) {
      await createNotification({
        userId: mentionedUser._id,
        actorId: req.user._id,
        type: "mention_post",
        postId: post._id,
        text: `${req.user.name} mentioned you in a post.`,
      });
    }

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role");

    return res.status(201).json({
      message: "Post created successfully.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("createCommunityPost error", error);
    return res.status(500).json({
      message: "Failed to create post.",
    });
  }
}

export async function togglePostLike(req, res) {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId).populate(
      "author",
      "name email avatar city bio role followers following"
    );

    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const userId = String(req.user._id);
    const liked = post.likes.some((id) => String(id) === userId);

    if (liked) {
      post.likes = post.likes.filter((id) => String(id) !== userId);
    } else {
      post.likes.push(req.user._id);

      await createNotification({
        userId: post.author._id,
        actorId: req.user._id,
        type: "like_post",
        postId: post._id,
        text: `${req.user.name} liked your post.`,
      });
    }

    await post.save();

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role");

    return res.json({
      message: liked ? "Post unliked." : "Post liked.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("togglePostLike error", error);
    return res.status(500).json({
      message: "Failed to update like.",
    });
  }
}

export async function togglePostBookmark(req, res) {
  try {
    const { postId } = req.params;

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    const userId = String(req.user._id);
    const bookmarked = post.bookmarks.some((id) => String(id) === userId);

    if (bookmarked) {
      post.bookmarks = post.bookmarks.filter((id) => String(id) !== userId);
    } else {
      post.bookmarks.push(req.user._id);
    }

    await post.save();

    return res.json({
      message: bookmarked ? "Removed from bookmarks." : "Added to bookmarks.",
      bookmarksCount: post.bookmarks.length,
      isBookmarkedByMe: !bookmarked,
    });
  } catch (error) {
    console.error("togglePostBookmark error", error);
    return res.status(500).json({
      message: "Failed to update bookmark.",
    });
  }
}

export async function addPostComment(req, res) {
  try {
    const { postId } = req.params;
    const text = String(req.body.text || "").trim();
    const parentComment = req.body.parentComment || null;

    if (!text) {
      return res.status(400).json({
        message: "Comment text is required.",
      });
    }

    const post = await CommunityPost.findById(postId);
    if (!post || post.isDeleted) {
      return res.status(404).json({ message: "Post not found." });
    }

    if (
      parentComment &&
      !post.comments.some((item) => String(item._id) === String(parentComment))
    ) {
      return res.status(400).json({
        message: "Parent comment not found.",
      });
    }

    const mentionNames = extractMentionNames(text);
    const mentionUsers = await findMentionUsersByNames(mentionNames);

    post.comments.push({
      user: req.user._id,
      text,
      parentComment,
      mentions: mentionUsers.map((user) => user._id),
      likes: [],
    });

    const newComment = post.comments[post.comments.length - 1];
    await post.save();

    if (parentComment) {
      const parent = post.comments.find(
        (item) => String(item._id) === String(parentComment)
      );
      if (parent) {
        await createNotification({
          userId: parent.user,
          actorId: req.user._id,
          type: "reply_comment",
          postId: post._id,
          commentId: newComment._id,
          text: `${req.user.name} replied to your comment.`,
        });
      }
    } else {
      await createNotification({
        userId: post.author,
        actorId: req.user._id,
        type: "comment_post",
        postId: post._id,
        commentId: newComment._id,
        text: `${req.user.name} commented on your post.`,
      });
    }

    for (const mentionedUser of mentionUsers) {
      await createNotification({
        userId: mentionedUser._id,
        actorId: req.user._id,
        type: "mention_comment",
        postId: post._id,
        commentId: newComment._id,
        text: `${req.user.name} mentioned you in a comment.`,
      });
    }

    const populated = await CommunityPost.findById(post._id)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role");

    return res.status(201).json({
      message: parentComment ? "Reply added." : "Comment added.",
      post: normalizePost(populated, req.user._id),
    });
  } catch (error) {
    console.error("addPostComment error", error);
    return res.status(500).json({
      message: "Failed to add comment.",
    });
  }
}

export async function getPostComments(req, res) {
  try {
    const { postId } = req.params;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);

    const post = await CommunityPost.findById(postId).populate(
      "comments.user",
      "name avatar city role"
    );

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const rootComments = (post.comments || []).filter((item) => !item.parentComment);
    const start = (page - 1) * limit;
    const pagedRoot = rootComments.slice(start, start + limit);

    const allowedRootIds = new Set(pagedRoot.map((item) => String(item._id)));
    const relatedReplies = [];
    const allComments = post.comments || [];

    const collectReplies = (parentIds) => {
      const nextParentIds = [];

      for (const item of allComments) {
        if (item.parentComment && parentIds.has(String(item.parentComment))) {
          const alreadyAdded = relatedReplies.some(
            (reply) => String(reply._id) === String(item._id)
          );
          if (!alreadyAdded) {
            relatedReplies.push(item);
            nextParentIds.push(String(item._id));
          }
        }
      }

      if (nextParentIds.length) {
        collectReplies(new Set(nextParentIds));
      }
    };

    collectReplies(allowedRootIds);

    const combined = [...pagedRoot, ...relatedReplies];
    const nested = buildNestedComments(combined, req.user?._id || null);

    return res.json({
      comments: nested,
      pagination: {
        page,
        limit,
        total: rootComments.length,
        hasMore: page * limit < rootComments.length,
      },
    });
  } catch (error) {
    console.error("getPostComments error", error);
    return res.status(500).json({
      message: "Failed to load comments.",
    });
  }
}

export async function getCommentReplies(req, res) {
  try {
    const { postId, commentId } = req.params;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 5), 1), 20);

    const post = await CommunityPost.findById(postId).populate(
      "comments.user",
      "name avatar city role"
    );

    if (!post || post.isDeleted) {
      return res.status(404).json({
        message: "Post not found.",
      });
    }

    const allComments = post.comments || [];
    const directReplies = allComments.filter(
      (item) => String(item.parentComment) === String(commentId)
    );

    const start = (page - 1) * limit;
    const pagedDirectReplies = directReplies.slice(start, start + limit);

    const selectedReplyIds = new Set(pagedDirectReplies.map((item) => String(item._id)));
    const nestedReplies = [];

    const collectNestedReplies = (parentIds) => {
      const nextParentIds = [];

      for (const item of allComments) {
        if (item.parentComment && parentIds.has(String(item.parentComment))) {
          const alreadyAdded = nestedReplies.some(
            (reply) => String(reply._id) === String(item._id)
          );
          if (!alreadyAdded) {
            nestedReplies.push(item);
            nextParentIds.push(String(item._id));
          }
        }
      }

      if (nextParentIds.length) {
        collectNestedReplies(new Set(nextParentIds));
      }
    };

    collectNestedReplies(selectedReplyIds);

    const combined = [...pagedDirectReplies, ...nestedReplies];
    const nested = buildNestedComments(combined, req.user?._id || null);

    return res.json({
      replies: nested,
      pagination: {
        page,
        limit,
        total: directReplies.length,
        hasMore: page * limit < directReplies.length,
      },
    });
  } catch (error) {
    console.error("getCommentReplies error", error);
    return res.status(500).json({
      message: "Failed to load replies.",
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
      return res.status(404).json({
        message: "Post not found.",
      });
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

export async function getMyPosts(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);

    const filter = {
      author: req.user._id,
      isDeleted: false,
    };

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(filter);

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user._id)),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getMyPosts error", error);
    return res.status(500).json({
      message: "Failed to load your posts.",
    });
  }
}

export async function getBookmarkedPosts(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);

    const filter = {
      bookmarks: req.user._id,
      isDeleted: false,
    };

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(filter);

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user._id)),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getBookmarkedPosts error", error);
    return res.status(500).json({
      message: "Failed to load bookmarks.",
    });
  }
}

export async function getLikedPosts(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);

    const filter = {
      likes: req.user._id,
      isDeleted: false,
    };

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(filter);

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user._id)),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getLikedPosts error", error);
    return res.status(500).json({
      message: "Failed to load liked posts.",
    });
  }
}

export async function getNotifications(req, res) {
  try {
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 15), 1), 30);

    const items = await Notification.find({ user: req.user._id })
      .populate("actor", "name avatar city role")
      .populate({
        path: "post",
        select:
          "author postType text media tags likes bookmarks comments locationText createdAt",
        populate: {
          path: "author",
          select: "name email avatar city bio role followers following",
        },
      })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Notification.countDocuments({ user: req.user._id });

    return res.json({
      notifications: items.map((item) => {
        let commentText = "";
        let parentCommentText = "";

        if (item.post && item.commentId && Array.isArray(item.post.comments)) {
          const matchedComment =
            item.post.comments.id?.(item.commentId) ||
            item.post.comments.find(
              (comment) => String(comment._id) === String(item.commentId)
            );

          if (matchedComment) {
            commentText = matchedComment.text || "";

            if (matchedComment.parentComment) {
              const parentComment =
                item.post.comments.id?.(matchedComment.parentComment) ||
                item.post.comments.find(
                  (comment) =>
                    String(comment._id) === String(matchedComment.parentComment)
                );

              if (parentComment) {
                parentCommentText = parentComment.text || "";
              }
            }
          }
        }

        return {
          id: item._id,
          type: item.type,
          text: item.text,
          isRead: item.isRead,
          post: item.post
            ? {
                id: item.post._id,
                author: item.post.author
                  ? {
                      id: item.post.author._id,
                      name: item.post.author.name,
                      email: item.post.author.email || "",
                      avatar: item.post.author.avatar || "",
                      city: item.post.author.city || "",
                      bio: item.post.author.bio || "",
                      role: item.post.author.role || "user",
                    }
                  : null,
                postType: item.post.postType || "post",
                text: item.post.text || "",
                media: item.post.media || [],
                tags: item.post.tags || [],
                locationText: item.post.locationText || "",
                likesCount: Array.isArray(item.post.likes) ? item.post.likes.length : 0,
                bookmarksCount: Array.isArray(item.post.bookmarks)
                  ? item.post.bookmarks.length
                  : 0,
                commentsCount: Array.isArray(item.post.comments)
                  ? item.post.comments.length
                  : 0,
                createdAt: item.post.createdAt || item.createdAt,
              }
            : null,
          commentId: item.commentId || null,
          commentText,
          parentCommentText,
          actor: item.actor
            ? {
                id: item.actor._id,
                name: item.actor.name,
                avatar: item.actor.avatar || "",
                city: item.actor.city || "",
                role: item.actor.role || "user",
              }
            : null,
          createdAt: item.createdAt,
        };
      }),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
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
    await Notification.updateMany(
      { user: req.user._id, isRead: false },
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

export async function getUserProfile(req, res) {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        message: "Invalid user id.",
      });
    }

    const user = await User.findById(userId).select(
      "name email avatar city bio role followers following"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const postsCount = await CommunityPost.countDocuments({
      author: user._id,
      isDeleted: false,
    });

    return res.json({
      profile: {
        ...normalizeUser(user, req.user?._id || null),
        postsCount,
      },
    });
  } catch (error) {
    console.error("getUserProfile error", error);
    return res.status(500).json({
      message: "Failed to load profile.",
    });
  }
}

export async function getUserPosts(req, res) {
  try {
    const { userId } = req.params;
    const page = Math.max(Number(req.query.page || 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit || 10), 1), 20);

    const filter = {
      author: userId,
      isDeleted: false,
    };

    const posts = await CommunityPost.find(filter)
      .populate("author", "name email avatar city bio role followers following")
      .populate("comments.user", "name avatar city role")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await CommunityPost.countDocuments(filter);

    return res.json({
      posts: posts.map((post) => normalizePost(post, req.user?._id || null)),
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    });
  } catch (error) {
    console.error("getUserPosts error", error);
    return res.status(500).json({
      message: "Failed to load user posts.",
    });
  }
}

export async function toggleFollowUser(req, res) {
  try {
    const { userId } = req.params;

    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({
        message: "You cannot follow yourself.",
      });
    }

    const target = await User.findById(userId);
    const me = await User.findById(req.user._id);

    if (!target || !me) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    const alreadyFollowing = me.following.some(
      (id) => String(id) === String(target._id)
    );

    if (alreadyFollowing) {
      me.following = me.following.filter(
        (id) => String(id) !== String(target._id)
      );
      target.followers = target.followers.filter(
        (id) => String(id) !== String(me._id)
      );
    } else {
      me.following.push(target._id);
      target.followers.push(me._id);

      await createNotification({
        userId: target._id,
        actorId: me._id,
        type: "follow_user",
        text: `${me.name} started following you.`,
      });
    }

    await me.save();
    await target.save();

    return res.json({
      message: alreadyFollowing ? "User unfollowed." : "User followed.",
      profile: {
        ...normalizeUser(target, req.user._id),
        postsCount: await CommunityPost.countDocuments({
          author: target._id,
          isDeleted: false,
        }),
      },
    });
  } catch (error) {
    console.error("toggleFollowUser error", error);
    return res.status(500).json({
      message: "Failed to update follow status.",
    });
  }
}

export async function searchPeopleAndTags(req, res) {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.json({
        people: [],
        hashtags: [],
      });
    }

    const people = await User.find({
      $or: [
        { name: new RegExp(q.replace("@", ""), "i") },
        { city: new RegExp(q, "i") },
      ],
    })
      .select("name email avatar city bio role followers following")
      .limit(8);

    const tagPosts = await CommunityPost.find({
      tags: new RegExp(q.replace("#", ""), "i"),
      isDeleted: false,
    })
      .select("tags")
      .limit(30);

    const tagMap = new Map();
    for (const post of tagPosts) {
      for (const tag of post.tags || []) {
        if (tag.toLowerCase().includes(q.replace("#", "").toLowerCase())) {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        }
      }
    }

    return res.json({
      people: people.map((user) => normalizeUser(user, req.user?._id || null)),
      hashtags: [...tagMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count })),
    });
  } catch (error) {
    console.error("searchPeopleAndTags error", error);
    return res.status(500).json({
      message: "Failed to search.",
    });
  }
}