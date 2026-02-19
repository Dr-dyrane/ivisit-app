/**
 * Validation Utils
 * Centralized logic for data validation across the app.
 * Adheres to the "Service" layer of the View-Hook-Service architecture.
 */

// Simple, safe regex pattern for email
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Basic password requirements (min 6 chars)
export const MIN_PASSWORD_LENGTH = 6;

/**
 * Validates an email address
 * @param {string} email 
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    if (!email) return false;
    return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates a password
 * @param {string} password 
 * @returns {boolean}
 */
export const isValidPassword = (password) => {
    if (!password) return false;
    return password.length >= MIN_PASSWORD_LENGTH;
};

/**
 * Validates a name (first or last)
 * @param {string} name 
 * @returns {boolean}
 */
export const isValidName = (name) => {
    if (!name) return false;
    return name.trim().length >= 2;
};

/**
 * Basic phone validation (regex only)
 * For robust validation, use usePhoneValidation hook (libphonenumber)
 * @param {string} phone 
 * @returns {boolean}
 */
export const isValidPhone = (phone) => {
    if (!phone) return false;
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

/**
 * Validates if a string is a valid UUID
 * @param {string} id 
 * @returns {boolean}
 */
export const isValidUUID = (id) => {
    if (!id || typeof id !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};
