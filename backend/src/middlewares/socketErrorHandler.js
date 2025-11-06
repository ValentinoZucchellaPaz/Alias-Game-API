import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { RateLimitError } from "../utils/errors.js";

export function socketErrorHandler(socket, err) {
  // --- Handle RateLimiter errors ---
  if (err instanceof RateLimitError) {
    SocketEventEmitter.rateLimitWarning(socket, err.serialize());
    return;
  }

  SocketEventEmitter.internalError(socket, err.serialize());
  return;
}
