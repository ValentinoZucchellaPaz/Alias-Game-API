import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function ChatPanel({ messages, socket, roomCode }) {
  const [text, setText] = useState("");
  const { user } = useAuth();

  const handleSend = () => {
    if (!text.trim()) return;
    socket.emit("chat:message", { code: roomCode, user, text });
    setText("");
  };

  return (
    <div>
      <div
        className="chat-messages"
        style={{ maxHeight: 300, overflowY: "auto" }}
      >
        {messages.map((m, i) => (
          <p key={i}>{m.system ? m.text : `${m.user.name}: ${m.text}`}</p>
        ))}
      </div>
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe un mensaje"
      />
      <button onClick={handleSend}>Enviar</button>
    </div>
  );
}
