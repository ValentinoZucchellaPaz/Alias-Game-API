import { tokenCache } from "../config/redis.js";

async function save(userId, token) {
  await tokenCache.set(userId, token, 604800); // guardar refresh por una sem en redis
}

async function exists(userId, token) {
  const storedToken = await tokenCache.get(userId);
  return storedToken === token;
}

async function revoke(userId, _token) {
  await tokenCache.del(userId);
}

export default { save, exists, revoke };
