export function checkTabooWord(rawText, tabooWords) {
  const normalizedText = cleanText(rawText);
  for (const taboo of tabooWords) {
    const cleanedTaboo = cleanText(taboo);
    if (normalizedText.includes(cleanedTaboo)) {
      return taboo; // return the actual taboo word matched
    }
  }
  return null;
}

export function checkSimilarWords(rawText, similarWordsArray) {
  const normalizedText = cleanText(rawText);
  for (const similarWord of similarWordsArray) {
    const cleanedSimilar = cleanText(similarWord);
    if (normalizedText.includes(cleanedSimilar)) {
      return similarWord; // return the matched similar word
    }
  }
  return null;
}

export function normalize(str) {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD") // delete accent marks
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ") // collapse multiples spaces
    .trim();
}

// Removes plural forms from words ("cats" -> "cat").
export function singularize(word) {
  if (!word) return "";
  return word.replace(/s\b/g, "").trim();
}

// Applies normalization and singularization to full text.
export function cleanText(text) {
  return singularize(normalize(text));
}
