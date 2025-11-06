import { socketCache } from "../config/redis.js";
import gameService from "../services/game.service.js";
import roomService from "../services/room.service.js";
import {
  chatRateLimitMiddleware,
  gameChatRateLimitMiddleware,
  joinTeamRateLimitMiddleware,
} from "../middlewares/socketMiddlewares/events.js";
import { SocketEventEmitter } from "./SocketEventEmmiter.js";
import {
  socketAuthMiddleware,
  socketConnectionRateLimitMiddleware,
} from "../middlewares/socketMiddlewares/connection.js";
import { socketErrorHandler } from "../middlewares/socketErrorHandler.js";

// src/sockets/registerRoomSocket.js
/**
 *
 * @param {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} io
 */
export default function registerRoomSocket(io) {
  /*
   * socket connection middlewares
   */
  // Rate limiter middleware
  io.use(socketConnectionRateLimitMiddleware);
  // Socket Auth middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    console.log(`Socket conectado: ${socket.id}`);

    // Event rate limiters
    socket.use(chatRateLimitMiddleware(socket));
    socket.use(gameChatRateLimitMiddleware(socket));
    socket.use(joinTeamRateLimitMiddleware(socket));

    socketCache.set(socket.userId, socket.id);

    socket.on("chat:message", async ({ code, user, text }) => {
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

    socket.on("error", (err) => socketErrorHandler(socket, err));
  });
}
