import { gameCache } from "../config/redis.js";
import { Game } from "../models/Game.js";
import timeManager from "../models/TimerManager.js";
import gameRepository from "../repositories/game.repository.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError } from "../utils/errors.js";
import roomService from "./room.service.js";

async function createGame(roomCode) {
  const room = await roomService.getRoom(roomCode);
  const teams = room.teams;

  // usuario pertenece a room? room no esta en juego? si esta en juego o finished salir
  // if (teams.some(team => team.players.length < 2)) {
  //   throw new AppError("Each team must have at least 2 players.");
  // }

  const words = await gameRepository.getWords();
  const game = new Game(roomCode, teams, words);
  await game.startGame();

  await saveGame(roomCode, game);

  setTimerForGame(roomCode, game);

  return { roomCode, game };
}

// get a game instance
async function getGame(roomCode) {
  const gameState = await gameRepository.getGame(roomCode);

  const game = Game.from(roomCode, gameState);

  if (!game) {
    throw new AppError(`No game found for room ${roomCode}`);
  }

  return game;
}

async function handleGameTurnNext(roomCode) {
  const game = await getGame(roomCode);
  await game.nextTurn();

  if (game.state === "finished") {
    timeManager.clearTimer(roomCode);
    const results = game.gameFinish();

    // update room results and delete game from redis
    roomService.updateRoom(roomCode, results);
    await gameCache.del(roomCode);
    SocketEventEmitter.gameFinished(roomCode, results);
    return results;
  }

  setTimerForGame(roomCode, game);

  SocketEventEmitter.gameTurnUpdated(roomCode, game); // feedback optimista

  await saveGame(roomCode, game);
}

async function checkForAnswer(user, text, roomCode) {
  // validates if user guessing is a guesser from the team,

  const game = await getGame(roomCode);
  if (game.state != "playing") return { correct: false, game };

  const isGuesser = game.isGuesser(user.id);
  if (!isGuesser) {
    const isDescriptor = game.isDescriptor(user.id);
    if (!isDescriptor) {
      return { correct: false, game }; // is someone from the other team
    }
    const { isTaboo, word } = game.checkTabooWord(text);
    return { correct: false, game, isTaboo, word };
  }

  const correct = game.checkAnswer(text);

  if (correct) {
    const userTeam = Object.keys(game.teams).find((teamColor) =>
      game.teams[teamColor].players.includes(user.id)
    );
    await game.pickWord();
    game.teams[userTeam].score++;

    await saveGame(roomCode, game);
  }

  // console.log("Answer correct:", correct);
  return { correct, game };
}

function setTimerForGame(roomCode, game) {
  timeManager.startTimer(roomCode, game?.turnTime ?? 60, () => {
    if (game.state === "finished") {
      timeManager.clearTimer(roomCode);
      return;
    }

    handleGameTurnNext(roomCode);
  });
}

async function saveGame(roomCode, game) {
  const gameData = game.gameState();
  return await gameRepository.updateGame(roomCode, gameData);
}

export default { createGame, getGame, handleGameTurnNext, checkForAnswer };
