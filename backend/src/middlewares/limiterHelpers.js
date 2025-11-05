import { RateLimiterRedis } from "rate-limiter-flexible";
import { RedisClientSingleton } from "../config/redis.js";

let redisClientPromise = RedisClientSingleton.getInstance();

export async function createLimiter({ keyPrefix, points, duration }) {
  const redisClient = await redisClientPromise;

  return new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix,
    points,
    duration,
  });
}

export async function tryConsumeLimiter(limiter, key) {
  console.log("tryConsumeLimiter called with key:", key);
  try {
    const res = await limiter.consume(key);
    return { success: true, remainingPoints: res.remainingPoints };
  } catch (rejRes) {
    if (rejRes && typeof rejRes.msBeforeNext === "number") {
      return { success: false, retryMs: rejRes.msBeforeNext };
    }
    throw rejRes;
  }
}

export function socketRateLimitMiddleware(
  targetEvent,
  limiter,
  socket,
  identifier,
  message = "Too many requests, please slow down."
) {
  return async ([event, data], next) => {
    if (event === targetEvent) {
      const { success, retryMs } = await tryConsumeLimiter(limiter, identifier);

      if (!success) {
        console.log(
          "Rate limit exceeded for event:",
          targetEvent,
          "identifier:",
          identifier,
          "retry in ms:",
          retryMs
        );
        socket.emit("rateLimitExceeded", { message });
        return;
      }
    }
    next();
  };
}

export function httpRateLimitMiddleware(limiter, identifierFn) {
  return async (req, res, next) => {
    console.log("httpRateLimitMiddleware called with limiter: ", limiter);

    const key = identifierFn ? identifierFn(req) : getHttpIp(req);

    console.log("Rate limiting key:", key);
    const { success, retryMs } = await tryConsumeLimiter(limiter, key);

    console.log(
      "Rate limiter result for key",
      key,
      ":",
      success ? "allowed" : `blocked, retry in ${retryMs}ms`
    );

    if (!success) {
      return res.status(429).json({
        message: `Too many requests. Retry after ${Math.ceil(retryMs / 1000)}s`,
      });
    }

    next();
  };
}

export function getHttpIp(req) {
  return req.ip || req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

export function getSocketIp(socket) {
  // Try the forwarded header first (in case you’re behind a reverse proxy)
  const xForwardedFor = socket.handshake.headers["x-forwarded-for"];
  if (xForwardedFor) {
    // If multiple IPs, take the first one
    return xForwardedFor.split(",")[0].trim();
  }

  // Fallback to raw remote address
  return socket.handshake.address;
}
