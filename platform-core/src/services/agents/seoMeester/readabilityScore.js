/**
 * Readability Score — Flesch-Kincaid adapted per language
 * Calculates readability scores for content in NL/EN/DE/ES/FR.
 *
 * @version 1.0.0
 */

/**
 * Language-specific Flesch-Kincaid constants
 * Standard FK = 206.835 - 1.015 * ASL - 84.6 * ASW
 * Dutch (Douma): 206.835 - 0.93 * ASL - 77 * ASW
 * German (Amstad): 180 - ASL - 58.5 * ASW
 * Spanish: 206.84 - 1.02 * ASL - 60 * ASW
 */
const FK_CONSTANTS = {
  en: { base: 206.835, asl: 1.015, asw: 84.6 },
  nl: { base: 206.835, asl: 0.93, asw: 77 },
  de: { base: 180, asl: 1.0, asw: 58.5 },
  es: { base: 206.84, asl: 1.02, asw: 60 },
  fr: { base: 207, asl: 1.015, asw: 73.6 },
};

/**
 * Count syllables in a word (language-aware heuristic)
 */
function countSyllables(word, lang = 'en') {
  word = word.toLowerCase().replace(/[^a-zàáâãäåèéêëìíîïòóôõöùúûüñçÿ]/g, '');
  if (word.length <= 2) return 1;

  // Dutch-specific: endings like -en, -ij are typically 1 syllable
  if (lang === 'nl') {
    const vowels = word.match(/[aeiouàáâãäåèéêëìíîïòóôõöùúûüÿ]+/gi);
    return vowels ? Math.max(1, vowels.length) : 1;
  }

  // German: compound words have more syllables
  if (lang === 'de') {
    const vowels = word.match(/[aeiouäöüàáâèéêìíîòóôùúû]+/gi);
    return vowels ? Math.max(1, vowels.length) : 1;
  }

  // English/Spanish/French: vowel group counting
  const vowelGroups = word.match(/[aeiouyàáâãäåèéêëìíîïòóôõöùúûüÿ]+/gi);
  let count = vowelGroups ? vowelGroups.length : 1;

  // English: silent -e at end
  if (lang === 'en' && word.endsWith('e') && count > 1) count--;
  // English: -le at end adds a syllable
  if (lang === 'en' && word.endsWith('le') && word.length > 3) count++;

  return Math.max(1, count);
}

/**
 * Calculate Flesch-Kincaid readability score
 * Higher = easier to read (target: 50-70 for tourism content)
 *
 * @param {string} text - The content to analyze
 * @param {string} lang - Language code (en/nl/de/es/fr)
 * @returns {Object} { score, grade, label, sentences, words, syllables }
 */
export function calculateReadability(text, lang = 'en') {
  if (!text || text.trim().length === 0) {
    return { score: 0, grade: 'N/A', label: 'No content', sentences: 0, words: 0, syllables: 0 };
  }

  // Strip HTML/markdown for analysis
  const cleanText = text
    .replace(/<[^>]+>/g, ' ')
    .replace(/#{1,6}\s+/g, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .trim();

  // Split into sentences (. ! ? and newlines after headings)
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);

  // Split into words
  const words = cleanText.split(/\s+/).filter(w => w.replace(/[^a-zA-ZàáâãäåèéêëìíîïòóôõöùúûüñçÿÀ-ÿ]/g, '').length > 0);
  const wordCount = Math.max(1, words.length);

  // Count syllables
  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w, lang), 0);

  // Average Sentence Length & Average Syllables per Word
  const ASL = wordCount / sentenceCount;
  const ASW = syllableCount / wordCount;

  // Apply language-specific FK formula
  const constants = FK_CONSTANTS[lang] || FK_CONSTANTS.en;
  const score = Math.round((constants.base - (constants.asl * ASL) - (constants.asw * ASW)) * 10) / 10;
  const clampedScore = Math.max(0, Math.min(100, score));

  return {
    score: clampedScore,
    grade: getGrade(clampedScore),
    label: getLabel(clampedScore),
    sentences: sentenceCount,
    words: wordCount,
    syllables: syllableCount,
    avgSentenceLength: Math.round(ASL * 10) / 10,
    avgSyllablesPerWord: Math.round(ASW * 10) / 10,
  };
}

function getGrade(score) {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'B-';
  if (score >= 50) return 'C';
  if (score >= 40) return 'C-';
  if (score >= 30) return 'D';
  return 'F';
}

function getLabel(score) {
  if (score >= 80) return 'Very Easy';
  if (score >= 60) return 'Easy';
  if (score >= 50) return 'Moderate';
  if (score >= 30) return 'Difficult';
  return 'Very Difficult';
}

export default { calculateReadability };
