// {
//   word: string;
//   similarity: [],
//   prohibited: []

import gameRepository from "../repositories/game.repository.js";
import { deserialize, serialize } from "../utils/objects.js";

// }
export class Game {
  constructor(roomCode, teams, words, turns = 2) {
    this.roomCode = roomCode;
    this.teams = {
      red: { players: teams.red || [], describer: 0, score: 0 },
      blue: { players: teams.blue || [], describer: 0, score: 0 },
    };
    this.currentTeam = null;
    this.currentDescriber = null; // user id
    this.wordToGuess = null; // {wordId, word, taboo: [], similar: [{word, type, similarity}]}
    this.words = {
      used: [],
      unused: words,
    };
    this.maxTurns = turns;
    this.turnsPlayed = 0;
    this.state = "waiting"; // playing || waiting || finished
  }

  static from(roomCode, data) {
    const deserializedData = deserialize(data);

    if (!deserializedData || Object.keys(deserializedData).length === 0) {
      console.log("No data found to reconstruct game for room:", roomCode);
      return null;
    }

    const teams = {
      red: deserializedData.teams.red.players,
      blue: deserializedData.teams.blue.players,
    };
    const game = new Game(roomCode, teams, []);
    game.teams.red = deserializedData.teams.red;
    game.teams.blue = deserializedData.teams.blue;
    game.currentTeam = deserializedData.currentTeam;
    game.currentDescriber = deserializedData.currentDescriber;
    game.wordToGuess = deserializedData.wordToGuess;
    game.words = deserializedData.words;
    game.maxTurns = deserializedData.maxTurns;
    game.turnsPlayed = deserializedData.turnsPlayed;
    game.state = deserializedData.state;
    return game;
  }

  async startGame() {
    // initialize game state
    this.currentTeam = Math.random() > 0.5 ? "red" : "blue";
    this.currentDescriber = this.getCurrentDescriber();

    await this.pickWord();
    this.state = "playing";
  }

  chooseNextDescriber() {
    // rotate describer index for the current team
    const currTeam = this.teams[this.currentTeam];
    currTeam.describer = (currTeam.describer + 1) % currTeam.players.length;
    this.currentDescriber = currTeam.players[currTeam.describer];
  }

  getCurrentDescriber() {
    // return the current player describing the word
    // e.g., the first player in the team
    const currTeam = this.teams[this.currentTeam];
    const currentDescriberIndex = currTeam.describer;
    return currTeam.players[currentDescriberIndex];
  }

  async pickWord() {
    // return a random word from the words array, if there's not any call db for more
    // e.g., a random element from this.words
    if (!this.words.unused.length) {
      this.words.unused = await gameRepository.getWords(this.words.used.map((w) => w.word));
    }
    const index = Math.floor(Math.random() * this.words.unused.length);
    this.wordToGuess = this.words.unused.splice(index, 1)[0];
    this.words.used.push(this.wordToGuess);
  }

  checkAnswer(text) {
    if (!text || !this.wordToGuess) return false;

    if (text.toLowerCase() === this.wordToGuess.word.toLowerCase()) {
      this.words.used.push(this.wordToGuess);
      this.words.unused = this.words.unused.filter((w) => w.wordId !== this.wordToGuess.wordId);
      return true;
    }
    return false;
  }

  checkTabooWord(text) {
    if (!text || !this.wordToGuess) return false;

    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (this.wordToGuess.tabooWords.includes(word) || this.wordToGuess.word == word) {
        return { isTaboo: true, word };
      }
    }
    return { isTaboo: false };
  }

  isDescriptor(userId) {
    return this.currentDescriber === userId;
  }

  isGuesser(userId) {
    const currentTeam = this.currentTeam;
    return this.teams[currentTeam].players.includes(userId) && userId !== this.currentDescriber;
  }

  async nextTurn() {
    this.turnsPlayed += 1;

    // check if max turns reached
    if (this.turnsPlayed >= this.maxTurns) {
      this.state = "finished";
      return;
    }

    // switch to the next team and player
    if (this.currentTeam === "red") {
      this.currentTeam = "blue";
    } else {
      this.currentTeam = "red";
    }
    this.chooseNextDescriber();
    await this.pickWord();
    // console.log("New word to guess:", this.wordToGuess);
  }

  gameFinish() {
    this.state = "finished";
    return { red: this.teams.red.score, blue: this.teams.blue.score };
  }

  gameState() {
    // save game state to Redis
    return serialize({
      teams: this.teams,
      currentTeam: this.currentTeam,
      currentDescriber: this.currentDescriber,
      words: this.words,
      maxTurns: this.maxTurns,
      turnsPlayed: this.turnsPlayed,
      state: this.state,
      wordToGuess: this.wordToGuess,
    });
  }
}
