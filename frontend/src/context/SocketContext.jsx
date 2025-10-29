import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useMemo,
} from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";
import { useNavigate } from "react-router-dom";

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { token, logout } = useAuth();
  const socketRef = useRef(null); // 👈 guardamos la instancia aquí
  const [isConnected, setIsConnected] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // desconectar socket si existe y no hay token
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // si ya hay socket, no hacemos nada
    if (socketRef.current) return;

    const newSocket = io("http://localhost:4000", {
      autoConnect: true,
      auth: { token, override: true },
      // reconnectionAttempts: 3,
      // reconnectionDelay: 1000,
    });

    // handlers globales de conexion
    const handleConnect = () => {
      console.log("✅ Socket conectado:", newSocket.id);
      setIsConnected(true);
    };

    const handleDisconnect = (reason) => {
      console.warn("❌ Socket desconectado:", reason);
      setIsConnected(false);
    };

    const handleConnectError = (err) => {
      // si back rechaza conexion hacer logout
      console.error("⚠️ Error al conectar socket:", err.message);
      // logout();
    };

    const handleRoomClosed = ({ roomCode, userName }) => {
      console.log(`🚪 Room ${roomCode} cerrada por ${userName}`);
      navigate("/home");
    };

    // registro handlers
    newSocket.on("connect", handleConnect);
    newSocket.on("connect_error", handleConnectError);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.on("room:close", handleRoomClosed);

    socketRef.current = newSocket;

    return () => {
      // limpio al desconectar
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      socket.off("room:close", handleRoomClosed);
      newSocket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [token]); // solo dependemos del token

  useEffect(() => {
    if (socketRef.current)
      console.log(
        "SocketContext socket listo:",
        socketRef.current.id,
        socketRef.current.rooms
      );
  }, [socketRef.current]);

  const contextValue = { socket: socketRef.current, isConnected };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context)
    throw new Error("useSocket debe usarse dentro de un SocketProvider");
  return context;
}
