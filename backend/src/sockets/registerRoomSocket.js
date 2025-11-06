import { socketCache } from "../config/redis.js";
import gameService from "../services/game.service.js";
import roomService from "../services/room.service.js";
import { AppError } from "../utils/errors.js";
import jwt from "../utils/jwt.js";
import { SocketEventEmitter } from "./SocketEventEmmiter.js";

// src/sockets/registerRoomSocket.js
/**
 *
 * @param {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} io
 */
export default function registerRoomSocket(io) {
  // middleware
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token in handshake auth"));

    const payload = jwt.verifyAccessToken({ token });
    if (!payload) return next(new Error("Invalid token in handshake auth")); // lanza evento "connect_error" que el cliente debe recibir y rechaza conexion del socket

    socket.userId = payload.id;
    socket.userName = payload.name;
    socket.userRole = payload.role;

    // antes de esto, veo de que no haya ningun otro socket abierto del mismo usuario, si lo hay y no me dijeron q lo sobreescriba lo dejo
    const overrideSocket = socket.handshake.auth?.override;
    const prevSocket = await socketCache.get(socket.userId);
    if (prevSocket && !overrideSocket)
      return next(new AppError(`ya existe una conexion abierta para este user ${socket.userId}`));
    next();
  });

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`);

    socketCache.set(socket.userId, socket.id);

    socket.on("chat:message", ({ code, user, text }) => {
      SocketEventEmitter.sendMessage({ code, user, text });
    });

    socket.on("game:message", async ({ code, user, text }) => {
      if (!text?.trim()) return;

      try {
        const result = await gameService.checkForAnswer(user, text, code);

        switch (result.type) {
          case "answer":
            if (result.correct) {
              SocketEventEmitter.gameCorrectAnswer(code, user, text, result.game);
            } else {
              SocketEventEmitter.sendMessage({ code, user, text });
            }
            break;

          case "taboo":
            SocketEventEmitter.tabooWord(user, text, result.word);
            break;

          default:
            SocketEventEmitter.sendMessage({ code, user, text });
            break;
        }
      } catch (err) {
        console.error("Error processing game message: ", err);
      }
    });

    socket.on("join-team", async ({ roomCode, team, userId }) => {
      try {
        await roomService.updateTeams(roomCode, team, userId);
      } catch (error) {
        console.log("error changing team: ", error);
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
            userId,
            userName,
          });
          io.to(roomCode).emit("player:left", {
            roomCode,
            userId,
            userName,
            timestamp: new Date().toISOString(),
          });
        }

        // actualizar para que tenga en cuenta desconexiones durante un juego

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
