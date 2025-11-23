import { socketCache } from "../config/redis.js";
import {
  chatRateLimitMiddleware,
  gameChatRateLimitMiddleware,
  joinTeamRateLimitMiddleware,
} from "../middlewares/socketMiddlewares/events.js";
import {
  socketAuthMiddleware,
  socketConnectionRateLimitMiddleware,
} from "../middlewares/socketMiddlewares/connection.js";
import { socketErrorHandler } from "../middlewares/socketErrorHandler.js";
import { logger } from "../utils/logger.js";
import {
  chatMessageHandler,
  disconnectHandler,
  gameMessageHandler,
  joinTeamHandler,
  skipWordHandler,
} from "./socketHandlers.js";

// FIXME: idea, in the future analize a refactor to depend less in the info comming from the client and use redis and the socket instance info to handle here

/**
 * @param {Server<DefaultEventsMap, DefaultEventsMap, DefaultEventsMap, any>} io
 */
export default function registerSocketEvents(io) {
  /*
   * socket connection middlewares
   */
  // Rate limiter middleware
  io.use(socketConnectionRateLimitMiddleware);
  // Socket Auth middleware
  io.use(socketAuthMiddleware);

  io.on("connection", (socket) => {
    logger.info(`Socket conectado: ${socket.id}`);

    // Event rate limiters
    socket.use(chatRateLimitMiddleware(socket));
    socket.use(gameChatRateLimitMiddleware(socket));
    socket.use(joinTeamRateLimitMiddleware(socket));

    socketCache.set(socket.userId, socket.id);

    /**
     * Socket Event Handlers
     */

    socket.on("chat:message", withSocketErrorHandling(socket, chatMessageHandler));

    socket.on("game:message", withSocketErrorHandling(socket, gameMessageHandler));

    socket.on("game:skip-word", withSocketErrorHandling(socket, skipWordHandler));

    socket.on("join-team", withSocketErrorHandling(socket, joinTeamHandler));

    socket.on(
      "disconnect",
      withSocketErrorHandling(socket, async (reason) => {
        await disconnectHandler(io, socket, reason);
      })
    );

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
      logger.info(`Handling event for socket ${socket.id} with args:`, args);
      await handler(...args);
    } catch (err) {
      logger.error(`⚠️ Error in event handler for socket ${socket.id}:`, err);
      socketErrorHandler(socket, err);
    }
  };
}
