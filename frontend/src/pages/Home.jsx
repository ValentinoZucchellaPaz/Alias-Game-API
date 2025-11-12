import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import RoomList from "../components/RoomList";
import api from "../lib/api";
import "./css/home.css";

export default function Home() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { socket, isConnected } = useSocket();

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await api.get("/rooms", {
        withCredentials: true,
      });
      console.log("rooms", res.data);
      setRooms(res.data);
    } catch (err) {
      setError(err.response.data.message || err.message);
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
      const res = await api.post("/rooms", {
        withCredentials: true,
      });

      if (res.status === 201) {
        navigate(`/room/${res.data.code}`);
      }
    } catch (err) {
      setError(err.response.data.message || err.message);
    }
  };

  const handleJoin = async (roomCode) => {
    try {
      const res = await api.post(
        `/rooms/${roomCode}/join`,
        {},
        { withCredentials: true }
      );

      if (res.status === 200) {
        navigate(`/room/${roomCode}`);
      }
    } catch (err) {
      setError(err.response.data.message || err.message);
    }
  };

  if (!isConnected) {
    return (
      <div className="lobby-container">
        <h2>🔌 Connecting to server...</h2>
      </div>
    );
  }

  return (
    <div className="lobby-container">
      <h1>🎮 Alias Game Lobby</h1>
      {error && (
        <p style={{ color: "red", textAlign: "center" }}>Error: {error}</p>
      )}

      {/* Create Room */}
      <div className="create-room-form">
        {/* in the future create room w settings */}

        <button
          type="submit"
          onClick={handleCreateRoom}
          className="create-button"
        >
          Create Room
        </button>
        <button
          onClick={fetchRooms}
          disabled={loading}
          className="refresh-button"
        >
          {loading ? "Refreshing..." : "🔄 Refresh Rooms"}
        </button>
      </div>

      <RoomList rooms={rooms} onJoin={handleJoin} />
    </div>
  );
}
