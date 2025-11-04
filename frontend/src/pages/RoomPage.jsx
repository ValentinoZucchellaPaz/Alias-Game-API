import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import TeamList from "../components/TeamList";
import ChatPanel from "../components/ChatPanel";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "./css/room-page.css";
import Timer from "../components/Timer";
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

    const handlePlayerJoined = ({ userName, roomCode: code }) => {
      if (code !== roomCode) return;
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${userName} joined`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handlePlayerLeft = ({ userName, roomCode: code }) => {
      if (code !== roomCode) return;
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${userName} left`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleChatMessage = ({ user, text, timestamp }) => {
      setMessages((prev) => [...prev, { user, text, timestamp }]);
    };

    const handleCorrectAnswer = ({ user, text, timestamp, game }) => {
      setGameData(game);
      setMessages((prev) => [
        ...prev,
        {
          user,
          text: `✅ Correct answer! ${user.name} guessed: ${text}`,
          timestamp,
          success: true,
        },
      ]);
    };

    const handleTeamState = (teams) => {
      setTeams({
        red: teams.red || [],
        blue: teams.blue || [],
      });
    };

    const handleGameStarted = ({ game }) => {
      setGameData(game);
      setRoomState("in-game");
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: "🎮 Game started!",
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleTurnUpdated = ({ game }) => {
      setGameData(game);
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `🔁 New turn: ${game.currentTeam} - describer: ${game.currentDescriber}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleGameFinished = (results) => {
      setGameData((prev) => ({ ...prev, results }));
      setRoomState("lobby");
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: "🏁 Game over!",
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleTabooWord = ({ user, text, word, message }) => {
      setError(message);
    };

    const handleRoomUpdate = ({ globalScore, games }) => {
      setRoomData((prev) => ({ ...prev, globalScore, games }));
    };

    socket.on("player:joined", handlePlayerJoined);
    socket.on("player:left", handlePlayerLeft);
    socket.on("chat:message", handleChatMessage);
    socket.on("team-state", handleTeamState);
    socket.on("game:started", handleGameStarted);
    socket.on("game:correct-answer", handleCorrectAnswer);
    socket.on("game:turn-updated", handleTurnUpdated);
    socket.on("game:finished", handleGameFinished);
    socket.on("game:taboo-word", handleTabooWord);
    socket.on("room:updated", handleRoomUpdate);

    return () => {
      socket.off("player:joined", handlePlayerJoined);
      socket.off("player:left", handlePlayerLeft);
      socket.off("chat:message", handleChatMessage);
      socket.off("team-state", handleTeamState);
      socket.off("game:started", handleGameStarted);
      socket.off("game:correct-answer", handleCorrectAnswer);
      socket.off("game:turn-updated", handleTurnUpdated);
      socket.off("game:finished", handleGameFinished);
      socket.off("game:taboo-word", handleTabooWord);
      socket.off("room:updated", handleRoomUpdate);
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

  // Render
  if (loading)
    return (
      <p style={{ textAlign: "center", margin: "50% auto" }}>Loading room...</p>
    );

  return (
    <div className="room-page">
      {error && (
        <p style={{ color: "red", textAlign: "center", marginBottom: "10px" }}>
          Error: {error}
        </p>
      )}

      <RoomHeader
        roomCode={roomCode}
        roomState={roomState}
        gameData={gameData}
        user={user}
        onStartGame={handleStartGame}
        onLeaveRoom={handleLeaveRoom}
      />

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
    (roomState === "lobby" ?? red ?? blue) && (
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
    (roomState === "lobby" ?? red ?? blue) && (
      <div className="results-panel">
        <h2>🏁 Game Results</h2>
        <p>Red Team: {red} pts</p>
        <p>Blue Team: {blue} pts</p>
      </div>
    )
  );
}
