import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import TeamList from "../components/TeamList";
import ChatPanel from "../components/ChatPanel";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import "./css/room-page.css";
import Timer from "../components/Timer";

export default function RoomPage() {
  const { roomCode } = useParams();
  const { socket, isConnected } = useSocket();
  const { user } = useAuth();
  const [gameData, setGameData] = useState(null);
  const [roomState, setRoomState] = useState("lobby");
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
      setRoomState("finished");
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: "🏁 Game over!",
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    socket.on("player:joined", handlePlayerJoined);
    socket.on("player:left", handlePlayerLeft);
    socket.on("chat:message", handleChatMessage);
    socket.on("team-state", handleTeamState);
    socket.on("game:started", handleGameStarted);
    socket.on("game:correct-answer", handleCorrectAnswer);
    socket.on("game:turn-updated", handleTurnUpdated);
    socket.on("game:finished", handleGameFinished);

    return () => {
      socket.off("player:joined", handlePlayerJoined);
      socket.off("player:left", handlePlayerLeft);
      socket.off("chat:message", handleChatMessage);
      socket.off("team-state", handleTeamState);
      socket.off("game:started", handleGameStarted);
      socket.off("game:correct-answer", handleCorrectAnswer);
      socket.off("game:turn-updated", handleTurnUpdated);
      socket.off("game:finished", handleGameFinished);
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
      console.error(error);
      alert("Error starting the game");
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

      <header className="room-header">
        <h1>Room: {roomCode}</h1>

        <div className="header-controls">
          {roomState === "in-game" && gameData && (
            <div className="game-status-wrapper">
              <GameStatusPanel gameData={gameData} user={user} />
              <Timer
                key={gameData?.currentTeam}
                seconds={60}
                resetKey={gameData?.currentTeam}
                onComplete={() => console.log("⏰ end of your turn")}
              />
            </div>
          )}

          {roomState === "lobby" && (
            <button className="start-button" onClick={handleStartGame}>
              Start Game
            </button>
          )}
          <button className="leave-button" onClick={handleLeaveRoom}>
            Leave
          </button>
        </div>
      </header>

      <main className="room-content">
        <aside className="room-sidebar">
          <TeamList
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

      {roomState === "finished" && gameData && (
        <div className="results-panel">
          <h2>🏁 Final Results</h2>
          <p>Red Team: {gameData.results?.red ?? 0} pts</p>
          <p>Blue Team: {gameData.results?.blue ?? 0} pts</p>
        </div>
      )}
    </div>
  );
}

// -----------------------------
// 📊 Live Game Status Component
// -----------------------------
function GameStatusPanel({ gameData, user }) {
  const isDescriber = gameData.currentDescriber === user.id;
  const currentWord = gameData?.wordToGuess?.word || "—";
  const redScore = gameData?.teams?.red?.score ?? 0;
  const blueScore = gameData?.teams?.blue?.score ?? 0;

  return (
    <div className="game-status-panel">
      <div className="scores">
        <span className="score red">🔴 {redScore}</span>
        <span className="score blue">🔵 {blueScore}</span>
      </div>
      {isDescriber && (
        <p className="current-word">
          Word: <strong>{currentWord}</strong>
        </p>
      )}
    </div>
  );
}
