import { Game } from "../models/Game.js";
import timeManager from "../models/TimerManager.js";
import gameRepository from "../repositories/game.repository.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError } from "../utils/errors.js";
import roomService from "./room.service.js";

async function createGame(roomCode) {
  const words = ["apple", "banana", "cherry", "date", "elderberry", "fig", "grape", "honeydew"];

  const room = await roomService.getRoom(roomCode);
  const teams = room.teams;

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
  game.nextTurn();

  if (game.state === "finished") {
    timeManager.clearTimer(roomCode);
    const results = game.gameFinish();
    await saveGame(roomCode, game);
    return results;
  }

  setTimerForGame(roomCode, game);

  await saveGame(roomCode, game);

  console.log("Emitting game turn update for room:", roomCode);
  await SocketEventEmitter.gameTurnUpdated(roomCode, game);
}

async function checkForAnswer(user, text, roomCode) {
  const game = await getGame(roomCode);

  const isValidAttempt = game.isGuesser(user.id);
  if (!isValidAttempt) {
    console.log("User is not a guesser:", user.id);
    return false;
  }

  const correct = game.checkAnswer(text);

  if (correct) {
    game.pickWord();
    console.log("New word to guess:", game.wordToGuess);

    await saveGame(roomCode, game);
  }

  console.log("Answer correct:", correct);
  return correct;
}

function setTimerForGame(roomCode, game) {
  timeManager.startTimer(roomCode, 60, () => {
    if (game.state === "finished") {
      timeManager.stopTimer(roomCode);
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
