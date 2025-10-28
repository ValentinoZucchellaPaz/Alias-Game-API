import { socketCache } from "../config/redis.js";
import roomService from "../services/room.service.js";
import jwt from "../utils/jwt.js";

// src/sockets/registerRoomSocket.js
/**
 *
 * @param {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} io
 */
export default function registerRoomSocket(io) {
  // middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token in handshake auth"));

    const payload = jwt.verifyAccessToken({ token });
    if (!payload) return next(new Error("Invalid token in handshake auth")); // lanza evento "connect_error" que el cliente debe recibir y rechaza conexion del socket

    socket.userId = payload.id;
    socket.userName = payload.name;
    socket.userRole = payload.role;

    next();
  });

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`);
    socketCache.set(socket.userId, socket.id);

    socket.on("chat:message", ({ code, user, text }) => {
      socket.broadcast
        .to(code)
        .emit("chat:message", { user, text, timestamp: new Date().toISOString() });
    });

    socket.on("join-team", async ({ roomCode, team, userId }) => {
      try {
        await roomService.updateTeams(roomCode, team, userId);
      } catch (error) {
        console.log("error cambiando de equipo", err);
      }
    });

    socket.on("disconnect", async (reason) => {
      try {
        // Recuperar todas las rooms del socket (excepto la propia del socket)
        // Llamar al service para actualizar DB/Redis y emitir evento
        const roomCode = socket.currentRoom;
        if (roomCode) {
          const userId = socket.userId;
          const userName = socket.userName;
          await roomService.leaveRoom({
            roomCode,
            userId: socket.userId,
            userName: socket.userName,
          });

          io.to(roomCode).emit("player:left", {
            userId,
            userName,
          });
        }

        // Limpiar mapping de Redis
        await socketCache.del(socket.userId);
        console.log(`🗑️ Cleared socket mapping for userId=${socket.userId}`);
        console.log(`Socket desconectado: ${socket.id}; Reason: ${reason}`);
      } catch (err) {
        console.error(`Error handling disconnect for userId=${socket.userId}`, err);
      }
    });
  });
}
