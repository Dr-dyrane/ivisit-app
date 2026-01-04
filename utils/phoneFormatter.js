/**
 * Phone number formatting utilities for all countries
 * Handles display formatting for better UX
 */

/**
 * Format phone number based on country
 * US/Canada: (123) 456-7890
 * UK: 12345 678901
 * Most others: 123 456 7890
 */
export function formatPhoneNumber(number, countryCode) {
  // Remove all non-digits
  const cleaned = number.replace(/\D/g, "")

  if (!cleaned) return ""

  // US, Canada, Caribbean NANP countries
  if (countryCode === "US" || countryCode === "CA" || ["PR", "DO", "JM", "TT", "BS", "BB"].includes(countryCode)) {
    if (cleaned.length <= 3) return cleaned
    if (cleaned.length <= 6) return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`
  }

  // UK formatting
  if (countryCode === "GB") {
    if (cleaned.length <= 5) return cleaned
    return `${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }

  // Default: space every 3 digits
  return cleaned.match(/.{1,3}/g)?.join(" ") || cleaned
}

/**
 * Remove formatting to get clean digits
 */
export function cleanPhoneNumber(formatted) {
  return formatted.replace(/\D/g, "")
}

/**
 * Get placeholder based on country
 */
export function getPhonePlaceholder(countryCode) {
  const placeholders = {
    US: "(555) 123-4567",
    CA: "(555) 123-4567",
    GB: "12345 678901",
    NG: "803 123 4567",
    IN: "98765 43210",
    AU: "412 345 678",
    DE: "151 23456789",
    FR: "612 345 678",
    BR: "11 98765 4321",
    MX: "55 1234 5678",
  }

  return placeholders[countryCode] || "123 456 7890"
}

/**
 * Validate if phone number matches country requirements
 */
export function isValidLength(number, country) {
  if (!country) return false

  const cleaned = cleanPhoneNumber(number)
  return cleaned.length >= country.min && cleaned.length <= country.max
}
