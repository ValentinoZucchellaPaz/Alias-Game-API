import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import "./css/chat-panel.css";

export default function ChatPanel({ messages, socket, roomCode }) {
  const [text, setText] = useState("");
  const { user } = useAuth();

  const handleSend = () => {
    if (!text.trim()) return;
    socket.emit("chat:message", { code: roomCode, user, text });
    setText("");
  };

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        {messages.map((m, i) => (
          <p key={i} className={m.system ? "system-msg" : "user-msg"}>
            {m.system ? m.text : `${m.user.name}: ${m.text}`}
          </p>
        ))}
      </div>

      <div className="chat-input-area">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un mensaje..."
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
}
