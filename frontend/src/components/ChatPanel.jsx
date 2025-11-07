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

  const handleSend = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    const event = inGame ? "game:message" : "chat:message";
    socket.emit(event, { code: roomCode, user, text });
    setText("");
  };

  // Auto scroll when new messages arrive
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // Detect user scroll
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
          <div key={i} className={`chat-message ${m.status}-msg`}>
            <p className="chat-text">
              {m.user &&
                `${m.status == "success" ? "Correct: " : m.user.name + ": "}`}
              {m.text}
              {m.similarWord && (
                <span className="similar-badge">
                  similar word - {m.similarWord.type}
                </span>
              )}
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
        <button
          type="button"
          className="scroll-to-bottom"
          onClick={handleScrollToBottom}
        >
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
