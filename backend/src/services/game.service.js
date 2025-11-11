import { gameCache } from "../config/redis.js";
import { Game } from "../models/Game.js";
import timeManager from "../models/TimerManager.js";
import gameRepository from "../repositories/game.repository.js";
import { MessageCheckResultSchema } from "../schemas/word.schema.js";
import { SocketEventEmitter } from "../sockets/SocketEventEmmiter.js";
import { AppError } from "../utils/errors.js";
import { checkTabooWord, cleanText } from "../utils/words.js";
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

  if (!gameState) {
    return null;
  }

  console.log("Retrieved game state from repository for room", roomCode, ":", gameState);
  const game = Game.from(roomCode, gameState);

  return game;
}

  if (!game) {
    throw new AppError(`No game found for room ${roomCode}`);
  }

  return game;
}

async function handleGameTurnNext(roomCode) {
  const game = await getGame(roomCode);

  if (!game) {
    throw new AppError("No active game found for this room.");
  }

  await game.nextTurn();

  if (game.state === "finished") {
    return await finishGame(game, roomCode);
  }

  setTimerForGame(roomCode, game);

  SocketEventEmitter.gameTurnUpdated(roomCode, game); // feedback optimista

  await saveGame(roomCode, game);
}

async function checkForAnswer(userId, text, roomCode) {
  const cleanedText = cleanText(text);
  const game = await getGame(roomCode);

  if (!game) {
    throw new AppError("No active game found for this room.");
  }

  if (!game || game.state !== "playing" || !cleanedText) {
    return MessageCheckResultSchema.parse({
      type: "invalid",
      correct: false,
      taboo: false,
      game,
    });
  }

  const isGuesser = game.isGuesser(userId);
  const isDescriptor = game.isDescriptor(userId);

  // CASE 1: Guesser -> try to guess the word
  if (isGuesser) {
    const correct = cleanedText === cleanText(game.wordToGuess.word);

    if (correct) {
      const userTeam = Object.keys(game.teams).find((teamColor) =>
        game.teams[teamColor].players.includes(userId)
      );

      // update score & get new word
      game.teams[userTeam].score++;
      await game.pickWord();
      await saveGame(roomCode, game);

      return MessageCheckResultSchema.parse({
        type: "answer",
        correct: true,
        taboo: false,
        word: game.wordToGuess.word,
        game,
      });
    }

    // Incorrect guess
    return MessageCheckResultSchema.parse({
      type: "answer",
      correct: false,
      taboo: false,
      game,
    });
  }

  // CASE 2: Descriptor -> check if used a taboo word
  if (isDescriptor) {
    const tabooWords = [game.wordToGuess.word, ...(game.wordToGuess.tabooWords || [])];
    const tabooDetected = checkTabooWord(text, tabooWords);

    if (tabooDetected) {
      return MessageCheckResultSchema.parse({
        type: "taboo",
        correct: false,
        taboo: true,
        word: tabooDetected,
        game,
      });
    }

    return MessageCheckResultSchema.parse({
      type: "invalid",
      correct: false,
      taboo: false,
      game,
    });
  }

  // CASE 3: Others (spectators or outsiders)
  return MessageCheckResultSchema.parse({
    type: "invalid",
    correct: false,
    taboo: false,
    game,
  });
}

async function getNewWord(userId, roomCode) {
  const game = await getGame(roomCode);

  if (!game) {
    throw new AppError("No active game found for this room.");
  }

  if (game.currentDescriber != userId)
    throw new AppError("User requesting new word is not current describer");

  if (game.state != "playing") throw new AppError("Only can provide new word to playing games");

  const remaining = game.checkAndUpdateCooldown(userId);
  if (remaining) throw new AppError(`Must wait ${remaining}s before skipping this word.`);

  await game.pickWord();
  await saveGame(roomCode, game);
  return game;
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

/**
 * Finish the game successfully: clear timer, save results, delete game from redis, emit event
 * @param {*} game
 * @param {*} roomCode
 * @returns
 */
async function finishGame(game, roomCode) {
  // clear timer
  timeManager.clearTimer(roomCode);

  // get results and mark game as finished
  const results = game.gameFinish();

  // update room results
  roomService.updateRoom(roomCode, results);

  // delete game from cache
  await gameCache.del(roomCode);

  // emit game finished event
  SocketEventEmitter.gameFinished(roomCode, results);

  return results;
}

/**

async function saveGame(roomCode, game) {
  const gameData = game.gameState();
  return await gameRepository.updateGame(roomCode, gameData);
}

export default { createGame, getGame, handleGameTurnNext, checkForAnswer, getNewWord };
