import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { Word, TabooWord, SimilarWord } from "../models/sequelize/words/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATIC_PATH = path.join(__dirname, "../../static");
const BASE_URL = "https://api.datamuse.com/words";

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

async function getSoundalikeWord(word) {
  const res = await fetch(`${BASE_URL}?sl=${encodeURIComponent(word)}`);
  const data = await res.json();
  const second = data[1]?.word;
  return second ? [second] : [];
}

async function getAssociatedWords(word) {
  const res = await fetch(`${BASE_URL}?rel_trg=${encodeURIComponent(word)}`);
  const data = await res.json();
  return data.slice(0, 3).map((e) => e.word);
}

async function getAdjectiveWord(word) {
  const res = await fetch(`${BASE_URL}?rel_jjb=${encodeURIComponent(word)}`);
  const data = await res.json();
  const first = data[0]?.word;
  return first ? [first] : [];
}

async function getSpellingSimilarWord(word) {
  const res = await fetch(`${BASE_URL}?sp=${encodeURIComponent(word)}`);
  const data = await res.json();
  const second = data[1]?.word;
  return second ? [second] : [];
}

/**
 * Semilla de palabras estilo Taboo con 4 tipos de similares
 * y normalización a minúsculas
 */
export default async function seedWords() {
  const existing = await Word.count();
  if (existing > 0) {
    return;
  }

  console.log("🌱 Starting word seed from /static...");

  try {
    const files = await fs.readdir(STATIC_PATH);
    const jsonFiles = files.filter((f) => f.endsWith(".json"));

    for (const file of jsonFiles) {
      const category = path.basename(file, ".json");
      console.log(`📂 Processing category: ${category}`);

      const filePath = path.join(STATIC_PATH, file);
      const raw = await fs.readFile(filePath, "utf8");
      const data = JSON.parse(raw);

      const entries = Object.entries(data);

      // Insertar palabras + taboo words
      for (const [rawWord, tabooList] of entries) {
        const word = rawWord.toLowerCase(); // <-- Convertir a minúsculas

        const mainWord = await Word.create({ word, category });

        const tabooInserts = tabooList.map((taboo) => ({
          wordId: mainWord.id,
          tabooWord: taboo.toLowerCase(), // <-- también minúscula
        }));
        await TabooWord.bulkCreate(tabooInserts);
      }

      const words = entries.map(([w]) => w.toLowerCase()); // <-- minúsculas para la lista
      const batchSize = 20;
      const delayMs = 2;

      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        console.log(`🔎 Processing batch ${i / batchSize + 1} of ${category}...`);

        await Promise.all(
          batch.map(async (w) => {
            const wordRecord = await Word.findOne({ where: { word: w } });
            if (!wordRecord) return;

            try {
              const [soundalike, associated, adjectives, spelling] = await Promise.all([
                getSoundalikeWord(w),
                getAssociatedWords(w),
                getAdjectiveWord(w),
                getSpellingSimilarWord(w),
              ]);

              const similars = [];

              soundalike.forEach((sw) =>
                similars.push({
                  wordId: wordRecord.id,
                  similarWord: sw.toLowerCase(),
                  type: "soundalike",
                  similarity: 0.8,
                })
              );
              associated.forEach((sw) =>
                similars.push({
                  wordId: wordRecord.id,
                  similarWord: sw.toLowerCase(),
                  type: "associated",
                  similarity: 1.0,
                })
              );
              adjectives.forEach((sw) =>
                similars.push({
                  wordId: wordRecord.id,
                  similarWord: sw.toLowerCase(),
                  type: "adjective",
                  similarity: 0.9,
                })
              );
              spelling.forEach((sw) =>
                similars.push({
                  wordId: wordRecord.id,
                  similarWord: sw.toLowerCase(),
                  type: "spelling",
                  similarity: 0.7,
                })
              );

              if (similars.length > 0) await SimilarWord.bulkCreate(similars);
            } catch (err) {
              console.error(`❌ Error getting similar word for "${w}":`, err.message);
            }
          })
        );

        await wait(delayMs);
      }

      console.log(`✅ Category ${category} completed.`);
    }

    console.log("🌳 Word seed completed succesfully.");
  } catch (err) {
    console.error("❌ Error in seedWords:", err);
  }
}
