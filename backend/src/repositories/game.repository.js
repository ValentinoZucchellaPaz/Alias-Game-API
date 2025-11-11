import sequelize from "../config/db.js";
import { gameCache } from "../config/redis.js";
import { SimilarWord, TabooWord, Word } from "../models/sequelize/words/index.js";
import { Op } from "sequelize";

async function getGame(roomCode) {
  const gameState = await gameCache.hGetAll(roomCode);
  return gameState;
}

async function setGame(roomCode, gameData) {
  await gameCache.hSet(roomCode, gameData);
}

async function updateGame(roomCode, gameData) {
  await gameCache.hSet(roomCode, gameData);
}

async function getWords(usedWords = [], limit = 10) {
  // build where clause to exclude usedWords (detect if IDs or text)
  const where = {};
  if (usedWords && usedWords.length) {
    where["word"] = { [Op.notIn]: usedWords };
  }

  const words = await Word.findAll({
    where,
    limit,
    order: sequelize.random(), // Use random order for more variability
    raw: true,
  });

  if (!words || words.length === 0) return null;

  const ids = words.map((w) => w.id);

  // build where clauses using only wordId FK (match by id, not by text)
  const whereWordId = { wordId: { [Op.in]: ids } };

  const taboos = await TabooWord.findAll({ where: whereWordId, raw: true });

  const similars = await SimilarWord.findAll({
    where: whereWordId,
    raw: true,
  });

  // map taboo words to their parent word id
  const tabooMap = {};
  for (const t of taboos) {
    if (!tabooMap[t.wordId]) tabooMap[t.wordId] = [];
    tabooMap[t.wordId].push(t.tabooWord);
  }

  // map similar words to their parent word id
  const similarMap = {};
  for (const s of similars) {
    if (!similarMap[s.wordId]) similarMap[s.wordId] = [];
    similarMap[s.wordId].push({
      similarWord: s.similarWord,
      type: s.type,
      similarity: s.similarity,
    });
  }

  // return words with their associated taboo and similar words
  return words.map((w) => ({
    wordId: w.id,
    word: w.word,
    tabooWords: tabooMap[w.id] || [],
    similarWords: similarMap[w.id] || [],
  }));
}

export default { getGame, setGame, updateGame, getWords };
