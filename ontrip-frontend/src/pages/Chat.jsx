import { useMemo, useState } from "react";
import "./Chat.css";

const seed = [
  { from: "system", text: "Match with travelers going to the same destination (live location later)." },
  { from: "me", text: "Anyone going to Jaipur next week?" },
  { from: "other", text: "Yes! I’m going on Friday. Want to share itinerary?" },
];

export default function Chat() {
  const [messages, setMessages] = useState(seed);
  const [text, setText] = useState("");

  const buddy = useMemo(() => ({ name: "Travel Buddy", place: "Jaipur" }), []);

  function send() {
    if (!text.trim()) return;
    setMessages((m) => [...m, { from: "me", text }]);
    setText("");
  }

  return (
    <div className="container chat">
      <div className="chatHeader card">
        <div>
          <div className="chatTitle">Buddy Chat</div>
          <div className="chatSub">Suggested match: {buddy.place}</div>
        </div>
        <button className="btn">Enable live location (later)</button>
      </div>

      <div className="chatBox card">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.from === "me"
                ? "msg me"
                : m.from === "other"
                ? "msg other"
                : "msg sys"
            }
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="chatComposer card">
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type message..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn btnPrimary" onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
