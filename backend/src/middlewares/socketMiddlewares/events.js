import { socketRateLimitMiddleware } from "../limiterHelpers.js";
import { chatLimiter, gameChatLimiter, joinTeamLimiter } from "./limiters/rateLimiters.js";

/**
 * Event-specific rate limiting middlewares for socket.io
 */
export const chatRateLimitMiddleware = (socket) => {
  return socketRateLimitMiddleware("chat:message", chatLimiter, socket, socket.id);
};

export const gameChatRateLimitMiddleware = (socket) => {
  return socketRateLimitMiddleware("game:message", gameChatLimiter, socket, socket.id);
};

export const joinTeamRateLimitMiddleware = (socket) => {
  return socketRateLimitMiddleware("join-team", joinTeamLimiter, socket, socket.id);
};
