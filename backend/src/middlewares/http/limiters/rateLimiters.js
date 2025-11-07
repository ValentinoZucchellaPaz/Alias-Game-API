import { createLimiter, getHttpIp, httpRateLimitMiddleware } from "../../limiterHelpers.js";

/**
 * HTTP rate limiters
 */

// Global limiter — applies to all routes
export const globalLimiter = await createLimiter({
  keyPrefix: "globalLimiter",
  duration: 60,
  points: 200,
  message: "Too many requests from this IP, please try again later.",
});

// register limiter — strong restriction
export const registerLimiter = await createLimiter({
  keyPrefix: "registerLimiter",
  duration: 60,
  points: 5,
  message: "Too many register attempts. Try again in a minute.",
});

// Login limiter — strong restriction
export const loginLimiter = await createLimiter({
  keyPrefix: "loginLimiter",
  duration: 60,
  points: 5,
  message: "Too many login attempts. Try again in a minute.",
});

// Game join/create limiter
export const gameLimiter = await createLimiter({
  keyPrefix: "gameLimiter",
  duration: 60,
  points: 15,
  message: "Please wait before joining or creating another game.",
});

/**
 * HTTP rate limiting middlewares
 */
export const globalLimiterMiddleware = httpRateLimitMiddleware(globalLimiter);
export const registerLimiterMiddleware = httpRateLimitMiddleware(registerLimiter);
export const loginLimiterMiddleware = httpRateLimitMiddleware(loginLimiter);

/**
 * Path and IP based identifier function for game limiter
 * This helps to uniquely identify requests based on both the request path and the client's IP address.
 * Without this, every touch to the /game endpoint would take from the same limiter bucket.
 */
const identifierFn = (req) => {
  const path = req.path;
  const ip = getHttpIp(req);
  return `${path}:${ip}`;
};
export const gameLimiterMiddleware = httpRateLimitMiddleware(gameLimiter, identifierFn);
