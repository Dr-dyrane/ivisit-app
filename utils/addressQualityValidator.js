/**
 * Address Quality Validator
 *
 * Validates addresses before saving to prevent gibberish/corrupted text.
 * Checks for:
 * - Minimum length requirements
 * - Character repetition (e.g., "oooo")
 * - Valid street number patterns
 * - Common address components (street, city, state indicators)
 */

const MIN_ADDRESS_LENGTH = 8;
const MAX_REPEATED_CHARS = 3;
const MIN_WORDS = 2;

// Common street type abbreviations
const STREET_TYPES = [
  'st', 'street', 'ave', 'avenue', 'blvd', 'boulevard', 'rd', 'road',
  'dr', 'drive', 'ln', 'lane', 'ct', 'court', 'cir', 'circle',
  'way', 'pl', 'place', 'ter', 'terrace', 'trl', 'trail', 'loop',
  'hwy', 'highway', 'fwy', 'freeway', 'pkwy', 'parkway',
];

// Common address number indicators
const NUMBER_PATTERNS = [
  /^\d+\s+/,           // Starts with number
  /^\d+-\d+\s+/,      // Range like 123-125
  /^\d+[a-zA-Z]\s+/,  // Like 123A
];

/**
 * Check for excessive character repetition (sign of corruption)
 * e.g., "corintoo" has 'oo' twice, "aaaa" is invalid
 */
function hasExcessiveRepetition(text) {
  const repeatedCharPattern = /(.)\1{3,}/; // 4+ same chars in a row
  return repeatedCharPattern.test(text);
}

/**
 * Check if address contains valid street type
 */
function hasStreetType(address) {
  const lower = address.toLowerCase();
  return STREET_TYPES.some(type => lower.includes(type));
}

/**
 * Check if address starts with a valid number pattern
 */
function hasValidNumber(address) {
  return NUMBER_PATTERNS.some(pattern => pattern.test(address));
}

/**
 * Calculate address quality score (0-100)
 */
export function calculateAddressQuality(address) {
  if (!address || typeof address !== 'string') {
    return { score: 0, issues: ['No address provided'] };
  }

  const trimmed = address.trim();
  const issues = [];
  let score = 100;

  // Length check
  if (trimmed.length < MIN_ADDRESS_LENGTH) {
    score -= 30;
    issues.push('Address too short');
  }

  // Word count check
  const words = trimmed.split(/\s+/).filter(w => w.length > 0);
  if (words.length < MIN_WORDS) {
    score -= 25;
    issues.push('Address incomplete (needs street number and name)');
  }

  // Repetition check (corruption indicator)
  if (hasExcessiveRepetition(trimmed)) {
    score -= 40;
    issues.push('Contains suspicious character repetition');
  }

  // Street type check
  if (!hasStreetType(trimmed)) {
    score -= 20;
    issues.push('Missing street type (St, Ave, Rd, etc.)');
  }

  // Number check
  if (!hasValidNumber(trimmed)) {
    score -= 15;
    issues.push('Missing street number');
  }

  return {
    score: Math.max(0, score),
    issues,
    isValid: score >= 60,
  };
}

/**
 * Quick validation - returns true/false
 */
export function isAddressValid(address) {
  const { isValid } = calculateAddressQuality(address);
  return isValid;
}

/**
 * Get validation message for UI display
 */
export function getAddressValidationMessage(address) {
  const { score, issues, isValid } = calculateAddressQuality(address);

  if (isValid) {
    return { valid: true, message: 'Address looks good', score };
  }

  return {
    valid: false,
    message: issues[0] || 'Address appears invalid',
    score,
    details: issues,
  };
}
