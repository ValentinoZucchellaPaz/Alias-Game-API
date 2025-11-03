import { gameCache } from "../config/redis.js";

async function getGame(roomCode) {
  const gameState = await gameCache.hGetAll(roomCode);
  return gameState;
}

async function setGame(roomCode, gameData) {
  console.log(
    "Setting game in Redis for room:",
    roomCode,
    "with data:",
    gameData
  );
  await gameCache.hSet(roomCode, gameData);
}

async function updateGame(roomCode, gameData) {
  console.log(
    "Updating game in Redis for room:",
    roomCode,
    "with data:",
    gameData
  );
  await gameCache.hSet(roomCode, gameData);
}

export default { getGame, setGame, updateGame };
