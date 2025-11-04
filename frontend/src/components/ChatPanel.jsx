import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import "./css/chat-panel.css";

export default function ChatPanel({ messages, socket, roomCode, inGame }) {
  const [text, setText] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  console.log("User in ChatPanel:", user);

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const event = inGame ? "game:message" : "chat:message";
    console.log("event to emit:", event);
    console.log("In game status:", inGame);
    socket.emit(event, { code: roomCode, user, text });
    setText("");
  };

  // scroll down to the bottom if autoscroll detected
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // detect when user makes an autoscroll
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const isAtBottom = el.scrollHeight - el.scrollTop <= el.clientHeight + 50;

    if (isAtBottom) {
      setAutoScroll(true);
      setShowScrollButton(false);
    } else {
      setAutoScroll(false);
      setShowScrollButton(true);
    }
  };

  const handleScrollToBottom = () => {
    if (!messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    setAutoScroll(true);
    setShowScrollButton(false);
  };

  return (
    <form onSubmit={handleSend} className="chat-panel">
      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={`chat-message ${
              m.system ? "system-msg" : m.success ? "success-msg" : "user-msg"
            }`}
          >
            <p className="chat-text">
              {m.system ? m.text : `${m.user.name}: ${m.text}`}
            </p>
            <span className="chat-timestamp">
              {new Date(m.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {showScrollButton && (
        <button className="scroll-to-bottom" onClick={handleScrollToBottom}>
          ↓
        </button>
      )}

      <div className="chat-input-area">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button type="submit">Enviar</button>
      </div>
    </form>
  );
}
