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

  const fileInputRef = useRef(null);
  const messagesRef = useRef(null);
  const shouldStickToBottomRef = useRef(true);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);

  const [userSearch, setUserSearch] = useState("");
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);

  const [typingUsers, setTypingUsers] = useState({});
  const [error, setError] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});

  const [menuOpenId, setMenuOpenId] = useState("");
  const [editingMessageId, setEditingMessageId] = useState("");
  const [editText, setEditText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardMessageId, setForwardMessageId] = useState("");

  const [showProviderPanel, setShowProviderPanel] = useState(false);
  const [providerIdInput, setProviderIdInput] = useState("");
  const [providerBroadcastText, setProviderBroadcastText] = useState("");

  const activeOtherUser = useMemo(() => {
    return activeConversation?.otherUser || null;
  }, [activeConversation]);

  const visibleConversations = useMemo(() => {
    return conversations.filter(
      (item) =>
        item &&
        item.lastMessageAt &&
        (item.lastMessageText || item.lastMessageType)
    );
  }, [conversations]);

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((item) => {
      const bag = `${item.name} ${item.email} ${item.city} ${item.role}`.toLowerCase();
      return bag.includes(q);
    });
  }, [users, userSearch]);

  const messageItems = useMemo(() => buildMessageItems(messages), [messages]);

  const forwardTargets = useMemo(() => {
    return visibleConversations.filter(
      (item) => String(item.id) !== String(activeConversation?.id || "")
    );
  }, [visibleConversations, activeConversation]);

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

        const [userRes, convRes] = await Promise.all([
          apiFetch("/api/chat/users"),
          apiFetch("/api/chat/conversations"),
        ]);

        setUsers(userRes.users || []);
        setConversations(convRes.conversations || []);

        const params = new URLSearchParams(location.search);
        const queryConversation = params.get("conversation");
        const queryUser = params.get("user");

        if (queryConversation) {
          const found = (convRes.conversations || []).find(
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
  }, [location.search, navigate]);

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
          if (item.conversationType === "direct") {
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
          }

          return {
            ...item,
            participants: (item.participants || []).map((p) =>
              String(p.id || p._id) === String(userId)
                ? { ...p, isOnline, lastSeenAt }
                : p
            ),
          };
        })
      );

      setActiveConversation((prev) => {
        if (!prev) return prev;

        if (prev.conversationType === "direct") {
          if (String(prev.otherUser?.id) !== String(userId)) return prev;
          return {
            ...prev,
            otherUser: {
              ...prev.otherUser,
              isOnline,
              lastSeenAt,
            },
          };
        }

        return {
          ...prev,
          participants: (prev.participants || []).map((p) =>
            String(p.id || p._id) === String(userId)
              ? { ...p, isOnline, lastSeenAt }
              : p
          ),
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

      setConversations((prev) => {
        const withoutCurrent = prev.filter(
          (item) => String(item.id) !== incomingConversationId
        );
        return [conversation, ...withoutCurrent];
      });

      if (conversation.conversationType === "direct") {
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
      setShowForwardModal(false);
      setForwardMessageId("");

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
      navigate(`/chat?conversation=${conversation.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to open chat");
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
        const updated = prev.map((item) =>
          String(item.id) === String(res.conversation.id) ? res.conversation : item
        );
        updated.sort(
          (a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0)
        );
        return updated;
      });

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

  function openForwardModal(messageId) {
    setForwardMessageId(String(messageId));
    setShowForwardModal(true);
    setMenuOpenId("");
  }

  async function handleForwardToConversation(conversationId) {
    try {
      setError("");

      await apiFetch(`/api/chat/messages/${forwardMessageId}/forward`, {
        method: "POST",
        body: JSON.stringify({
          targetConversationId: conversationId,
        }),
      });

      setShowForwardModal(false);
      setForwardMessageId("");
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
      setActiveConversation(null);
      navigate("/chat", { replace: true });
    } catch (err) {
      setError(err.message || "Failed to clear chat");
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

  async function handleCreateGroup() {
    if (!groupName.trim() || selectedUsers.length === 0) {
      setError("Please enter group name and choose members");
      return;
    }

    try {
      setError("");

      const res = await apiFetch("/api/chat/conversations/group", {
        method: "POST",
        body: JSON.stringify({
          groupName: groupName.trim(),
          groupDescription: groupDescription.trim(),
          participantIds: selectedUsers,
        }),
      });

      setConversations((prev) => [res.conversation, ...prev]);
      setShowGroupModal(false);
      setGroupName("");
      setGroupDescription("");
      setSelectedUsers([]);

      await openConversation(res.conversation);
      navigate(`/chat?conversation=${res.conversation.id}`, { replace: true });
    } catch (err) {
      setError(err.message || "Failed to create group");
    }
  }

  async function sendListingCard() {
    if (!activeConversation?.id || !providerIdInput.trim()) {
      setError("Enter provider id first");
      return;
    }

    try {
      setError("");

      await apiFetch("/api/chat/provider/send-listing-card", {
        method: "POST",
        body: JSON.stringify({
          conversationId: activeConversation.id,
          providerId: providerIdInput.trim(),
        }),
      });

      setShowProviderPanel(false);
    } catch (err) {
      setError(err.message || "Failed to send listing card");
    }
  }

  async function sendBroadcast() {
    if (!providerIdInput.trim() || !providerBroadcastText.trim()) {
      setError("Enter provider id and broadcast text");
      return;
    }

    try {
      setError("");

      await apiFetch("/api/chat/provider/broadcast", {
        method: "POST",
        body: JSON.stringify({
          providerId: providerIdInput.trim(),
          text: providerBroadcastText.trim(),
        }),
      });

      setProviderBroadcastText("");
      setShowProviderPanel(false);
    } catch (err) {
      setError(err.message || "Failed to send broadcast");
    }
  }

  function toggleSelectedUser(userId) {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  function getConversationDisplayName(item) {
    if (!item) return "Chat";
    if (item.conversationType === "group") return item.groupName || "Group";
    return item.otherUser?.name || "User";
  }

  function getConversationSubtitle(item) {
    if (!item) return "";
    if (item.conversationType === "group") {
      return `${item.participants?.length || 0} members`;
    }
    return item.otherUser?.isOnline
      ? "Online"
      : formatLastSeen(item.otherUser?.lastSeenAt);
  }

  if (!isLoggedIn()) return null;

  return (
    <div className="container chatPage">
      {error ? <div className="chatAlert">{error}</div> : null}

      <div className="chatLayout">
        <aside className="chatSidebar">
          <div className="chatSidebarCard">
            <div className="chatSidebarHead">
              <h2>Chats</h2>
              <p>Conversations and users</p>
            </div>

            <div className="chatSidebarActions">
              <button className="chatSmallPrimaryBtn" onClick={() => setShowGroupModal(true)}>
                + New Group
              </button>

              {user?.role === "provider" ? (
                <button
                  className="chatSmallGhostBtn"
                  onClick={() => setShowProviderPanel((s) => !s)}
                >
                  Provider Tools
                </button>
              ) : null}
            </div>

            {showProviderPanel ? (
              <div className="chatProviderPanel">
                <input
                  className="chatSearch"
                  placeholder="Provider id"
                  value={providerIdInput}
                  onChange={(e) => setProviderIdInput(e.target.value)}
                />

                <button className="chatSmallPrimaryBtn" onClick={sendListingCard}>
                  Send Listing Card
                </button>

                <textarea
                  className="chatProviderTextarea"
                  placeholder="Broadcast update text..."
                  value={providerBroadcastText}
                  onChange={(e) => setProviderBroadcastText(e.target.value)}
                  rows={3}
                />

                <button className="chatSmallGhostBtn" onClick={sendBroadcast}>
                  Broadcast Update
                </button>
              </div>
            ) : null}

            <input
              className="chatSearch"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            <div className="chatSectionLabel">Recent Conversations</div>

            <div className="chatConversationList noScrollbar">
              {visibleConversations.length === 0 ? (
                <div className="chatEmptyCard">No conversations yet.</div>
              ) : (
                visibleConversations.map((item) => (
                  <button
                    key={item.id}
                    className={`chatConversationItem ${
                      activeConversation?.id === item.id ? "active" : ""
                    }`}
                    onClick={() => openConversation(item)}
                  >
                    <div className="chatAvatarWrap">
                      {item.conversationType === "group" ? (
                        <div className="chatAvatarFallback">
                          {(item.groupName || "G").charAt(0).toUpperCase()}
                        </div>
                      ) : item.otherUser?.avatar ? (
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

                      {item.conversationType === "direct" ? (
                        <span
                          className={`chatPresenceDot ${
                            item.otherUser?.isOnline ? "online" : "offline"
                          }`}
                        />
                      ) : null}
                    </div>

                    <div className="chatConversationBody">
                      <div className="chatConversationTop">
                        <strong>{getConversationDisplayName(item)}</strong>

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

            <div className="chatSectionLabel">All Users</div>

            <div className="chatUserList noScrollbar">
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
        </aside>

        <section className="chatMain">
          {!activeConversation ? (
            <div className="chatMainEmpty">
              <div className="chatMainEmptyCard">
                <h3>Select a chat</h3>
                <p>Choose a conversation or start with any user.</p>
              </div>
            </div>
          ) : (
            <div className="chatMainCard">
              <div className="chatHeaderBar">
                <div className="chatHeaderUser">
                  <div className="chatAvatarWrap">
                    {activeConversation.conversationType === "group" ? (
                      <div className="chatAvatarFallback large">
                        {(activeConversation.groupName || "G").charAt(0).toUpperCase()}
                      </div>
                    ) : activeOtherUser?.avatar ? (
                      <img
                        src={activeOtherUser.avatar}
                        alt={activeOtherUser.name}
                        className="chatAvatar large"
                      />
                    ) : (
                      <div className="chatAvatarFallback large">
                        {activeOtherUser?.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                    )}

                    {activeConversation.conversationType === "direct" ? (
                      <span
                        className={`chatPresenceDot ${
                          activeOtherUser?.isOnline ? "online" : "offline"
                        }`}
                      />
                    ) : null}
                  </div>

                  <div className="chatHeaderContent">
                    <div className="chatHeaderName">
                      {getConversationDisplayName(activeConversation)}
                    </div>
                    <div className="chatHeaderMeta">
                      {getConversationSubtitle(activeConversation)}
                    </div>
                  </div>
                </div>

                <button className="chatHeaderGhostBtn" onClick={handleClearChat}>
                  Clear Chat
                </button>
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

                                {msg.messageType === "listing_card" && (
                                  <div className="chatListingCard">
                                    {msg.listingCard?.imageUrl ? (
                                      <img
                                        src={msg.listingCard.imageUrl}
                                        alt={msg.listingCard.title || "Listing"}
                                      />
                                    ) : null}
                                    <h4>{msg.listingCard?.title || "Listing"}</h4>
                                    <p>{msg.listingCard?.subtitle || ""}</p>
                                    <strong>{msg.listingCard?.priceText || ""}</strong>

                                    {msg.listingCard?.targetUrl ? (
                                      <button
                                        onClick={() => navigate(msg.listingCard.targetUrl)}
                                      >
                                        View
                                      </button>
                                    ) : null}
                                  </div>
                                )}

                                {msg.messageType === "system" && (
                                  <div className="chatSystemText">{msg.text}</div>
                                )}

                                <div className="chatBubbleMeta">
                                  <span>{formatMessageTime(msg.createdAt)}</span>
                                  {msg.isEdited ? <span>Edited</span> : null}
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

                                <button onClick={() => openForwardModal(msg.id)}>
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

                {activeConversation.conversationType === "direct" &&
                activeOtherUser &&
                typingUsers[activeOtherUser.id] ? (
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
        <div className="chatModal">
          <div className="chatModalCard">
            <h3>Create Group</h3>

            <input
              className="chatSearch"
              placeholder="Group name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />

            <textarea
              className="chatProviderTextarea"
              placeholder="Group description (optional)"
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              rows={3}
            />

            <div className="chatUserSelect noScrollbar">
              {users.map((u) => (
                <label key={u.id} className="chatUserSelectItem">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(u.id)}
                    onChange={() => toggleSelectedUser(u.id)}
                  />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>

            <div className="chatModalActions">
              <button className="chatSmallPrimaryBtn" onClick={handleCreateGroup}>
                Create
              </button>

              <button
                className="chatSmallGhostBtn"
                onClick={() => {
                  setShowGroupModal(false);
                  setGroupName("");
                  setGroupDescription("");
                  setSelectedUsers([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showForwardModal ? (
        <div className="chatModal">
          <div className="chatModalCard">
            <h3>Forward to</h3>

            <div className="chatForwardList noScrollbar">
              {forwardTargets.length === 0 ? (
                <div className="chatEmptyCard">No other conversations available.</div>
              ) : (
                forwardTargets.map((c) => (
                  <button
                    key={c.id}
                    className="chatForwardItem"
                    onClick={() => handleForwardToConversation(c.id)}
                  >
                    <strong>{getConversationDisplayName(c)}</strong>
                    <span>{getConversationSubtitle(c)}</span>
                  </button>
                ))
              )}
            </div>

            <div className="chatModalActions">
              <button
                className="chatSmallGhostBtn"
                onClick={() => {
                  setShowForwardModal(false);
                  setForwardMessageId("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}