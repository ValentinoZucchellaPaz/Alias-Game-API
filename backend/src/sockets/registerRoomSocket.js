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

// FIXME: idea, que se cambien los eventos para que se dependa menos de las props que se pasan del front, sacar info de redis o de la instancia del socket de aca

/**
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

    /**
     * Socket Event Handlers
     */
    socket.on(
      "chat:message",
      withSocketErrorHandling(socket, async ({ code, user, text }) => {
        SocketEventEmitter.sendMessage({ code, user, text });
      })
    );

    socket.on(
      "game:message",
      withSocketErrorHandling(socket, async ({ code, user, text }) => {
        if (!text?.trim()) return;

        try {
          const result = await gameService.checkForAnswer(user.id, text, code);

          switch (result.type) {
            case "answer":
              if (result.correct) {
                SocketEventEmitter.gameCorrectAnswer(code, user, text, result.game, text);
              } else {
                SocketEventEmitter.sendMessage({ code, user, text });
              }
              break;

            case "taboo":
              SocketEventEmitter.tabooWord(user, text, result.word);
              break;

            case "similar":
              SocketEventEmitter.similarWord(code, user, text, result?.similarWord);
              break;

            default:
              SocketEventEmitter.sendMessage({ code, user, text });
              break;
          }
        } catch (err) {
          console.error("Error processing game message: ", err);
        }
      })
    );

    socket.on(
      "game:skip-word",
      withSocketErrorHandling(socket, async ({ userId, roomCode }) => {
        try {
          const game = await gameService.getNewWord(userId, roomCode);
          SocketEventEmitter.sendNewWord(userId, roomCode, game);
        } catch (error) {
          SocketEventEmitter.sendNewWord(userId, roomCode, null, error.message);
        }
      })
    );

    socket.on(
      "join-team",
      withSocketErrorHandling(socket, async ({ roomCode, team, userId }) => {
        await roomService.updateTeams(roomCode, team, userId);
      })
    );

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

        // Limpiar mapping(socket -> userId) de Redis
        await socketCache.del(socket.userId);
        console.log(`🗑️ Cleared socket mapping for userId=${socket.userId}`);
        console.log(`Socket desconectado: ${socket.id}; Reason: ${reason}`);
      } catch (err) {
        console.error(`Error handling disconnect for userId=${socket.userId}`, err);
      }
    });

    // Global socket error handler for middlewares.
    socket.on("error", (err) => socketErrorHandler(socket, err));
  });
}

/**
 * `WithSocketErrorHandling` wrapper to catch and handle errors in each event
 * Places the handler logic inside a try-catch block and sends error responses via socket
 */
export function withSocketErrorHandling(socket, handler) {
  return async (...args) => {
    try {
      console.log(`Handling event for socket ${socket.id} with args:`, args);
      await handler(...args);
    } catch (err) {
      console.error(`⚠️ Error in event handler for socket ${socket.id}:`, err);
      socketErrorHandler(socket, err);
    }
  };
}
