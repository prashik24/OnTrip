import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import { disconnectSocket, getSocket } from "../lib/socket";
import CustomSelect from "../components/CustomSelect";
import LoadingSpinner from "../components/LoadingSpinner";
import "./Chat.css";

function formatLastSeen(value) {
  if (!value) return "Offline";
  const date = new Date(value);
  return `Last seen ${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function formatMessageTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getPreviewLabel(item) {
  if (!item) return "";
  if (item.lastMessageType === "image") return "📷 Image";
  if (item.lastMessageType === "video") return "🎥 Video";
  if (item.lastMessageType === "file") return "📎 File";
  if (item.lastMessageType === "listing_card") return "📌 Listing";
  if (item.lastMessageType === "system") return item.lastMessageText || "System update";
  return item.lastMessageText || "Start chatting";
}

function isNearBottom(element, threshold = 120) {
  if (!element) return true;
  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceFromBottom <= threshold;
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function getDateSeparatorLabel(dateValue) {
  const date = new Date(dateValue);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function buildMessageItems(messages) {
  const items = [];
  let lastDateLabel = "";

  for (const msg of messages) {
    const label = getDateSeparatorLabel(msg.createdAt);
    if (label !== lastDateLabel) {
      items.push({
        type: "separator",
        id: `sep-${label}-${msg.id}`,
        label,
      });
      lastDateLabel = label;
    }

    items.push({
      type: "message",
      id: msg.id,
      message: msg,
    });
  }

  return items;
}

function getConversationDisplayName(conversation) {
  if (!conversation) return "Chat";
  if (conversation.conversationType === "group") {
    return conversation.groupName || "Group";
  }
  return conversation.otherUser?.name || "User";
}

function getConversationDisplayAvatar(conversation) {
  if (!conversation) return "";
  if (conversation.conversationType === "group") {
    return conversation.groupAvatar || "";
  }
  return conversation.otherUser?.avatar || "";
}

function getConversationPresenceText(conversation) {
  if (!conversation) return "";
  if (conversation.conversationType === "group") {
    return `${conversation.participants?.length || 0} members`;
  }

  if (conversation.otherUser?.isOnline) return "Online";
  return formatLastSeen(conversation.otherUser?.lastSeenAt);
}

function getGroupBadgeLabel(name = "") {
  const text = String(name || "").toLowerCase();
  if (text.includes("trip")) return "T";
  return "G";
}

export default function Chat() {
  const user = getUser();
  const location = useLocation();
  const navigate = useNavigate();

  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editText, setEditText] = useState("");

  const [users, setUsers] = useState([]);
  const [recentConversations, setRecentConversations] = useState([]);
  const [groupConversations, setGroupConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [userSearch, setUserSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");

  const [myProviders, setMyProviders] = useState([]);
  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);

  const activeOtherUser = useMemo(() => {
    return activeConversation?.otherUser || null;
  }, [activeConversation]);

  const messageItems = useMemo(() => buildMessageItems(messages), [messages]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((item) => {
      const bag = `${item.name} ${item.email} ${item.city} ${item.role}`.toLowerCase();
      return bag.includes(q);
    });
  }, [users, userSearch]);

  const filteredGroups = useMemo(() => {
    const q = groupSearch.trim().toLowerCase();
    const source = [...groupConversations].sort((a, b) => {
      const aDate = a.lastMessageAt || a.createdAt;
      const bDate = b.lastMessageAt || b.createdAt;
      return new Date(bDate || 0) - new Date(aDate || 0);
    });

    if (!q) return source;

    return source.filter((item) => {
      const members = (item.participants || []).map((p) => p.name).join(" ");
      const bag = `${item.groupName || ""} ${item.groupDescription || ""} ${members}`.toLowerCase();
      return bag.includes(q);
    });
  }, [groupConversations, groupSearch]);

  const selectedProvider = useMemo(() => {
    return myProviders.find((item) => String(item._id) === String(selectedProviderId)) || null;
  }, [myProviders, selectedProviderId]);

  const allRecentAndGroups = useMemo(() => {
    return [...recentConversations, ...groupConversations];
  }, [recentConversations, groupConversations]);

  useEffect(() => {
    if (!isLoggedIn()) {
      navigate("/login");
    }
  }, [navigate]);

  useEffect(() => {
    if (!isLoggedIn()) return;

    async function init() {
      try {
        setLoading(true);
        setError("");

        const requests = [
          apiFetch("/api/chat/users"),
          apiFetch("/api/chat/conversations"),
        ];

        if (user?.role === "provider") {
          requests.push(apiFetch("/api/providers/mine"));
        }

        const results = await Promise.all(requests);
        const userRes = results[0];
        const convRes = results[1];
        const providerRes = results[2];

        setUsers(userRes.users || []);
        setRecentConversations(convRes.recentConversations || []);
        setGroupConversations(convRes.groupConversations || []);
        setMyProviders(providerRes?.providers || []);

        const params = new URLSearchParams(location.search);
        const queryConversation = params.get("conversation");
        const queryUser = params.get("user");

        if (queryConversation) {
          const allConversations = [
            ...(convRes.recentConversations || []),
            ...(convRes.groupConversations || []),
          ];

          const found = allConversations.find(
            (item) => String(item.id) === String(queryConversation)
          );

          if (found) {
            await openConversation(found);
            return;
          }
        }

        if (queryUser) {
          const openRes = await apiFetch("/api/chat/conversations/open", {
            method: "POST",
            body: JSON.stringify({ userId: queryUser }),
          });

          const conversation = openRes.conversation;

          setRecentConversations((prev) => {
            const exists = prev.some(
              (item) => String(item.id) === String(conversation.id)
            );
            if (exists) {
              return prev.map((item) =>
                String(item.id) === String(conversation.id) ? conversation : item
              );
            }
            return [conversation, ...prev];
          });

          await openConversation(conversation);
          return;
        }

        const firstRealConversation = (convRes.recentConversations || [])[0];
        const firstGroupConversation = (convRes.groupConversations || [])[0];

        if (firstRealConversation) {
          await openConversation(firstRealConversation);
        } else if (firstGroupConversation) {
          await openConversation(firstGroupConversation);
        }
      } catch (err) {
        setError(err.message || "Failed to load chat");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [location.search, navigate, user?.role]);

  useEffect(() => {
    if (!isLoggedIn()) return;

    const socket = getSocket();

    socket.on("connect_error", (err) => {
      setError(err.message || "Socket connection failed");
    });

    socket.on("presence:update", ({ userId, isOnline, lastSeenAt }) => {
      setUsers((prev) =>
        prev.map((item) =>
          String(item.id) === String(userId)
            ? { ...item, isOnline, lastSeenAt }
            : item
        )
      );

      setRecentConversations((prev) =>
        prev.map((item) =>
          String(item.otherUser?.id) === String(userId)
            ? {
                ...item,
                otherUser: {
                  ...item.otherUser,
                  isOnline,
                  lastSeenAt,
                },
              }
            : item
        )
      );

      setGroupConversations((prev) =>
        prev.map((item) => ({
          ...item,
          participants: (item.participants || []).map((p) =>
            String(p.id || p._id) === String(userId)
              ? { ...p, isOnline, lastSeenAt }
              : p
          ),
        }))
      );

      setActiveConversation((prev) => {
        if (!prev) return prev;

        if (prev.conversationType === "group") {
          return {
            ...prev,
            participants: (prev.participants || []).map((p) =>
              String(p.id || p._id) === String(userId)
                ? { ...p, isOnline, lastSeenAt }
                : p
            ),
          };
        }

        if (String(prev.otherUser?.id) !== String(userId)) return prev;
        return {
          ...prev,
          otherUser: {
            ...prev.otherUser,
            isOnline,
            lastSeenAt,
          },
        };
      });
    });

    socket.on("message:new", ({ conversation, message }) => {
      const openedConversationId = activeConversation?.id
        ? String(activeConversation.id)
        : "";

      const incomingConversationId = String(conversation.id);
      const isCurrentConversation =
        openedConversationId && openedConversationId === incomingConversationId;

      const msgSenderId = String(
        message.sender?._id || message.sender?.id || message.sender
      );
      const isMyMessage = String(msgSenderId) === String(user?.id);

      if (isCurrentConversation) {
        const container = messagesRef.current;
        if (container) {
          shouldStickToBottomRef.current =
            isMyMessage || isNearBottom(container, 160);
        }
      }

      if (!isCurrentConversation && !isMyMessage) {
        setUnreadCounts((prev) => ({
          ...prev,
          [incomingConversationId]: (prev[incomingConversationId] || 0) + 1,
        }));
      }

      if (conversation.conversationType === "group") {
        setGroupConversations((prev) => {
          const withoutCurrent = prev.filter(
            (item) => String(item.id) !== incomingConversationId
          );
          return [conversation, ...withoutCurrent];
        });
      } else {
        setRecentConversations((prev) => {
          const withoutCurrent = prev.filter(
            (item) => String(item.id) !== incomingConversationId
          );
          return [conversation, ...withoutCurrent];
        });

        setUsers((prev) =>
          prev.map((item) =>
            String(item.id) === String(conversation.otherUser?.id)
              ? { ...item, conversationId: conversation.id }
              : item
          )
        );
      }

      setActiveConversation((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== incomingConversationId) return prev;
        return conversation;
      });

      setMessages((prev) => {
        if (!isCurrentConversation) return prev;
        if (prev.some((m) => String(m.id) === String(message.id))) {
          return prev;
        }
        return [...prev, message];
      });
    });

    socket.on("message:updated", ({ message }) => {
      setMessages((prev) =>
        prev.map((item) => (String(item.id) === String(message.id) ? message : item))
      );
    });

    socket.on("typing:update", ({ conversationId, userId, isTyping }) => {
      if (!activeConversation || String(activeConversation.id) !== String(conversationId)) {
        return;
      }
      if (String(userId) === String(user?.id)) return;

      setTypingUsers((prev) => ({
        ...prev,
        [userId]: isTyping,
      }));
    });

    socket.on("conversation:seen", ({ conversationId, seenByUserId }) => {
      if (!activeConversation || String(activeConversation.id) !== String(conversationId)) {
        return;
      }

      setMessages((prev) =>
        prev.map((msg) => {
          if (!Array.isArray(msg.seenBy)) return msg;
          if (msg.seenBy.some((id) => String(id) === String(seenByUserId))) return msg;
          return { ...msg, seenBy: [...msg.seenBy, seenByUserId] };
        })
      );
    });

    return () => {
      socket.off("connect_error");
      socket.off("presence:update");
      socket.off("message:new");
      socket.off("message:updated");
      socket.off("typing:update");
      socket.off("conversation:seen");
      disconnectSocket();
    };
  }, [activeConversation, user?.id]);

  useEffect(() => {
    if (!messagesRef.current) return;
    if (!shouldStickToBottomRef.current) return;

    messagesRef.current.scrollTo({
      top: messagesRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function handleMessagesScroll() {
    const container = messagesRef.current;
    if (!container) return;
    shouldStickToBottomRef.current = isNearBottom(container, 120);
  }

  async function openConversation(conversation) {
    try {
      setLoadingMessages(true);
      setError("");
      setMenuOpenId("");
      setEditingMessageId("");
      setEditText("");
      setReplyingTo(null);

      const socket = getSocket();

      if (activeConversation?.id) {
        socket.emit("conversation:leave", { conversationId: activeConversation.id });
      }

      setActiveConversation(conversation);
      setTypingUsers({});
      shouldStickToBottomRef.current = true;

      setUnreadCounts((prev) => {
        const next = { ...prev };
        delete next[String(conversation.id)];
        return next;
      });

      socket.emit("conversation:join", { conversationId: conversation.id });

      const data = await apiFetch(
        `/api/chat/conversations/${conversation.id}/messages?limit=50&page=1`
      );

      setMessages(data.messages || []);

      await apiFetch(`/api/chat/conversations/${conversation.id}/seen`, {
        method: "POST",
      });

      requestAnimationFrame(() => {
        if (messagesRef.current) {
          messagesRef.current.scrollTo({
            top: messagesRef.current.scrollHeight,
            behavior: "auto",
          });
        }
      });
    } catch (err) {
      setError(err.message || "Failed to open conversation");
    } finally {
      setLoadingMessages(false);
    }
  }

  async function openChatWithUser(userId) {
    try {
      setError("");

      const res = await apiFetch("/api/chat/conversations/open", {
        method: "POST",
        body: JSON.stringify({ userId }),
      });

      const conversation = res.conversation;

      setRecentConversations((prev) => {
        const exists = prev.some((item) => String(item.id) === String(conversation.id));
        if (exists) {
          return prev.map((item) =>
            String(item.id) === String(conversation.id) ? conversation : item
          );
        }
        return [conversation, ...prev];
      });

      await openConversation(conversation);
      navigate(`/chat?conversation=${conversation.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to open chat");
    }
  }

  async function handleCreateGroup(groupType = "group") {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedGroupUsers.length < 2) {
      setError("Select at least 2 users for a group");
      return;
    }

    try {
      setError("");

      const finalName =
        groupType === "trip_buddy" && !groupName.toLowerCase().includes("trip")
          ? `${groupName} Trip Buddy`
          : groupName;

      const res = await apiFetch("/api/chat/conversations/group", {
        method: "POST",
        body: JSON.stringify({
          groupName: finalName.trim(),
          groupDescription:
            groupType === "trip_buddy"
              ? groupDescription.trim() || "Trip Buddy Group"
              : groupDescription.trim(),
          participantIds: selectedGroupUsers,
        }),
      });

      setGroupConversations((prev) => [res.conversation, ...prev]);
      setShowGroupModal(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupUsers([]);

      await openConversation(res.conversation);
      navigate(`/chat?conversation=${res.conversation.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create group");
    }
  }

  async function handleSend() {
    if (!activeConversation || (!text.trim() && !selectedFile)) return;

    try {
      setSending(true);
      setError("");
      shouldStickToBottomRef.current = true;

      const formData = new FormData();
      formData.append("conversationId", activeConversation.id);

      if (activeConversation.otherUser?.id) {
        formData.append("receiverId", activeConversation.otherUser.id);
      }

      formData.append("text", text.trim());

      if (replyingTo?.id) {
        formData.append("replyToMessageId", replyingTo.id);
      }

      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const res = await apiFetch("/api/chat/messages", {
        method: "POST",
        body: formData,
      });

      setMessages((prev) => {
        const exists = prev.some((item) => String(item.id) === String(res.data.id));
        if (exists) return prev;
        return [...prev, res.data];
      });

      if (res.conversation.conversationType === "group") {
        setGroupConversations((prev) => {
          const updated = prev.map((item) =>
            String(item.id) === String(res.conversation.id) ? res.conversation : item
          );
          updated.sort((a, b) => {
            const aDate = a.lastMessageAt || a.createdAt;
            const bDate = b.lastMessageAt || b.createdAt;
            return new Date(bDate) - new Date(aDate);
          });
          return updated;
        });
      } else {
        setRecentConversations((prev) => {
          const existing = prev.some((item) => String(item.id) === String(res.conversation.id));
          const updated = existing
            ? prev.map((item) =>
                String(item.id) === String(res.conversation.id) ? res.conversation : item
              )
            : [res.conversation, ...prev];

          updated.sort(
            (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
          );
          return updated;
        });
      }

      setActiveConversation((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(res.conversation.id)) return prev;
        return res.conversation;
      });

      setText("");
      setSelectedFile(null);
      setReplyingTo(null);

      const socket = getSocket();
      socket.emit("typing:stop", { conversationId: activeConversation.id });
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  }

  async function handleSaveEdit() {
    if (!editingMessageId || !editText.trim()) return;

    try {
      setError("");

      const res = await apiFetch(`/api/chat/messages/${editingMessageId}`, {
        method: "PUT",
        body: JSON.stringify({ text: editText.trim() }),
      });

      setMessages((prev) =>
        prev.map((item) =>
          String(item.id) === String(editingMessageId) ? res.data : item
        )
      );

      setEditingMessageId("");
      setEditText("");
      setMenuOpenId("");
    } catch (err) {
      setError(err.message || "Failed to edit message");
    }
  }

  async function handleDeleteForMe(messageId) {
    try {
      setError("");
      await apiFetch(`/api/chat/messages/${messageId}/delete-for-me`, {
        method: "DELETE",
      });

      setMessages((prev) => prev.filter((item) => String(item.id) !== String(messageId)));
      setMenuOpenId("");
    } catch (err) {
      setError(err.message || "Failed to delete message");
    }
  }

  async function handleForwardMessage(messageId) {
    if (!allRecentAndGroups.length) return;

    const options = allRecentAndGroups
      .map((item) => `${item.id} — ${getConversationDisplayName(item)}`)
      .join("\n");

    const targetConversationId = window.prompt(
      `Enter target conversation id:\n\n${options}`
    );

    if (!targetConversationId?.trim()) return;

    try {
      setError("");

      await apiFetch(`/api/chat/messages/${messageId}/forward`, {
        method: "POST",
        body: JSON.stringify({
          targetConversationId: targetConversationId.trim(),
        }),
      });

      setMenuOpenId("");
    } catch (err) {
      setError(err.message || "Failed to forward message");
    }
  }

  async function handleClearChat() {
    if (!activeConversation?.id) return;

    const ok = window.confirm("Clear this chat for you?");
    if (!ok) return;

    try {
      setError("");

      await apiFetch(`/api/chat/conversations/${activeConversation.id}/clear`, {
        method: "DELETE",
      });

      setMessages([]);

      if (activeConversation.conversationType === "group") {
        setGroupConversations((prev) =>
          prev.filter((item) => String(item.id) !== String(activeConversation.id))
        );
      } else {
        setRecentConversations((prev) =>
          prev.filter((item) => String(item.id) !== String(activeConversation.id))
        );
      }

      setActiveConversation(null);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to clear chat");
    }
  }

  async function handleSendListingCard() {
    if (!activeConversation?.id || !selectedProviderId) return;

    try {
      setError("");

      await apiFetch("/api/chat/provider/send-listing-card", {
        method: "POST",
        body: JSON.stringify({
          conversationId: activeConversation.id,
          providerId: selectedProviderId,
          planIndex: selectedPlanIndex,
          vehicleIndex: selectedVehicleIndex,
        }),
      });

      setShowListingModal(false);
      setSelectedProviderId("");
      setSelectedPlanIndex(0);
      setSelectedVehicleIndex(0);
    } catch (err) {
      setError(err.message || "Failed to send listing card");
    }
  }

  async function handleBroadcastUpdate() {
    if (!selectedProviderId || !broadcastText.trim()) return;

    try {
      setError("");

      await apiFetch("/api/chat/provider/broadcast", {
        method: "POST",
        body: JSON.stringify({
          providerId: selectedProviderId,
          text: broadcastText.trim(),
        }),
      });

      setShowBroadcastModal(false);
      setBroadcastText("");
      setSelectedProviderId("");
    } catch (err) {
      setError(err.message || "Failed to broadcast update");
    }
  }

  function handleInputChange(value) {
    setText(value);

    if (!activeConversation) return;
    const socket = getSocket();

    if (value.trim()) {
      socket.emit("typing:start", { conversationId: activeConversation.id });
    } else {
      socket.emit("typing:stop", { conversationId: activeConversation.id });
    }
  }

  function getReplyPreviewText(item) {
    if (!item) return "";
    if (item.messageType === "image") return "📷 Image";
    if (item.messageType === "video") return "🎥 Video";
    if (item.messageType === "file") return "📎 File";
    if (item.messageType === "listing_card") return "📌 Listing";
    return item.text || "Message";
  }

  function toggleGroupUser(userId) {
    setSelectedGroupUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => String(id) !== String(userId))
        : [...prev, userId]
    );
  }

  const canShowProviderTools =
    user?.role === "provider" &&
    myProviders.length > 0 &&
    activeConversation &&
    activeConversation.conversationType === "direct";

  if (!isLoggedIn()) return null;

  return (
    <div className="container chatPage">
      {error ? <div className="chatAlert">{error}</div> : null}

      <div className="chatLayout">
        <aside className="chatSidebar">
          <div className="chatSidebarCard">
            <div className="chatSidebarHead">
              <h2>Chats</h2>
              <p>Conversations, groups and users</p>
            </div>

            <div className="chatSidebarTopActions">
              <button className="chatMiniActionBtn" onClick={() => setShowGroupModal(true)}>
                + Create Group
              </button>

              <button
                className="chatMiniActionBtn"
                onClick={() => {
                  setShowGroupModal(true);
                  setGroupDescription("Trip Buddy Group");
                }}
              >
                + Trip Buddy Group
              </button>
            </div>

            <div className="chatSidebarScroll noScrollbar">
              <div className="chatSidebarSection">
                <div className="chatSectionLabel">Recent Conversations</div>

                <div className="chatConversationList">
                  {recentConversations.length === 0 ? (
                    <div className="chatEmptyCard">No recent chats yet.</div>
                  ) : (
                    recentConversations.map((item) => (
                      <button
                        key={item.id}
                        className={`chatConversationItem ${
                          activeConversation?.id === item.id ? "active" : ""
                        }`}
                        onClick={() => openConversation(item)}
                      >
                        <div className="chatAvatarWrap">
                          {item.otherUser?.avatar ? (
                            <img
                              src={item.otherUser.avatar}
                              alt={item.otherUser.name}
                              className="chatAvatar"
                            />
                          ) : (
                            <div className="chatAvatarFallback">
                              {item.otherUser?.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          )}

                          <span
                            className={`chatPresenceDot ${
                              item.otherUser?.isOnline ? "online" : "offline"
                            }`}
                          />
                        </div>

                        <div className="chatConversationBody">
                          <div className="chatConversationTop">
                            <strong>{item.otherUser?.name || "User"}</strong>

                            <div className="chatConversationTopRight">
                              <span>{formatMessageTime(item.lastMessageAt)}</span>
                              {unreadCounts[String(item.id)] ? (
                                <span className="chatUnreadBadge">
                                  {unreadCounts[String(item.id)]}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="chatConversationPreview">
                            {getPreviewLabel(item)}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="chatSidebarSection">
                <div className="chatSectionLabel">Groups & Trip Buddy Groups</div>

                <input
                  className="chatSearch"
                  placeholder="Search groups..."
                  value={groupSearch}
                  onChange={(e) => setGroupSearch(e.target.value)}
                />

                <div className="chatGroupList">
                  {filteredGroups.length === 0 ? (
                    <div className="chatEmptyCard">No groups yet.</div>
                  ) : (
                    filteredGroups.map((item) => (
                      <button
                        key={item.id}
                        className={`chatConversationItem ${
                          activeConversation?.id === item.id ? "active" : ""
                        }`}
                        onClick={() => openConversation(item)}
                      >
                        <div className="chatAvatarWrap">
                          {item.groupAvatar ? (
                            <img
                              src={item.groupAvatar}
                              alt={item.groupName || "Group"}
                              className="chatAvatar"
                            />
                          ) : (
                            <div className="chatAvatarFallback">
                              {(item.groupName || "G").charAt(0).toUpperCase()}
                            </div>
                          )}

                          <span className="chatGroupBadge">
                            {getGroupBadgeLabel(item.groupName)}
                          </span>
                        </div>

                        <div className="chatConversationBody">
                          <div className="chatConversationTop">
                            <strong>{item.groupName || "Group"}</strong>

                            <div className="chatConversationTopRight">
                              {item.lastMessageAt ? (
                                <span>{formatMessageTime(item.lastMessageAt)}</span>
                              ) : (
                                <span>New</span>
                              )}

                              {unreadCounts[String(item.id)] ? (
                                <span className="chatUnreadBadge">
                                  {unreadCounts[String(item.id)]}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="chatConversationPreview">
                            {item.lastMessageAt
                              ? getPreviewLabel(item)
                              : `You are added • ${item.participants?.length || 0} members`}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              <div className="chatSidebarSection">
                <div className="chatSectionLabel">All Users</div>

                <input
                  className="chatSearch"
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />

                <div className="chatUserList">
                  {filteredUsers.length === 0 ? (
                    <div className="chatEmptyCard">No users found.</div>
                  ) : (
                    filteredUsers.map((item) => (
                      <button
                        key={item.id}
                        className="chatUserItem"
                        onClick={() => openChatWithUser(item.id)}
                      >
                        <div className="chatAvatarWrap">
                          {item.avatar ? (
                            <img src={item.avatar} alt={item.name} className="chatAvatar" />
                          ) : (
                            <div className="chatAvatarFallback">
                              {item.name?.charAt(0)?.toUpperCase() || "U"}
                            </div>
                          )}
                          <span
                            className={`chatPresenceDot ${item.isOnline ? "online" : "offline"}`}
                          />
                        </div>

                        <div className="chatUserBody">
                          <strong>{item.name}</strong>
                          <span>
                            {item.isOnline ? "Online" : formatLastSeen(item.lastSeenAt)}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </aside>

        <section className="chatMain">
          {loading ? (
            <LoadingSpinner text="Loading chats..." />
          ) : !activeConversation ? null : (
            <div className="chatMainCard">
              <div className="chatHeaderBar">
                <div className="chatHeaderUser">
                  <div className="chatAvatarWrap">
                    {getConversationDisplayAvatar(activeConversation) ? (
                      <img
                        src={getConversationDisplayAvatar(activeConversation)}
                        alt={getConversationDisplayName(activeConversation)}
                        className="chatAvatar large"
                      />
                    ) : (
                      <div className="chatAvatarFallback large">
                        {getConversationDisplayName(activeConversation)
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>
                    )}

                    {activeConversation.conversationType === "direct" ? (
                      <span
                        className={`chatPresenceDot ${
                          activeOtherUser?.isOnline ? "online" : "offline"
                        }`}
                      />
                    ) : (
                      <span className="chatGroupBadge large">
                        {getGroupBadgeLabel(activeConversation.groupName)}
                      </span>
                    )}
                  </div>

                  <div className="chatHeaderContent">
                    <div className="chatHeaderName">
                      {getConversationDisplayName(activeConversation)}
                    </div>
                    <div className="chatHeaderMeta">
                      {getConversationPresenceText(activeConversation)}
                    </div>
                  </div>
                </div>

                <div className="chatHeaderTools">
                  {canShowProviderTools ? (
                    <>
                      <button
                        className="chatHeaderGhostBtn"
                        onClick={() => setShowListingModal(true)}
                      >
                        Share Listing
                      </button>

                      <button
                        className="chatHeaderGhostBtn"
                        onClick={() => setShowBroadcastModal(true)}
                      >
                        Broadcast Update
                      </button>
                    </>
                  ) : null}

                  <button className="chatHeaderGhostBtn" onClick={handleClearChat}>
                    Clear Chat
                  </button>
                </div>
              </div>

              <div
                ref={messagesRef}
                className="chatMessages noScrollbar"
                onScroll={handleMessagesScroll}
              >
                {loadingMessages ? (
                  <LoadingSpinner text="Loading messages..." />
                ) : messages.length === 0 ? (
                  <div className="chatEmptyCard">
                    {activeConversation.conversationType === "group"
                      ? "This group has no messages yet. Start the group chat."
                      : "No messages yet. Start the conversation."}
                  </div>
                ) : (
                  messageItems.map((entry) => {
                    if (entry.type === "separator") {
                      return (
                        <div key={entry.id} className="chatDateSeparator">
                          <span>{entry.label}</span>
                        </div>
                      );
                    }

                    const msg = entry.message;
                    const isMe =
                      String(msg.sender?._id || msg.sender?.id || msg.sender) ===
                      String(user?.id);

                    return (
                      <div
                        key={msg.id}
                        className={`chatBubbleRow ${isMe ? "me" : "other"}`}
                      >
                        <div className={`chatBubbleWrap ${isMe ? "me" : "other"}`}>
                          <div className={`chatBubble ${isMe ? "me" : "other"}`}>
                            {msg.replyTo?.messageId ? (
                              <div className="chatReplyBlock">
                                <strong>Reply</strong>
                                <span>{getReplyPreviewText(msg.replyTo)}</span>
                              </div>
                            ) : null}

                            {editingMessageId === String(msg.id) ? (
                              <div className="chatEditWrap">
                                <textarea
                                  className="chatEditInput"
                                  value={editText}
                                  onChange={(e) => setEditText(e.target.value)}
                                  rows={2}
                                />
                                <div className="chatEditActions">
                                  <button onClick={handleSaveEdit}>Save</button>
                                  <button
                                    className="alt"
                                    onClick={() => {
                                      setEditingMessageId("");
                                      setEditText("");
                                    }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                {msg.messageType === "text" && (
                                  <div className="chatBubbleText">{msg.text}</div>
                                )}

                                {msg.messageType === "image" && (
                                  <div className="chatMediaWrap">
                                    {msg.text ? (
                                      <div className="chatBubbleText">{msg.text}</div>
                                    ) : null}
                                    <img
                                      src={msg.media?.url}
                                      alt={msg.media?.originalName || "chat image"}
                                      className="chatMediaImage"
                                    />
                                  </div>
                                )}

                                {msg.messageType === "video" && (
                                  <div className="chatMediaWrap">
                                    {msg.text ? (
                                      <div className="chatBubbleText">{msg.text}</div>
                                    ) : null}
                                    <video controls className="chatMediaVideo">
                                      <source
                                        src={msg.media?.url}
                                        type={msg.media?.mimeType || "video/mp4"}
                                      />
                                    </video>
                                  </div>
                                )}

                                {msg.messageType === "file" && (
                                  <div className="chatMediaWrap">
                                    {msg.text ? (
                                      <div className="chatBubbleText">{msg.text}</div>
                                    ) : null}
                                    <a
                                      href={msg.media?.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="chatFileLink"
                                    >
                                      📎 {msg.media?.originalName || "Open file"}
                                    </a>
                                  </div>
                                )}

                                {msg.messageType === "listing_card" ? (
                                  <div className="chatListingCard">
                                    {msg.listingCard?.imageUrl ? (
                                      <img
                                        src={msg.listingCard.imageUrl}
                                        alt={msg.listingCard.title || "Listing"}
                                        className="chatListingCardImage"
                                      />
                                    ) : null}

                                    <div className="chatListingCardBody">
                                      <strong>{msg.listingCard?.title || "Listing"}</strong>
                                      <span>{msg.listingCard?.subtitle || ""}</span>
                                      <span className="chatListingCardPrice">
                                        {msg.listingCard?.priceText || ""}
                                      </span>

                                      {msg.listingCard?.targetUrl ? (
                                        <button
                                          className="chatListingCardBtn"
                                          onClick={() => navigate(msg.listingCard.targetUrl)}
                                        >
                                          View Listing
                                        </button>
                                      ) : null}
                                    </div>
                                  </div>
                                ) : null}

                                {msg.messageType === "system" && (
                                  <div className="chatSystemText">{msg.text}</div>
                                )}

                                <div className="chatBubbleMeta">
                                  <span>{formatMessageTime(msg.createdAt)}</span>
                                  {msg.isEdited ? <span>Edited</span> : null}
                                  {msg.forwardedFrom ? <span>Forwarded</span> : null}
                                  {isMe ? (
                                    <span>
                                      {msg.seenBy?.some((id) => String(id) !== String(user?.id))
                                        ? "Seen"
                                        : "Sent"}
                                    </span>
                                  ) : null}
                                </div>
                              </>
                            )}
                          </div>

                          <div className="chatMessageActionsWrap">
                            <button
                              className="chatMessageMenuBtn"
                              onClick={() =>
                                setMenuOpenId((prev) =>
                                  prev === String(msg.id) ? "" : String(msg.id)
                                )
                              }
                            >
                              ⋯
                            </button>

                            {menuOpenId === String(msg.id) ? (
                              <div className="chatMessageMenu">
                                <button
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setMenuOpenId("");
                                  }}
                                >
                                  Reply
                                </button>

                                <button
                                  onClick={() => {
                                    handleForwardMessage(msg.id);
                                  }}
                                >
                                  Forward
                                </button>

                                {isMe && msg.messageType === "text" ? (
                                  <button
                                    onClick={() => {
                                      setEditingMessageId(String(msg.id));
                                      setEditText(msg.text || "");
                                      setMenuOpenId("");
                                    }}
                                  >
                                    Edit
                                  </button>
                                ) : null}

                                <button
                                  className="danger"
                                  onClick={() => handleDeleteForMe(msg.id)}
                                >
                                  Delete for me
                                </button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {Object.values(typingUsers).some(Boolean) ? (
                  <div className="chatTyping">Typing...</div>
                ) : null}
              </div>

              <div className="chatComposerBar">
                {replyingTo ? (
                  <div className="chatReplyComposer">
                    <div>
                      <strong>Replying</strong>
                      <span>{getReplyPreviewText(replyingTo)}</span>
                    </div>
                    <button onClick={() => setReplyingTo(null)}>✕</button>
                  </div>
                ) : null}

                {selectedFile ? (
                  <div className="chatSelectedFile">
                    <span>{selectedFile.name}</span>
                    <button type="button" onClick={() => setSelectedFile(null)}>
                      Remove
                    </button>
                  </div>
                ) : null}

                <div className="chatComposerRow">
                  <button
                    type="button"
                    className="chatAttachBtn"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    +
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    className="chatHiddenFile"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  />

                  <textarea
                    className="chatInput"
                    value={text}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Type message..."
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                  />

                  <button
                    type="button"
                    className="chatSendBtn"
                    onClick={handleSend}
                    disabled={sending || (!text.trim() && !selectedFile)}
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {showGroupModal ? (
        <div className="chatModalOverlay" onClick={() => setShowGroupModal(false)}>
          <div className="chatModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="chatModalHead">
              <h3>Create Group / Trip Buddy Group</h3>
              <button onClick={() => setShowGroupModal(false)}>✕</button>
            </div>

            <div className="chatModalBody">
              <input
                className="chatModalInput"
                placeholder="Group name"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />

              <textarea
                className="chatModalTextarea"
                placeholder="Description"
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                rows={3}
              />

              <div className="chatModalLabel">Select users</div>

              <div className="chatModalUserList noScrollbar">
                {users.map((item) => (
                  <button
                    key={item.id}
                    className={`chatModalUserItem ${
                      selectedGroupUsers.includes(item.id) ? "selected" : ""
                    }`}
                    onClick={() => toggleGroupUser(item.id)}
                  >
                    <span>{item.name}</span>
                    <span>{selectedGroupUsers.includes(item.id) ? "Selected" : "Add"}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="chatModalActions">
              <button className="chatHeaderGhostBtn" onClick={() => setShowGroupModal(false)}>
                Cancel
              </button>
              <button className="chatSendBtn" onClick={() => handleCreateGroup("group")}>
                Create Group
              </button>
              <button className="chatSendBtn" onClick={() => handleCreateGroup("trip_buddy")}>
                Create Trip Buddy Group
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showListingModal ? (
        <div className="chatModalOverlay" onClick={() => setShowListingModal(false)}>
          <div className="chatModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="chatModalHead">
              <h3>Share Provider Listing</h3>
              <button onClick={() => setShowListingModal(false)}>✕</button>
            </div>

            <div className="chatModalBody">
              <CustomSelect
                value={selectedProviderId}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  setSelectedPlanIndex(0);
                  setSelectedVehicleIndex(0);
                }}
                options={[
                  { label: "Select your provider listing", value: "" },
                  ...myProviders.map((item) => ({
                    label: `${item.businessName} — ${item.listingType}`,
                    value: item._id,
                  })),
                ]}
                placeholder="Select your provider listing"
              />

              {selectedProvider?.listingType === "travel_planner" ? (
                <CustomSelect
                  value={selectedPlanIndex}
                  onChange={(e) => setSelectedPlanIndex(Number(e.target.value))}
                  options={(selectedProvider.travelPlans || []).map((plan, index) => ({
                    label: plan.packageTitle || `Plan ${index + 1}`,
                    value: index,
                  }))}
                  placeholder="Select trip"
                />
              ) : null}

              {selectedProvider?.listingType === "vehicle" ? (
                <CustomSelect
                  value={selectedVehicleIndex}
                  onChange={(e) => setSelectedVehicleIndex(Number(e.target.value))}
                  options={(selectedProvider.vehicles || []).map((vehicle, index) => ({
                    label: vehicle.title || vehicle.vehicleType || `Vehicle ${index + 1}`,
                    value: index,
                  }))}
                  placeholder="Select vehicle"
                />
              ) : null}
            </div>

            <div className="chatModalActions">
              <button className="chatHeaderGhostBtn" onClick={() => setShowListingModal(false)}>
                Cancel
              </button>
              <button className="chatSendBtn" onClick={handleSendListingCard}>
                Share Listing
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showBroadcastModal ? (
        <div className="chatModalOverlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="chatModalCard" onClick={(e) => e.stopPropagation()}>
            <div className="chatModalHead">
              <h3>Broadcast Provider Update</h3>
              <button onClick={() => setShowBroadcastModal(false)}>✕</button>
            </div>

            <div className="chatModalBody">
              <CustomSelect
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
                options={[
                  { label: "Select your provider listing", value: "" },
                  ...myProviders.map((item) => ({
                    label: item.businessName,
                    value: item._id,
                  })),
                ]}
                placeholder="Select your provider listing"
              />

              <textarea
                className="chatModalTextarea"
                placeholder="Write broadcast update..."
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                rows={4}
              />
            </div>

            <div className="chatModalActions">
              <button className="chatHeaderGhostBtn" onClick={() => setShowBroadcastModal(false)}>
                Cancel
              </button>
              <button className="chatSendBtn" onClick={handleBroadcastUpdate}>
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}