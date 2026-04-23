import { useEffect, useRef, useState } from "react";
import { apiFetch, isLoggedIn } from "../lib/api";
import "./AiTravelChat.css";

export default function AiTravelChat() {
  const [message, setMessage] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I’m your OnTrip AI assistant. Ask me about trips, providers, vehicles, prices, packages, budget, or places.",
    },
  ]);

  const messagesRef = useRef(null);

  function scrollToBottom() {
    requestAnimationFrame(() => {
      if (messagesRef.current) {
        messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
      }
    });
  }

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  async function handleAsk(e) {
    e.preventDefault();

    const cleanMessage = message.trim();
    if (!cleanMessage || sending) return;

    if (!isLoggedIn()) {
      setMsg("Please login first to use AI chat.");
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: cleanMessage,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setMessage("");
    setMsg("");
    setSending(true);

    try {
      const data = await apiFetch("/api/ai-planner/chat", {
        method: "POST",
        body: JSON.stringify({
          message: cleanMessage,
          plan: {
            page: "OnTrip AI Chat",
            instruction:
              "Help user with OnTrip travel providers, vehicles, travel planners, prices, packages, budget, destinations, routes, and general travel guidance.",
          },
          history: nextMessages.slice(-8).map((item) => ({
            role: item.role,
            content: item.text,
          })),
        }),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: data?.reply || "Sorry, I could not reply right now.",
        },
      ]);
    } catch (err) {
      setMsg(err.message || "Failed to get AI reply.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="aiTravelChatPage">
      <div className="aiTravelChatShell">
        <div className="aiTravelChatHeader">
          <div>
            <h1>OnTrip AI Chat</h1>
            <p>Ask about trips, providers, vehicles, prices, and packages.</p>
          </div>

          <div className="aiTravelChatAvatar">AI</div>
        </div>

        {msg ? <div className="aiTravelChatError">{msg}</div> : null}

        <div className="aiTravelChatMessages" ref={messagesRef}>
          {messages.map((item) => (
            <div
              key={item.id}
              className={`aiTravelChatRow ${
                item.role === "user" ? "user" : "assistant"
              }`}
            >
              <div className="aiTravelChatBubble">{item.text}</div>
            </div>
          ))}

          {sending ? (
            <div className="aiTravelChatRow assistant">
              <div className="aiTravelChatBubble">Typing...</div>
            </div>
          ) : null}
        </div>

        <form className="aiTravelChatInputBar" onSubmit={handleAsk}>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message OnTrip AI..."
            rows={1}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleAsk(e);
              }
            }}
          />

          <button type="submit" disabled={sending || !message.trim()}>
            ➤
          </button>
        </form>
      </div>
    </div>
  );
}