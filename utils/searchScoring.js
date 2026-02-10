/**
 * Search Scoring Utility
 * 
 * Pure functions for calculating search relevance scores.
 * Independent of React or any Context.
 */

/**
 * Calculates a relevance score for a search term against a target string.
 * 
 * Scoring Rules:
 * - Exact Match: 120 points
 * - Starts With: 90 points
 * - Includes: 60 points
 * - No Match: 0 points
 * 
 * @param {string} needle - The search query
 * @param {string} haystack - The text to search within
 * @returns {number} The calculated score
 */
export const scoreText = (needle, haystack) => {
    const n = typeof needle === "string" ? needle.trim().toLowerCase() : "";
    const h = typeof haystack === "string" ? haystack.trim().toLowerCase() : "";
    
    if (!n || !h) return 0;
    if (h === n) return 120;
    if (h.startsWith(n)) return 90;
    if (h.includes(n)) return 60;
    return 0;
};

/**
 * Checks if a query is related to bed availability.
 * @param {string} query 
 * @returns {boolean}
 */
export const isBedRelatedQuery = (query) => {
    return /\b(bed|icu|ward|admission|reserve|reservation)\b/i.test(
        query ?? ""
    );
};
