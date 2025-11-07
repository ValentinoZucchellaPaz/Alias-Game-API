import { socketCache } from "../../config/redis.js";
import { AppError, RateLimitError } from "../../utils/errors.js";
import jwt from "../../utils/jwt.js";
import { socketConnectionLimiter } from "./limiters/rateLimiters.js";
import { getSocketIp, tryConsumeLimiter } from "../limiterHelpers.js";

/**
 * Connection rate limiting middleware for socket.io
 */
export const socketConnectionRateLimitMiddleware = async (socket, next) => {
  console.log("New socket connection attempt:", socket.id);
  // rate limiter
  const ip = getSocketIp(socket);

  const { success, retryMs } = await tryConsumeLimiter(socketConnectionLimiter, ip);

  if (!success) {
    return next(
      new RateLimitError("connection", retryMs, "Too many connection attempts from this IP")
    );
  }

  next();
};

/**
 * Authentication middleware for socket.io
 */
export const socketAuthMiddleware = async (socket, next) => {
  console.log("Authenticating socket:", socket.id);
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
};
