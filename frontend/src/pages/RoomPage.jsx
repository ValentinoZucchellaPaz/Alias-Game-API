import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import TeamList from "../components/TeamList";
import ChatPanel from "../components/ChatPanel";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "./css/room-page.css";
import RoomHeader from "../components/RoomHeader";

export default function RoomPage() {
  const { roomCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [gameData, setGameData] = useState(null);
  const [roomState, setRoomState] = useState("lobby");
  const [roomData, setRoomData] = useState(null);
  const [teams, setTeams] = useState({ red: [], blue: [] });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Initial fetch
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/rooms/${roomCode}`);
        const data = res.data;

        if (data.status === "finished") throw new Error("Inactive room");
        if (!data.players.some((p) => p.id === user.id && p.active))
          throw new Error("You are not part of this room");

        setTeams(data.teams);
        setMessages(data.chat || []);
        if (data.game) {
          setGameData(data.game);
          setRoomState("in-game");
        }
      } catch (err) {
        console.error(err);
        setError(err.message || "Error loading room");
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [roomCode, user]);

  // Socket events
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleSocketEvent = ({ type, status, data, message, timestamp }) => {
      switch (type) {
        case "player:joined":
        case "player:left":
        case "room:close":
          setMessages((prev) => [
            ...prev,
            { text: message, status, timestamp },
          ]);
          break;

        case "chat:message":
          setMessages((prev) => [
            ...prev,
            {
              user: data.user,
              text: data.text,
              type: data.type,
              status,
              timestamp,
            },
          ]);
          break;

        case "team-state":
          setTeams({
            red: data.teams?.red || [],
            blue: data.teams?.blue || [],
          });
          break;

        case "game:started":
        case "game:turn-updated":
          setGameData(data.game);
          setRoomState("in-game");
          setMessages((prev) => [
            ...prev,
            { text: message, status, timestamp },
          ]);
          break;

        case "game:correct-answer":
          setGameData(data.game);
          setMessages((prev) => [
            ...prev,
            { user: data.user, text: message, status, timestamp },
          ]);
          break;

        case "game:finished":
          setGameData((prev) => ({ ...prev, results: data.results }));
          setRoomState("lobby");
          setMessages((prev) => [
            ...prev,
            { text: message, status, timestamp },
          ]);
          break;

        case "game:interrupted":
          setRoomState("lobby");
          setMessages((prev) => [
            ...prev,
            { text: message, status, timestamp },
          ]);
          break;

        case "game:new-word":
          if (status == "error" && message) {
            console.log("error en new word");
            setError(message);
            break;
          }
          setGameData(data.game);
          setMessages((prev) => [
            ...prev,
            { text: "A new word was chosen!", status, timestamp },
          ]);
          break;

        case "game:taboo-word":
          setError(message);
          break;

        case "game:similar-word":
          console.log(data.similarWord);
          setMessages((prev) => [
            ...prev,
            {
              user: data.user,
              text: message,
              status,
              timestamp,
              similarWord: data.similarWord,
            },
          ]);
          break;

        case "room:updated":
          setRoomData((prev) => ({ ...prev, ...data.roomInfo }));
          break;

        case "game:updated":
          setGameData((prev) => ({ ...prev, ...data.gameData }));
          setMessages((prev) => [
            ...prev,
            { text: "Game state updated", status, timestamp },
          ]);
          break;

        case "rateLimitWarning":
          if (data.type === "rate_limit") {
            setError(data.message || "Rate limit exceeded");
          }
          break;

        case "error":
          console.error("Socket error event:", data);
          setError(data.message || "Application error occurred");
          break;

        default:
          console.warn("Unhandled socket event:", type, data);
      }
    };

    // registrar todos los eventos con un listener genérico
    const eventNames = [
      "player:joined",
      "player:left",
      "chat:message",
      "team-state",
      "game:started",
      "game:correct-answer",
      "game:turn-updated",
      "game:finished",
      "game:interrupted",
      "game:taboo-word",
      "game:new-word",
      "game:similar-word",
      "game:updated",
      "room:updated",
      "rateLimitWarning",
      "error",
    ];

    eventNames.forEach((event) => socket.on(event, handleSocketEvent));

    return () => {
      eventNames.forEach((event) => socket.off(event, handleSocketEvent));
    };
  }, [socket, isConnected, roomCode]);

  // Actions
  const handleJoinTeam = (teamName) => {
    if (!socket) return;
    socket.emit("join-team", {
      roomCode,
      team: teamName,
      userId: user.id,
    });
  };

  const handleStartGame = async () => {
    try {
      const res = await api.post(`/rooms/${roomCode}/start`, {
        withCredentials: true,
      });
      if (res.status === 200) {
        setRoomState("in-game");
        setGameData(res.data);
      }
    } catch (error) {
      setError(error.response?.data?.message || "Error starting game");
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.delete(`/rooms/${roomCode}/leave`);
      navigate("/");
    } catch (error) {
      setError(error.response?.data?.message || "Error leaving the room");
    }
  };

  const handleSkipWord = () => {
    socket.emit("game:skip-word", { userId: user.id, roomCode });
  };

  // Render
  if (loading)
    return (
      <p style={{ textAlign: "center", margin: "50% auto" }}>Loading room...</p>
    );

  return (
    <div className="room-page">
      <button onClick={() => navigate("/")} className="home-button">
        Home
      </button>

      <RoomHeader
        roomCode={roomCode}
        roomState={roomState}
        gameData={gameData}
        user={user}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
        onSkipWord={handleSkipWord}
      />

      {error && (
        <p style={{ color: "red", textAlign: "center", margin: "10px auto" }}>
          Error: {error}
        </p>
      )}

      <main className="room-content">
        <aside className="room-sidebar">
          <GlobalResults
            red={roomData?.globalScore?.red}
            blue={roomData?.globalScore?.blue}
            roomState={roomState}
          />

          <GameResults // guarda resultados de ultimo juego pero puedo hacer que guarde historial
            red={gameData?.results?.red}
            blue={gameData?.results?.blue}
            roomState={roomState}
          />
          <TeamList
            user={user}
            teams={teams}
            onJoinRed={() => handleJoinTeam("red")}
            onJoinBlue={() => handleJoinTeam("blue")}
          />
        </aside>

        <section className="room-chat">
          <ChatPanel
            messages={messages}
            socket={socket}
            roomCode={roomCode}
            inGame={roomState === "in-game"}
          />
        </section>
      </main>
    </div>
  );
}

function GlobalResults({ red, blue, roomState }) {
  return (
    roomState === "lobby" &&
    !isNaN(red) &&
    !isNaN(blue) && (
      <div className="results-panel">
        <h2>🏁 Global Results</h2>
        <p>Red Team: {red} pts</p>
        <p>Blue Team: {blue} pts</p>
      </div>
    )
  );
}

// componente que muestra resultados finales
function GameResults({ red, blue, roomState }) {
  return (
    roomState === "lobby" &&
    !isNaN(red) &&
    !isNaN(blue) && (
      <div className="results-panel">
        <h2>🏁 Game Results</h2>
        <p>Red Team: {red} pts</p>
        <p>Blue Team: {blue} pts</p>
      </div>
    )
  );
}
