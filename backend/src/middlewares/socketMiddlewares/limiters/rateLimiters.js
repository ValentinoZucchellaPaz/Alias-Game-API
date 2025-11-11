import { createLimiter } from "../../limiterHelpers.js";

export const chatLimiter = await createLimiter({
  keyPrefix: "socket_chat",
  points: 20,
  duration: 10,
});

export const gameChatLimiter = await createLimiter({
  keyPrefix: "socket_game_chat",
  points: 20,
  duration: 10,
});

export const joinTeamLimiter = await createLimiter({
  keyPrefix: "socket_join_team",
  points: 10,
  duration: 10,
});

export const socketConnectionLimiter = await createLimiter({
  keyPrefix: "socket_connection_attempt",
  points: 15,
  duration: 10,
});
