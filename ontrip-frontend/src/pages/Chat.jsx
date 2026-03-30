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
  return item.lastMessageText || "Start chatting";
}

function isNearBottom(element, threshold = 120) {
  if (!element) return true;
  const distanceFromBottom =
    element.scrollHeight - element.scrollTop - element.clientHeight;
  return distanceFromBottom <= threshold;
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

  const activeOtherUser = useMemo(() => {
    return activeConversation?.otherUser || null;
  }, [activeConversation]);

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

        if ((convRes.conversations || []).length > 0) {
          await openConversation(convRes.conversations[0]);
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

      setActiveConversation((prev) => {
        if (!prev) return prev;
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

      const isCurrentConversation =
        openedConversationId &&
        openedConversationId === String(conversation.id);

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

      setConversations((prev) => {
        const withoutCurrent = prev.filter(
          (item) => String(item.id) !== String(conversation.id)
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

      setActiveConversation((prev) => {
        if (!prev) return prev;
        if (String(prev.id) !== String(conversation.id)) return prev;
        return conversation;
      });

      setMessages((prev) => {
        if (!isCurrentConversation) return prev;

        const exists = prev.some((item) => String(item.id) === String(message.id));
        if (exists) return prev;
        return [...prev, message];
      });
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

      const socket = getSocket();

      if (activeConversation?.id) {
        socket.emit("conversation:leave", { conversationId: activeConversation.id });
      }

      setActiveConversation(conversation);
      setTypingUsers({});
      shouldStickToBottomRef.current = true;

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
      formData.append("receiverId", activeConversation.otherUser.id);
      formData.append("text", text.trim());

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

      const socket = getSocket();
      socket.emit("typing:stop", { conversationId: activeConversation.id });
    } catch (err) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
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

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return users;

    return users.filter((item) => {
      const bag = `${item.name} ${item.email} ${item.city} ${item.role}`.toLowerCase();
      return bag.includes(q);
    });
  }, [users, userSearch]);

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

            <input
              className="chatSearch"
              placeholder="Search users..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
            />

            <div className="chatSectionLabel">Recent Conversations</div>

            <div className="chatConversationList">
              {conversations.length === 0 ? (
                <div className="chatEmptyCard">No conversations yet.</div>
              ) : (
                conversations.map((item) => (
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
                        <span>{formatMessageTime(item.lastMessageAt)}</span>
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
                    {activeOtherUser?.avatar ? (
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
                    <span
                      className={`chatPresenceDot ${
                        activeOtherUser?.isOnline ? "online" : "offline"
                      }`}
                    />
                  </div>

                  <div>
                    <div className="chatHeaderName">{activeOtherUser?.name || "User"}</div>
                    <div className="chatHeaderMeta">
                      {activeOtherUser?.isOnline
                        ? "Online"
                        : formatLastSeen(activeOtherUser?.lastSeenAt)}
                    </div>
                  </div>
                </div>
              </div>

              <div
                ref={messagesRef}
                className="chatMessages"
                onScroll={handleMessagesScroll}
              >
                {loadingMessages ? (
                  <div className="chatEmptyCard">Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className="chatEmptyCard">No messages yet. Start the conversation.</div>
                ) : (
                  messages.map((msg) => {
                    const isMe =
                      String(msg.sender?._id || msg.sender?.id || msg.sender) ===
                      String(user?.id);

                    return (
                      <div
                        key={msg.id}
                        className={`chatBubbleRow ${isMe ? "me" : "other"}`}
                      >
                        <div className={`chatBubble ${isMe ? "me" : "other"}`}>
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

                          <div className="chatBubbleMeta">
                            <span>{formatMessageTime(msg.createdAt)}</span>
                            {isMe ? (
                              <span>
                                {msg.seenBy?.some((id) => String(id) !== String(user?.id))
                                  ? "Seen"
                                  : "Sent"}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}

                {activeOtherUser && typingUsers[activeOtherUser.id] ? (
                  <div className="chatTyping">Typing...</div>
                ) : null}
              </div>

              <div className="chatComposerBar">
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
    </div>
  );
}