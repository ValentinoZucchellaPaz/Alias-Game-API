import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError, RateLimitError } from "../utils/errors.js";

export function socketErrorHandler(socket, err) {
  // --- Handle RateLimiter errors ---
  if (err instanceof RateLimitError) {
    SocketEventEmitter.rateLimitWarning(socket, err.serialize());
    return;
  }

  if (err instanceof AppError) {
    console.log("AppError occurred:", err);
    SocketEventEmitter.error(socket, err.serialize());
    return;
  }

  console.error("Internal server error occurred:", err);
  SocketEventEmitter.internalError(socket, err.serialize());
  return;
}
