import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import axios from "../lib/api";
import TeamList from "../components/TeamList";
import ChatPanel from "../components/ChatPanel";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";

export default function RoomPage() {
  const { roomCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [roomData, setRoomData] = useState(null);
  const [teams, setTeams] = useState({ red: [], blue: [] });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch inicial de la room
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/rooms/${roomCode}`);
        const data = res.data;

        // Validaciones
        if (data.status == "finished") throw new Error("Room no activa");
        if (!data.players.some((p) => p.id === user.id && p.active))
          throw new Error("No perteneces a esta room");
        setRoomData(data);
        setTeams(data.teams);
        setMessages(data.chat || []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Error al cargar la room");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, user]);

  // Eventos de socket dentro de la room
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePlayerJoined = ({ userId, userName, roomCode: code }) => {
      if (code !== roomCode) return;
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${userName} se unió a la room ${code}` },
      ]);
    };

    const handlePlayerLeft = ({ userId, userName }) => {
      console.log("a player has left");
      setMessages((prev) => [
        ...prev,
        { system: true, text: `${userName} salió` },
      ]);
    };

    const handleChatMessage = ({ user, text, timestamp }) => {
      setMessages((prev) => [...prev, { user, text, timestamp }]);
    };

    const handleTeamState = ({ red, blue }) => {
      setTeams({ red, blue });
    };

    socket.on("player:joined", handlePlayerJoined);
    socket.on("player:left", handlePlayerLeft);
    socket.on("chat:message", handleChatMessage);
    socket.on("team-state", handleTeamState);

    return () => {
      socket.off("player:joined", handlePlayerJoined);
      socket.off("player:left", handlePlayerLeft);
      socket.off("chat:message", handleChatMessage);
      socket.off("team-state", handleTeamState);
    };
  }, [socket, isConnected, roomCode]);

  const handleJoinTeam = (teamName) => {
    if (!socket) return;
    socket.emit("join-team", {
      roomCode,
      team: teamName,
      userId: user.id,
    });
  };

  const handleStartGame = () => {
    if (!socket) return;
    socket.emit("start-game", { roomCode });
  };

  if (loading) return <p>Cargando room...</p>;
  if (error) return <p>Error: {error}</p>;

  return (
    <div className="room-page">
      <h1>Room: {roomCode}</h1>

      <TeamList
        teams={teams}
        onJoinRed={() => handleJoinTeam("red")}
        onJoinBlue={() => handleJoinTeam("blue")}
      />

      <ChatPanel messages={messages} socket={socket} roomCode={roomCode} />

      <button onClick={handleStartGame}>Iniciar Juego</button>
    </div>
  );
}
