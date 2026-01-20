/**
 * Levenshtein Distance Algorithm
 * ===============================
 * Calculates edit distance between two strings
 * Used for fuzzy matching and typo tolerance
 *
 * Algorithm: Dynamic Programming (O(m*n) time, O(m*n) space)
 *
 * Examples:
 * - levenshtein("rest", "restaurant") = 5
 * - levenshtein("resturant", "restaurant") = 1 (typo: u→a)
 * - levenshtein("caffe", "cafe") = 2 (typo: extra f)
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Edit distance (number of changes needed)
 */
function levenshteinDistance(str1, str2) {
  // Convert to lowercase for case-insensitive comparison
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  const len1 = s1.length;
  const len2 = s2.length;

  // Early returns for edge cases
  if (len1 === 0) return len2;
  if (len2 === 0) return len1;
  if (s1 === s2) return 0;

  // Create 2D array for dynamic programming
  // dp[i][j] = minimum edits to transform s1[0...i-1] to s2[0...j-1]
  const dp = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= len1; i++) {
    dp[i][0] = i; // Delete all characters from s1
  }
  for (let j = 0; j <= len2; j++) {
    dp[0][j] = j; // Insert all characters from s2
  }

  // Fill the DP table
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        // Characters match - no operation needed
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        // Characters don't match - take minimum of:
        // 1. Replace: dp[i-1][j-1] + 1
        // 2. Delete from s1: dp[i-1][j] + 1
        // 3. Insert into s1: dp[i][j-1] + 1
        dp[i][j] = Math.min(
          dp[i - 1][j - 1] + 1, // Replace
          dp[i - 1][j] + 1,     // Delete
          dp[i][j - 1] + 1      // Insert
        );
      }
    }
  }

  return dp[len1][len2];
}

/**
 * Check if two strings are similar within a threshold
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @param {number} threshold - Maximum edit distance to consider similar (default: 2)
 * @returns {boolean} - True if strings are similar
 */
function isSimilar(str1, str2, threshold = 2) {
  const distance = levenshteinDistance(str1, str2);
  return distance <= threshold;
}

/**
 * Calculate similarity percentage (0-100)
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - Similarity percentage (0-100)
 */
function similarityPercentage(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;

  const distance = levenshteinDistance(str1, str2);
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Find closest match from an array of strings
 * @param {string} target - Target string to match
 * @param {Array<string>} candidates - Array of candidate strings
 * @param {number} maxDistance - Maximum edit distance (default: 2)
 * @returns {Object|null} - {match: string, distance: number, similarity: number} or null
 */
function findClosestMatch(target, candidates, maxDistance = 2) {
  if (!target || !candidates || candidates.length === 0) {
    return null;
  }

  let bestMatch = null;
  let bestDistance = Infinity;

  for (const candidate of candidates) {
    const distance = levenshteinDistance(target, candidate);

    if (distance <= maxDistance && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = {
        match: candidate,
        distance: distance,
        similarity: similarityPercentage(target, candidate)
      };
    }
  }

  return bestMatch;
}

/**
 * Find all matches within threshold
 * @param {string} target - Target string to match
 * @param {Array<string>} candidates - Array of candidate strings
 * @param {number} maxDistance - Maximum edit distance (default: 2)
 * @returns {Array<Object>} - Array of {match: string, distance: number, similarity: number}
 */
function findAllMatches(target, candidates, maxDistance = 2) {
  if (!target || !candidates || candidates.length === 0) {
    return [];
  }

  const matches = [];

  for (const candidate of candidates) {
    const distance = levenshteinDistance(target, candidate);

    if (distance <= maxDistance) {
      matches.push({
        match: candidate,
        distance: distance,
        similarity: similarityPercentage(target, candidate)
      });
    }
  }

  // Sort by distance (closest first), then by similarity
  matches.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return b.similarity - a.similarity;
  });

  return matches;
}

module.exports = {
  levenshteinDistance,
  isSimilar,
  similarityPercentage,
  findClosestMatch,
  findAllMatches
};
