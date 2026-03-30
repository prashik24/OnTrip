import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch, getUser, isLoggedIn } from "../lib/api";
import { disconnectSocket, getSocket } from "../lib/socket";
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

function getConversationDisplayName(conversation, currentUserId) {
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

function getReplyPreviewText(item) {
  if (!item) return "";
  if (item.messageType === "image") return "📷 Image";
  if (item.messageType === "video") return "🎥 Video";
  if (item.messageType === "file") return "📎 File";
  if (item.messageType === "listing_card") return "📌 Listing";
  if (item.messageType === "system") return "System update";
  return item.text || "Message";
}

export default function Chat() {
  const user = getUser();
  const location = useLocation();
  const navigate = useNavigate();

  const messagesRef = useRef(null);
  const fileInputRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [groups, setGroups] = useState([]);
  const [tripGroups, setTripGroups] = useState([]);
  const [myProviders, setMyProviders] = useState([]);

  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [typingUsers, setTypingUsers] = useState({});
  const [unreadCounts, setUnreadCounts] = useState({});
  const [error, setError] = useState("");

  const [menuOpenId, setMenuOpenId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [activeDirectory, setActiveDirectory] = useState("");
  const [directoryTitle, setDirectoryTitle] = useState("");

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedGroupUsers, setSelectedGroupUsers] = useState([]);

  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastText, setBroadcastText] = useState("");

  const [showListingModal, setShowListingModal] = useState(false);
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0);
  const [selectedVehicleIndex, setSelectedVehicleIndex] = useState(0);

  const activeOtherUser = useMemo(() => activeConversation?.otherUser || null, [activeConversation]);

  const selectedProvider = useMemo(() => {
    return (
      myProviders.find((item) => String(item._id) === String(selectedProviderId)) ||
      null
    );
  }, [myProviders, selectedProviderId]);

  const filteredRecentConversations = useMemo(() => {
    return conversations.filter(
      (item) => item && item.lastMessageAt && (item.lastMessageText || item.lastMessageType)
    );
  }, [conversations]);

  const messageItems = useMemo(() => buildMessageItems(messages), [messages]);

  const directoryItems = useMemo(() => {
    if (activeDirectory === "recent") return filteredRecentConversations;
    if (activeDirectory === "users") return users;
    if (activeDirectory === "groups") return groups;
    if (activeDirectory === "trip") return tripGroups;
    return [];
  }, [activeDirectory, filteredRecentConversations, users, groups, tripGroups]);

  const canShowProviderTools =
    user?.role === "provider" &&
    myProviders.length > 0 &&
    activeConversation &&
    activeConversation.conversationType === "direct";

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
          apiFetch("/api/chat/groups"),
        ];

        if (user?.role === "provider") {
          requests.push(apiFetch("/api/providers/mine"));
        }

        const results = await Promise.all(requests);
        const userRes = results[0];
        const convRes = results[1];
        const groupRes = results[2];
        const providerRes = results[3];

        setUsers(userRes.users || []);
        setConversations(convRes.conversations || []);
        setGroups(groupRes.groups || []);
        setTripGroups(groupRes.tripBuddyGroups || []);
        setMyProviders(providerRes?.providers || []);

        const params = new URLSearchParams(location.search);
        const queryConversation = params.get("conversation");
        const queryUser = params.get("user");

        if (queryConversation) {
          const found =
            (convRes.conversations || []).find(
              (item) => String(item.id) === String(queryConversation)
            ) ||
            (groupRes.allGroups || []).find(
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

          setConversations((prev) => {
            const exists = prev.some((item) => String(item.id) === String(conversation.id));
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

        const firstRealConversation = (convRes.conversations || []).find(
          (item) => item?.lastMessageAt
        );

        if (firstRealConversation) {
          await openConversation(firstRealConversation);
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

      setConversations((prev) =>
        prev.map((item) => {
          if (item.conversationType === "group") {
            return {
              ...item,
              participants: (item.participants || []).map((p) =>
                String(p.id || p._id) === String(userId)
                  ? { ...p, isOnline, lastSeenAt }
                  : p
              ),
            };
          }

          return String(item.otherUser?.id) === String(userId)
            ? {
                ...item,
                otherUser: {
                  ...item.otherUser,
                  isOnline,
                  lastSeenAt,
                },
              }
            : item;
        })
      );

      const updateGroupPresence = (listSetter) => {
        listSetter((prev) =>
          prev.map((item) => ({
            ...item,
            participants: (item.participants || []).map((p) =>
              String(p.id || p._id) === String(userId)
                ? { ...p, isOnline, lastSeenAt }
                : p
            ),
          }))
        );
      };

      updateGroupPresence(setGroups);
      updateGroupPresence(setTripGroups);

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
        const setter =
          conversation.groupCategory === "trip_buddy" ? setTripGroups : setGroups;

        setter((prev) => {
          const exists = prev.some((item) => String(item.id) === incomingConversationId);
          if (exists) {
            return prev.map((item) =>
              String(item.id) === incomingConversationId ? conversation : item
            );
          }
          return [conversation, ...prev];
        });
      } else {
        setUsers((prev) =>
          prev.map((item) =>
            String(item.id) === String(conversation.otherUser?.id)
              ? { ...item, conversationId: conversation.id }
              : item
          )
        );
      }

      setConversations((prev) => {
        const withoutCurrent = prev.filter(
          (item) => String(item.id) !== incomingConversationId
        );
        return [conversation, ...withoutCurrent];
      });

      setActiveConversation((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== incomingConversationId) return prev;
        return conversation;
      });

      setMessages((prev) => {
        if (!isCurrentConversation) return prev;
        const exists = prev.some((item) => String(item.id) === String(message.id));
        if (exists) return prev;
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

      setConversations((prev) => {
        const exists = prev.some((item) => String(item.id) === String(conversation.id));
        if (exists) {
          return prev.map((item) =>
            String(item.id) === String(conversation.id) ? conversation : item
          );
        }
        return [conversation, ...prev];
      });

      await openConversation(conversation);
      setActiveDirectory("");
      navigate(`/chat?conversation=${conversation.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to open chat");
    }
  }

  async function handleCreateGroup(groupCategory = "standard") {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }

    if (selectedGroupUsers.length < 2) {
      setError("Select at least 2 users");
      return;
    }

    try {
      setError("");

      const res = await apiFetch("/api/chat/conversations/group", {
        method: "POST",
        body: JSON.stringify({
          groupName: groupName.trim(),
          groupDescription: groupDescription.trim(),
          participantIds: selectedGroupUsers,
          groupCategory,
        }),
      });

      const conversation = res.conversation;

      if (groupCategory === "trip_buddy") {
        setTripGroups((prev) => [conversation, ...prev]);
      } else {
        setGroups((prev) => [conversation, ...prev]);
      }

      setShowGroupModal(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedGroupUsers([]);

      await openConversation(conversation);
      navigate(`/chat?conversation=${conversation.id}`, { replace: true });
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

      setConversations((prev) => {
        const exists = prev.some((item) => String(item.id) === String(res.conversation.id));
        let updated = exists
          ? prev.map((item) =>
              String(item.id) === String(res.conversation.id) ? res.conversation : item
            )
          : [res.conversation, ...prev];

        updated = updated.sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        );
        return updated;
      });

      if (res.conversation.conversationType === "group") {
        if (res.conversation.groupCategory === "trip_buddy") {
          setTripGroups((prev) =>
            prev.map((item) =>
              String(item.id) === String(res.conversation.id) ? res.conversation : item
            )
          );
        } else {
          setGroups((prev) =>
            prev.map((item) =>
              String(item.id) === String(res.conversation.id) ? res.conversation : item
            )
          );
        }
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
    const targetConversationId = window.prompt("Enter target conversation id");
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
      setConversations((prev) =>
        prev.filter((item) => String(item.id) !== String(activeConversation.id))
      );

      if (activeConversation.conversationType === "group") {
        if (activeConversation.groupCategory === "trip_buddy") {
          setTripGroups((prev) =>
            prev.filter((item) => String(item.id) !== String(activeConversation.id))
          );
        } else {
          setGroups((prev) =>
            prev.filter((item) => String(item.id) !== String(activeConversation.id))
          );
        }
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
      setSelectedProviderId("");
      setBroadcastText("");
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

  function toggleGroupUser(userId) {
    setSelectedGroupUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => String(id) !== String(userId))
        : [...prev, userId]
    );
  }

  function openDirectory(type, title) {
    setActiveDirectory(type);
    setDirectoryTitle(title);
  }

  function renderDirectoryItem(item) {
    if (activeDirectory === "users") {
      return (
        <button
          key={item.id}
          className="chatDirectoryItem"
          onClick={() => openChatWithUser(item.id)}
        >
          <div className="chatDirectoryItemLeft">
            {item.avatar ? (
              <img src={item.avatar} alt={item.name} className="chatDirectoryAvatar" />
            ) : (
              <div className="chatDirectoryAvatar chatDirectoryAvatarFallback">
                {item.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <span>{item.name}</span>
          </div>
        </button>
      );
    }

    if (activeDirectory === "recent" || activeDirectory === "groups" || activeDirectory === "trip") {
      const displayName = getConversationDisplayName(item, user?.id);
      const displayAvatar = getConversationDisplayAvatar(item);

      return (
        <button
          key={item.id}
          className="chatDirectoryItem"
          onClick={() => {
            openConversation(item);
            setActiveDirectory("");
          }}
        >
          <div className="chatDirectoryItemLeft">
            {displayAvatar ? (
              <img src={displayAvatar} alt={displayName} className="chatDirectoryAvatar" />
            ) : (
              <div className="chatDirectoryAvatar chatDirectoryAvatarFallback">
                {displayName?.charAt(0)?.toUpperCase() || "G"}
              </div>
            )}
            <span>{displayName}</span>
          </div>
        </button>
      );
    }

    return null;
  }

  if (!isLoggedIn()) return null;

  return (
    <div className="container chatPage">
      {error ? <div className="chatAlert">{error}</div> : null}

      <div className="chatAdvancedLayout">
        <aside className="chatLeftMenu">
          <button
            className="chatMenuSection"
            onClick={() => openDirectory("recent", "Recent Conversations")}
          >
            <span>Recent Conversations</span>
            <strong>{filteredRecentConversations.length}</strong>
          </button>

          <button
            className="chatMenuSection"
            onClick={() => openDirectory("users", "All Users")}
          >
            <span>All Users</span>
            <strong>{users.length}</strong>
          </button>

          <button
            className="chatMenuSection"
            onClick={() => openDirectory("groups", "Groups")}
          >
            <span>Groups</span>
            <strong>{groups.length}</strong>
          </button>

          <button
            className="chatMenuSection"
            onClick={() => openDirectory("trip", "Trip Buddy Groups")}
          >
            <span>Trip Buddy Groups</span>
            <strong>{tripGroups.length}</strong>
          </button>

          <div className="chatLeftActions">
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
        </aside>

        {activeDirectory ? (
          <aside className="chatDirectoryPanel">
            <div className="chatDirectoryHeader">
              <h3>{directoryTitle}</h3>
              <button onClick={() => setActiveDirectory("")}>✕</button>
            </div>

            <div className="chatDirectoryList noScrollbar">
              {directoryItems.length === 0 ? (
                <div className="chatEmptyCard">No items found.</div>
              ) : (
                directoryItems.map(renderDirectoryItem)
              )}
            </div>
          </aside>
        ) : null}

        <section className="chatMainArea">
          {!activeConversation ? (
            <div className="chatMainEmpty">
              <div className="chatMainEmptyCard">
                <h3>Select a chat</h3>
                <p>Choose from recent conversations, users, groups, or trip buddy groups.</p>
              </div>
            </div>
          ) : (
            <div className="chatMainCard">
              <div className="chatHeaderBar">
                <div className="chatHeaderUser">
                  <div className="chatAvatarWrap">
                    {getConversationDisplayAvatar(activeConversation) ? (
                      <img
                        src={getConversationDisplayAvatar(activeConversation)}
                        alt={getConversationDisplayName(activeConversation, user?.id)}
                        className="chatAvatar large"
                      />
                    ) : (
                      <div className="chatAvatarFallback large">
                        {getConversationDisplayName(activeConversation, user?.id)
                          ?.charAt(0)
                          ?.toUpperCase() || "U"}
                      </div>
                    )}
                  </div>

                  <div className="chatHeaderContent">
                    <div className="chatHeaderName">
                      {getConversationDisplayName(activeConversation, user?.id)}
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
                        Send Listing Card
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
                  <div className="chatEmptyCard">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chatEmptyCard">No messages yet. Start the conversation.</div>
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
                      <div key={msg.id} className={`chatBubbleRow ${isMe ? "me" : "other"}`}>
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
                                {msg.messageType === "text" ? (
                                  <div className="chatBubbleText">{msg.text}</div>
                                ) : null}

                                {msg.messageType === "image" ? (
                                  <div className="chatMediaWrap">
                                    {msg.text ? <div className="chatBubbleText">{msg.text}</div> : null}
                                    <img
                                      src={msg.media?.url}
                                      alt={msg.media?.originalName || "chat image"}
                                      className="chatMediaImage"
                                    />
                                  </div>
                                ) : null}

                                {msg.messageType === "video" ? (
                                  <div className="chatMediaWrap">
                                    {msg.text ? <div className="chatBubbleText">{msg.text}</div> : null}
                                    <video controls className="chatMediaVideo">
                                      <source
                                        src={msg.media?.url}
                                        type={msg.media?.mimeType || "video/mp4"}
                                      />
                                    </video>
                                  </div>
                                ) : null}

                                {msg.messageType === "file" ? (
                                  <div className="chatMediaWrap">
                                    {msg.text ? <div className="chatBubbleText">{msg.text}</div> : null}
                                    <a
                                      href={msg.media?.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="chatFileLink"
                                    >
                                      📎 {msg.media?.originalName || "Open file"}
                                    </a>
                                  </div>
                                ) : null}

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

                                {msg.messageType === "system" ? (
                                  <div className="chatSystemText">{msg.text}</div>
                                ) : null}

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

                                <button onClick={() => handleForwardMessage(msg.id)}>
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
              <button className="chatSendBtn" onClick={() => handleCreateGroup("standard")}>
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
              <h3>Send Provider Listing Card</h3>
              <button onClick={() => setShowListingModal(false)}>✕</button>
            </div>

            <div className="chatModalBody">
              <select
                className="chatModalInput"
                value={selectedProviderId}
                onChange={(e) => {
                  setSelectedProviderId(e.target.value);
                  setSelectedPlanIndex(0);
                  setSelectedVehicleIndex(0);
                }}
              >
                <option value="">Select provider listing</option>
                {myProviders.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.businessName} — {item.listingType}
                  </option>
                ))}
              </select>

              {selectedProvider?.listingType === "travel_planner" ? (
                <select
                  className="chatModalInput"
                  value={selectedPlanIndex}
                  onChange={(e) => setSelectedPlanIndex(Number(e.target.value))}
                >
                  {(selectedProvider.travelPlans || []).map((plan, index) => (
                    <option key={index} value={index}>
                      {plan.packageTitle || `Plan ${index + 1}`}
                    </option>
                  ))}
                </select>
              ) : null}

              {selectedProvider?.listingType === "vehicle" ? (
                <select
                  className="chatModalInput"
                  value={selectedVehicleIndex}
                  onChange={(e) => setSelectedVehicleIndex(Number(e.target.value))}
                >
                  {(selectedProvider.vehicles || []).map((vehicle, index) => (
                    <option key={index} value={index}>
                      {vehicle.title || vehicle.vehicleType || `Vehicle ${index + 1}`}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="chatModalActions">
              <button className="chatHeaderGhostBtn" onClick={() => setShowListingModal(false)}>
                Cancel
              </button>
              <button className="chatSendBtn" onClick={handleSendListingCard}>
                Send Card
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
              <select
                className="chatModalInput"
                value={selectedProviderId}
                onChange={(e) => setSelectedProviderId(e.target.value)}
              >
                <option value="">Select provider listing</option>
                {myProviders.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.businessName}
                  </option>
                ))}
              </select>

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