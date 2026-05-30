/**
 * scoreNormalizer.js
 * Clamps, bounds, and normalizes AI evaluation metrics.
 */

/**
 * Clamps a score between 0 and 10, ensuring it is a valid rounded number.
 * @param {number|string} val - The raw score value.
 * @returns {number} Clamped and rounded score.
 */
export const normalizeScore = (val) => {
  const parsed = parseFloat(val);
  if (isNaN(parsed)) return 5.0; 
  const clamped = Math.max(0, Math.min(10, parsed));
  return Math.round(clamped * 10) / 10; 
};

/**
 * Normalizes all keys of a scores object.
 * @param {Object} scores - Object containing readability, optimization, edgeCaseHandling, debugging, communication, interviewConfidence.
 * @returns {Object} Normalized scores object.
 */
export const normalizeScores = (scores = {}) => {
  const categories = [
    "readability",
    "optimization",
    "edgeCaseHandling",
    "debugging",
    "communication",
    "interviewConfidence"
  ];

  const result = {};
  categories.forEach((cat) => {
    result[cat] = normalizeScore(scores[cat] ?? 5.0);
  });

  return result;
};

/**
 * Calculates an overall confidence estimate (0-100) for the review
 * based on payload completeness (hints used, chat depth, execution runs).
 */
export const calculateConfidence = (payload = {}) => {
  let confidence = 85; 


  if (!payload.chatHistory || payload.chatHistory.length < 2) {
    confidence -= 10;
  }
  if (payload.code && payload.code.length > 3000) {
    confidence -= 5;
  }
  if (payload.failedTests?.length && payload.passedTests?.length) {
    confidence += 10;
  }

  return Math.max(50, Math.min(99, confidence));
};
