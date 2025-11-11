import { socketCache } from "../config/redis.js";
import { AppError } from "../utils/errors.js";

function buildPayload(type, status, data = {}, message = "") {
  return {
    type, // room:event-name
    status, // "success" | "error" | "info" | "system"
    data, // any
    message, // string
    timestamp: new Date().toISOString(),
  };
}

export class SocketEventEmitter {
  /** @type {import("socket.io").Server | null} */
  static io = null;

  static init(ioInstance) {
    if (SocketEventEmitter.io) {
      console.warn("⚠️ SocketEventEmitter already initialized");
      return;
    }
    SocketEventEmitter.io = ioInstance;
    console.log("✅ SocketEventEmitter initialized");
  }

  static getIO() {
    if (!SocketEventEmitter.io) {
      throw new AppError("SocketEventEmitter not initialized with io instance");
    }
    return SocketEventEmitter.io;
  }

  static async getSocketByUserId(userId) {
    const io = SocketEventEmitter.getIO();
    const socketId = await socketCache.get(userId);
    if (!socketId) return null;
    return io.sockets.sockets.get(socketId);
  }

  static async joinRoom(roomCode, userId, userName) {
    const io = SocketEventEmitter.getIO();
    const socket = await this.getSocketByUserId(userId);
    if (!socket) return;

    for (const currentRoom of socket.rooms) {
      if (currentRoom !== socket.id && currentRoom !== roomCode) {
        await socket.leave(currentRoom);
        io.to(currentRoom).emit(
          "player:left",
          buildPayload(
            "player:left",
            "info",
            { roomCode, userId, userName },
            `${userName} left ${currentRoom}`
          )
        );
      }
    }

    if (!socket.rooms.has(roomCode)) {
      socket.currentRoom = roomCode; // used to get roomCode when socket is disconnected
      await socket.join(roomCode);
    }

    io.to(roomCode).emit(
      "player:joined",
      buildPayload(
        "player:joined",
        "info",
        { roomCode, userId, userName },
        `${userName} joined the room`
      )
    );
  }

  static async leaveRoom(roomCode, userId, userName) {
    const io = SocketEventEmitter.getIO();
    const socket = await this.getSocketByUserId(userId);
    if (!socket) return;

    await socket.leave(roomCode);

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

  static async closeRoom(roomCode, userId, userName, globalScore) {
    const io = SocketEventEmitter.getIO();
    io.to(roomCode).emit(
      "room:close",
      buildPayload(
        "room:close",
        "system",
        { roomCode, userId, userName, globalScore },
        "Room closed by host"
      )
    );

    const sockets = io.sockets.adapter.rooms.get(roomCode);
    if (sockets) {
      for (const socketId of sockets) {
        const socket = io.sockets.sockets.get(socketId);
        if (socket) await socket.leave(roomCode);
      }
    }
  }

  // Game Events
  static gameStarted(roomCode, game) {
    this.getIO()
      .to(roomCode)
      .emit("game:started", buildPayload("game:started", "system", { game }, "Game has started"));
  }

  static gameCorrectAnswer(roomCode, user, text, game, wordGuessed) {
    this.getIO()
      .to(roomCode)
      .emit(
        "game:correct-answer",
        buildPayload(
          "game:correct-answer",
          "success",
          { user, text, game },
          `${user.name} guessed the word correctly! The word was: ${wordGuessed}`
        )
      );
  }

  static gameTurnUpdated(roomCode, game) {
    this.getIO()
      .to(roomCode)
      .emit(
        "game:turn-updated",
        buildPayload("game:turn-updated", "info", { game }, "Turn updated")
      );
  }

  static async tabooWord(user, text, word) {
    const socket = await this.getSocketByUserId(user.id);
    if (!socket) return;
    socket.emit(
      "game:taboo-word",
      buildPayload(
        "game:taboo-word",
        "error",
        { user, text, word },
        `The word "${word}" is taboo — you can't use it.`
      )
    );
  }

  static similarWord(code, user, text, similarWord) {
    console.log("esto es la similar word que llega al emmiter: ", similarWord);
    this.getIO()
      .to(code)
      .emit(
        "game:similar-word",
        buildPayload("game:similar-word", "chat", { user, similarWord }, text)
      );
  }

  static gameFinished(roomCode, results) {
    this.getIO()
      .to(roomCode)
      .emit("game:finished", buildPayload("game:finished", "system", { results }, "Game finished"));
  }

  static gameInterrupted(roomCode, message) {
    console.log("Emitting game interrupted to room:", roomCode, "message:", message);
    this.getIO()
      .to(roomCode)
      .emit(
        "game:interrupted",
        buildPayload("game:interrupted", "system", {}, message || "Game interrupted")
      );
  }

  static async sendNewWord(userId, roomCode, game, errorMessage) {
    const io = this.getIO();
    if (!game && errorMessage) {
      // error msge is sent only to user that originated the event
      const socket = await this.getSocketByUserId(userId);
      if (!socket) return;
      socket.emit("game:new-word", buildPayload("game:new-word", "error", {}, errorMessage));
      return;
    }
    io.to(roomCode).emit("game:new-word", buildPayload("game:new-word", "info", { game }));
  }

  // Chat & State Events
  static sendMessage({ code, user, text, type = "chat" }) {
    this.getIO()
      .to(code)
      .emit(
        "chat:message",
        buildPayload("chat:message", "chat", { user, text, type }, `${user.name}: ${text}`)
      );
  }

  static updateRoom(roomCode, roomInfo) {
    this.getIO()
      .to(roomCode)
      .emit(
        "room:updated",
        buildPayload("room:updated", "info", { roomInfo }, "Room state updated")
      );
  }

  static teamState(roomCode, teams) {
    this.getIO()
      .to(roomCode)
      .emit("team-state", buildPayload("team-state", "info", { teams }, "Team state updated"));
  }

  static async gameUpdated(roomCode, gameData) {
    this.getIO()
      .to(roomCode)
      .emit(
        "game:updated",
        buildPayload("game:updated", "info", { gameData }, "Game state updated")
      );
  }

  static async rateLimitWarning(socket, err) {
    if (!socket) return;

    socket.emit("rateLimitWarning", buildPayload("rateLimitWarning", "429", err, err.message));
  }

  static async error(socket, err) {
    if (!socket) return;
    socket.emit("error", buildPayload("error", "400", err, err.message));
  }

  static async internalError(socket, err) {
    if (!socket) return;
    socket.emit(
      "errorMessage",
      buildPayload("internalError", "500", err, "An internal error occurred")
    );
  }
}
