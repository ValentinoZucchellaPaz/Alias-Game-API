import { socketCache } from "../config/redis.js";
import gameService from "../services/game.service.js";
import roomService from "../services/room.service.js";
import { logger } from "../utils/logger.js";
import { buildPayload, SocketEventEmitter } from "./SocketEventEmmiter.js";

export const chatMessageHandler = async ({ code, user, text }) => {
  SocketEventEmitter.sendMessage({ code, user, text });
};

export const gameMessageHandler = async ({ code, user, text }) => {
  if (!text?.trim()) return;

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
};

export const skipWordHandler = async ({ userId, roomCode }) => {
  try {
    const game = await gameService.getNewWord(userId, roomCode);
    SocketEventEmitter.sendNewWord(userId, roomCode, game);
  } catch (error) {
    SocketEventEmitter.sendNewWord(userId, roomCode, null, error.message); // important: if there's active cooldown getNewWord throws
  }
};

export const joinTeamHandler = async ({ roomCode, team, userId }) => {
  await roomService.updateTeams(roomCode, team, userId);
};

export const disconnectHandler = async (io, socket, reason) => {
  // Retrieve room the socket was in, call service to update DB/Redis and emit event (leave that room)
  const roomCode = socket.currentRoom;
  if (roomCode) {
    const userId = socket.userId;
    const userName = socket.userName;
    await roomService.leaveRoom({
      roomCode,
      userId,
      userName,
    });
    io.to(roomCode).emit(
      "player:left",
      buildPayload(
        "player:left",
        "info",
        { roomCode, userId, userName },
        `${userName} left the room`
      )
    );
  }

  // Clear mapping (socket -> userId) of Redis
  await socketCache.del(socket.userId);
  logger.info(`🗑️ Cleared socket mapping for userId=${socket.userId}`);
  logger.info(`Socket desconectado: ${socket.id}; Reason: ${reason}`);
};
