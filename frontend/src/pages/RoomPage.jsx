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
  const [gameData, setGameData] = useState(null); // <- proximamente aca se guarda data de juego
  const [roomState, setRoomState] = useState("lobby");
  const [teams, setTeams] = useState({ red: [], blue: [] });
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();

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
        // setRoomData(data);
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
      console.log("username se ha unido ", userName);
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${userName} se unió`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handlePlayerLeft = ({ userId, userName, roomCode: code }) => {
      if (code !== roomCode) return;
      console.log("username se ha ido ", userName);
      setMessages((prev) => [
        ...prev,
        {
          system: true,
          text: `${userName} salió`,
          timestamp: new Date().toISOString(),
        },
      ]);
    };

    const handleChatMessage = ({ user, text, timestamp }) => {
      setMessages((prev) => [...prev, { user, text, timestamp }]);
    };

    const handleCorrectAnswer = ({ user, text, timestamp }) => {
      setMessages((prev) => [
        ...prev,
        {
          user,
          text: `¡Respuesta correcta! ${user.name} adivinó la palabra: ${text}`,
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
    };

    const handleTurnUpdated = ({ game }) => {
      setGameData(game);
      console.log("🔁 Turno actualizado:", game);
    };

    socket.on("player:joined", handlePlayerJoined);
    socket.on("player:left", handlePlayerLeft);
    socket.on("chat:message", handleChatMessage);
    socket.on("team-state", handleTeamState);
    socket.on("game:started", handleGameStarted);
    socket.on("game:correct-answer", handleCorrectAnswer);
    socket.on("game:turn-updated", handleTurnUpdated);
    socket.on("game:finished", (results) =>
      console.log("se ha terminado jodeh ", results)
    );
    return () => {
      socket.off("player:joined", handlePlayerJoined);
      socket.off("player:left", handlePlayerLeft);
      socket.off("chat:message", handleChatMessage);
      socket.off("team-state", handleTeamState);
      socket.off("game:started", handleGameStarted);
      socket.off("game:correct-answer", handleCorrectAnswer);
      socket.off("game:turn-updated", handleTurnUpdated);
      socket.off("game:finished", (results) =>
        console.log("se ha terminado jodeh ", results)
      );
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

  const handleStartGame = async () => {
    console.log("Starting game for room:", roomCode);
    const res = await api.post(`/rooms/${roomCode}/start`, {
      withCredentials: true,
    });
    console.log("start game response:", res);
    if (res.status === 200) {
      setRoomState("in-game");
      setGameData(res.data);
      alert("Juego iniciado");
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await api.delete(`/rooms/${roomCode}/leave`);
      navigate("/");
    } catch (error) {
      setError(error.response.data.message);
    }
  };

  if (loading)
    return (
      <p style={{ textAlign: "center", margin: "50% auto" }}>
        Cargando room...
      </p>
    );
  // if (error) return <p>Error: {error}</p>;
  return (
    <div className="room-page">
      {error && (
        <p style={{ color: "red", textAlign: "center", marginBottom: "10px" }}>
          Error: {error}
        </p>
      )}
      <header className="room-header">
        <h1>Room: {roomCode}</h1>
        <div>
          {gameData && (
            <>
              {gameData.currentDescriber == user.id &&
                gameData?.wordToGuess.word}
              <Timer seconds={60} onComplete={() => console.log("terminado")} />
            </>
          )}
          <button className="start-button" onClick={handleStartGame}>
            Iniciar Juego
          </button>
          <button className="leave-button" onClick={handleLeaveRoom}>
            Salir
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
    </div>
  );
}
