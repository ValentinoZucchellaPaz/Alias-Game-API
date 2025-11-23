import { roomCache } from "../config/redis.js";
import { Room } from "../models/sequelize/index.js";
import timeManager from "../models/TimerManager.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError, ConflictError } from "../utils/errors.js";
import { v4 as uuidv4 } from "uuid";
import { safeParse } from "../utils/objects.js";
import gameService from "./game.service.js";
import { logger } from "../utils/logger.js";

async function createRoom({ hostId, hostName }) {
  // create room in db, save in redis and emit socket event to join room

  const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
  const roomId = uuidv4();

  // FIXME: in a future check what is used to store players, if name or id
  const roomData = {
    id: roomId,
    code: roomCode,
    hostId,
    players: [{ id: hostId, active: true }],
    teams: { red: [hostId], blue: [] },
    globalScore: { red: 0, blue: 0 },
    games: [],
    status: "waiting",
  };

  await Room.create({ ...roomData });

  const copy = JSON.parse(JSON.stringify(roomData));
  copy.players = JSON.stringify(copy.players);
  copy.teams = JSON.stringify(copy.teams);
  copy.globalScore = JSON.stringify(copy.globalScore);
  copy.games = JSON.stringify(copy.games);

  await roomCache.hSet(roomCode, copy);

  await SocketEventEmitter.joinRoom(roomCode, hostId, hostName);
  SocketEventEmitter.teamState(roomCode, roomData.teams);

  return roomData;
}

async function getRoom(code) {
  // get roomData from redis, or db if not found (create in redis if found)
  let room = await roomCache.hGetAll(code);
  let dbRoom = null;
  if (!room || Object.keys(room).length === 0) {
    dbRoom = await Room.findOne({ where: { code } });
    if (!dbRoom) throw new AppError(`There's no room created with code ${code}`, 400, "room_error");

    if (dbRoom.status == "finished")
      throw new AppError("This room is no longer active", 400, "room_error");
    const roomData = {
      id: dbRoom.id,
      code: dbRoom.code,
      hostId: dbRoom.hostId,
      players: JSON.stringify(dbRoom.players),
      teams: JSON.stringify(dbRoom.teams),
      globalScore: JSON.stringify(dbRoom.globalScore),
      games: JSON.stringify(dbRoom.games),
      status: dbRoom.status,
      public: dbRoom.public ? "true" : "false",
    };
    await roomCache.hSet(code, roomData, roomCache.ttl);
    room = await roomCache.hGetAll(code); // redis retry
  }

  room.players = JSON.parse(room.players);
  room.teams = JSON.parse(room.teams);
  room.globalScore = JSON.parse(room.globalScore);
  room.games = JSON.parse(room.games);

  return room;
}

async function joinRoom({ roomCode, userId, userName }) {
  // checks room players, if OK join new player and assign team, save info and emit event
  const room = await getRoom(roomCode);
  if (room.status !== "waiting") throw new AppError("Cannot join this room now", 400, "room_error");

  // check if room is full -> what is max cap?
  const MAX_PLAYER_PER_ROOM = 12;
  const activePlayers = room.players.map((p) => {
    if (p.active) return p.id;
  });
  if (activePlayers.length > MAX_PLAYER_PER_ROOM)
    throw new AppError("This room is full", 400, "room_error");

  const playerInRoom = room.players.find((p) => p.id == userId);
  if (playerInRoom) {
    if (playerInRoom.active) {
      throw new AppError("User already in the room", 400, "room_error");
    }
    playerInRoom.active = true;
    room.reconnected = true;
  } else {
    room.players.push({ id: userId, active: true });
  }

  // auto assign team
  if (
    room.teams &&
    Array.isArray(room.teams.red) &&
    Array.isArray(room.teams.blue) &&
    !room.teams.red.includes(userId) &&
    !room.teams.blue.includes(userId)
  ) {
    const redCount = room.teams.red.length;
    const blueCount = room.teams.blue.length;
    const team = redCount <= blueCount ? "red" : "blue";
    room.teams[team].push(userId);
  }

  await roomCache.hSet(room.code, {
    players: JSON.stringify(room.players),
    teams: JSON.stringify(room.teams),
  });

  await SocketEventEmitter.joinRoom(roomCode, userId, userName);
  SocketEventEmitter.teamState(roomCode, room.teams);

  return room;
}

/**
 * Handle a user leaving a room: mark as inactive, balance teams, finish room if empty
 * @param {*} { roomCode, userId, userName }
 * @returns
 */
