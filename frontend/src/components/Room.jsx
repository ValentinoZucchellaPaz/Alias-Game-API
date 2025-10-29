import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import GameRoom from "./GameRoom";

const socket = io("http://localhost:4000");

export default function Room() {
  const [roomReady, setRoomReady] = React.useState(false);
  const { roomId } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    socket.emit("join-room", { id: roomId });

    socket.on("room-joined", (data) => {
      console.log(`Joined room: ${data.id}`);
      setRoomReady(true);
    });

    return () => {
      socket.emit("leave-room", { id: roomId });
    };
  }, [roomId]);

  if (!roomReady) {
    return <div>Joining room...</div>;
  }

  return (
    <div className="room-container">
      <h1>Room {roomId}</h1>

      <GameRoom />
      <button
        onClick={() => {
          socket.emit("leave-room", { id: roomId });
          navigate("/"); // go back to lobby
        }}
      >
        Leave Room
      </button>
    </div>
  );
}
