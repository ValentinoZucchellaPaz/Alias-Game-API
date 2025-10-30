import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import RoomList from "../components/RoomList";
import api from "../lib/api";
import "./css/home.css";

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newRoom, setNewRoom] = useState("");
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("http://localhost:4000/api/rooms", {
        withCredentials: true,
      });
      setRooms(res.data);
    } catch (err) {
      console.error("Error al obtener rooms:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("http://localhost:4000/api/rooms", {
        withCredentials: true,
      });

      if (res.status === 201) {
        navigate(`/room/${res.data.code}`);
      }
    } catch (err) {
      console.error("Error al crear room:", err);
      alert("Error al crear sala. Ver consola para más detalles.");
    } finally {
      setNewRoom("");
    }
  };

  const handleJoin = async (roomCode) => {
    try {
      const res = await api.post(
        `http://localhost:4000/api/rooms/${roomCode}/join`,
        {},
        { withCredentials: true }
      );

      if (res.status === 200) {
        navigate(`/room/${roomCode}`);
      }
    } catch (err) {
      console.error("Error al unirse a la room:", err);
      alert("No se pudo unir a la sala. Ver consola.");
    }
  };

  if (!isConnected) {
    return (
      <div className="lobby-container">
        <h2>🔌 Conectando al servidor...</h2>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h1>🎮 Alias Game Lobby</h1>

      {/* Crear Room */}
      <form onSubmit={handleCreateRoom} className="create-room-form">
        <input
          type="text"
          placeholder="New room name"
          value={newRoom}
          onChange={(e) => setNewRoom(e.target.value)}
          className="create-input"
        />
        <button type="submit" className="create-button">
          Create Room
        </button>
      </form>

      {/* Botón Refetch */}
      <button
        onClick={fetchRooms}
        disabled={loading}
        className="refresh-button"
      >
        {loading ? "Refreshing..." : "🔄 Refresh Rooms"}
      </button>

      {/* Lista de rooms */}
      <RoomList rooms={rooms} onJoin={handleJoin} />
    </div>
  );
}