async function leaveRoom({ roomCode, userId, userName }) {
  const room = await getRoom(roomCode);

  // Find player and mark as inactive, if not found throw error
  const player = room.players.find((p) => p.id === userId);
  if (!player) throw new ConflictError(`User ${userId} is not in room ${roomCode}`);
  player.active = false;

  // If all players inactive, finish room
  if (room.players.every((p) => p.active === false)) {
    finishRoom(roomCode);
    return room;
  }

  // remove player from room teams
  for (const teamColor of Object.keys(room.teams)) {
    room.teams[teamColor] = room.teams[teamColor].filter((id) => id !== userId);
  }

  // emit socket event informing user left room
  await SocketEventEmitter.leaveRoom(roomCode, userId, userName);

  /** Balance teams after player leaves
   *  If a team has less than 2 players, move one player from the other team
   *  to balance teams. If total players < 4, end the game.
   */
  if (room.teams.red.length + room.teams.blue.length < 4) {
    if (room.status === "playing") {
      logger.error("Not enough players to continue the game in room, interrupting game", roomCode);
      // interrupt game, go back to lobby state("waiting")
      await gameService.interruptGame(roomCode, "insufficient-players");
      room.status = "waiting";
    }
  } else if (room.teams.red.length < 2) {
    room.teams.red.push(...room.teams.blue.splice(0, 1));
  } else if (room.teams.blue.length < 2) {
    room.teams.blue.push(...room.teams.red.splice(0, 1));
  }

  let newDescriber = null;
  if (room.status === "playing") {
    newDescriber = await gameService.updateGameTeams(roomCode, room.teams);
  }

  await roomCache.hSet(room.code, {
    status: room.status,
    players: JSON.stringify(room.players),
    teams: JSON.stringify(room.teams),
  });

  SocketEventEmitter.teamState(roomCode, room.teams);
  if (newDescriber) {
    logger.log("Emitting gameUpdated with new describer:", newDescriber);
    SocketEventEmitter.gameUpdated(roomCode, { currentDescriber: newDescriber });
  }
  return room;
}

/**
 * Start a new game in the specified room
 * @param {*} _roomCode
 * @returns
 */
async function startGame(_roomCode) {
  // create game instance
  const { roomCode, game } = await gameService.createGame(_roomCode);

  const room = await getRoom(roomCode);

  // check if there's more than 4 players active
  const activePlayers = room.players.reduce((curr, acc) => (curr.active ? acc + 1 : acc));
  if (activePlayers < 4) {
    throw new AppError("There's not enough players to play a game", 400, "game_error");
  }

  // update room status to playing
  room.status = "playing";

  // save updated room status in Redis
  await roomCache.hSet(roomCode, {
    status: room.status,
  });

  return { roomCode, game };
}

/**
 * Update the teams of a room, ensuring no active game is in progress
 * @param {*} roomCode
 * @param {*} team
 * @param {*} userId
 * @returns
 */
async function updateTeams(roomCode, team, userId) {
  const room = await getRoom(roomCode);

  // check if game is in progress. If so, prevent team changes
  if (room.status === "playing") {
    throw new ConflictError("Cannot change teams while game is in progress");
  }

  // If user is not active in room, cannot change team
  const player = room.players.find((p) => p.id === userId);
  if (!player || !player.active)
    throw new ConflictError(`User ${userId} is not in room ${roomCode}`);

  // If user is not in the target team, move them to that team
  if (team == "red" && !room.teams.red.includes(userId)) {
    room.teams.blue = room.teams.blue.filter((id) => id != userId);
    room.teams.red.push(userId);
  } else if (team == "blue" && !room.teams.blue.includes(userId)) {
    room.teams.red = room.teams.red.filter((id) => id != userId);
    room.teams.blue.push(userId);
  }

  // Save updated teams in Redis
  await roomCache.hSet(room.code, {
    teams: JSON.stringify(room.teams),
  });

  // Emit socket event to update clients
  SocketEventEmitter.teamState(roomCode, room.teams);

  return room;
}

/**
 * Get a list of rooms with a limit on the number of rooms returned
 * @param {*} limit
 * @returns
 */
async function getRooms(limit = 30) {
  let rooms = await roomCache.getAllFromNamespace(limit);

  logger.log("Rooms fetched from Redis:", rooms);
  rooms = rooms.map((room) => safeParse(room)).filter((room) => room.status === "waiting");
  return rooms;
}

/**
 * Update room information after a game finishes: update global score, games array, status
 * @param {*} roomCode
 * @param {*} gameScore
 * @returns
 */
async function updateRoom(roomCode, gameScore) {
  const room = await getRoom(roomCode);

  // update room global score
  if (gameScore.red != gameScore.blue) {
    // ties doesnt sum up points
    const winner = gameScore.red > gameScore.blue ? "red" : "blue";
    room.globalScore[winner] += 1;
  }
  room.games.push(gameScore);

  // update room status to waiting again in both Redis and PSQL.
  room.status = "waiting";
  await roomCache.hSet(roomCode, {
    status: room.status,
    globalScore: JSON.stringify(room.globalScore),
    games: JSON.stringify(room.games),
  });

  await Room.update(
    {
      ...room,
    },
    { where: { code: roomCode } }
  );

  // emit socket event to update room info on client.
  SocketEventEmitter.updateRoom(roomCode, room);

  return room;
}

/**
 * Handle room finishing: clear timers, update status in DB and Redis, emit socket event
 * @param {*} roomCode
 * @returns
 */
async function finishRoom(roomCode) {
  // Clear any active timers
  timeManager.clearTimer(roomCode);

  const room = await getRoom(roomCode);
  // Update room status to finished
  room.status = "finished";

  // Update Psql
  await Room.update(
    {
      ...room,
    },
    { where: { code: roomCode } }
  );

  // Delete room from Redis
  await roomCache.del(roomCode);

  // Emit socket event to notify room closure
  SocketEventEmitter.closeRoom(roomCode, null, null, room.globalScore);
  return room;
}

export default {
  createRoom,
  getRoom,
  joinRoom,
  leaveRoom,
  startGame,
  updateTeams,
  getRooms,
  updateRoom,
};
