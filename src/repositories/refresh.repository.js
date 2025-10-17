import { redisClient } from "../config/redis.js";

async function save(userId, token) {
  await redisClient.set(userId, token);
}

async function exists(userId, token) {
  const storedToken = await redisClient.get(userId);
  return storedToken === token;
}

async function revoke(userId, _token) {
  await redisClient.del(userId);
}

export default { save, exists, revoke };
