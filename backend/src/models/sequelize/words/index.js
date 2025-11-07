import Word from "./Word.js";
import TabooWord from "./TabooWord.js";
import SimilarWord from "./SimilarWord.js";

// Relaciones 1:N
Word.hasMany(TabooWord, { foreignKey: "wordId", onDelete: "CASCADE" });
Word.hasMany(SimilarWord, { foreignKey: "wordId", onDelete: "CASCADE" });

TabooWord.belongsTo(Word, { foreignKey: "wordId" });
SimilarWord.belongsTo(Word, { foreignKey: "wordId" });

export { Word, TabooWord, SimilarWord };
