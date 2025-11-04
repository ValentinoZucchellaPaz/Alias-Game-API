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
  console.log("estas son las palabras del juego", words);

  const game = new Game(roomCode, teams, words);
  game.startGame();

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

  console.log("Emitting game turn update for room:", roomCode);
  SocketEventEmitter.gameTurnUpdated(roomCode, game); // feedback optimista

  await saveGame(roomCode, game);
}

async function checkForAnswer(user, text, roomCode) {
  const game = await getGame(roomCode);

  // si game.status!=playing salir
  // aca estaria bueno validar si el jugador es del equipo que adivina

  // const isValidAttempt = game.isGuesser(user.id);
  // if (!isValidAttempt) {
  //   console.log("User is not a guesser:", user.id);
  //   return false;
  // }
  const userTeam = Object.keys(game.teams).find((teamColor) =>
    game.teams[teamColor].players.includes(user.id)
  );
  if (userTeam != game.currentTeam) return false;

  const correct = game.checkAnswer(text);

  if (correct) {
    await game.pickWord();
    //sumar un punto al equipo
    console.log("puntaje previo", game.teams[userTeam].score);
    game.teams[userTeam].score++;
    console.log("puntaje dps", game.teams[userTeam].score);
    console.log("New word to guess:", game.wordToGuess);

    await saveGame(roomCode, game);
    // enviar nueva palabra al descriptor
  }

  console.log("Answer correct:", correct);
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
