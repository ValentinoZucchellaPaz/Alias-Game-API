import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError, RateLimitError } from "../utils/errors.js";
import { logger } from "../utils/logger.js";

export function socketErrorHandler(socket, err) {
  // --- Handle RateLimiter errors ---
  if (err instanceof RateLimitError) {
    SocketEventEmitter.rateLimitWarning(socket, err.serialize());
    return;
  }

  if (err instanceof AppError) {
    logger.error("AppError occurred:", err);
    SocketEventEmitter.error(socket, err.serialize());
    return;
  }

  logger.error("Internal server error occurred:", err);
  SocketEventEmitter.internalError(socket, err.serialize());
  return;
}
