/**
 * Auth Error Utilities
 * Centralized error handling for authentication
 */

/**
 * Create a formatted error with code and message
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
export const createAuthError = (code, message) => {
    const error = new Error(`${code}|${message}`);
    error.code = code;
    return error;
};

// Error codes mapping
export const AuthErrors = {
    USER_NOT_FOUND: "USER_NOT_FOUND",
    INVALID_PASSWORD: "INVALID_PASSWORD",
    NO_PASSWORD: "NO_PASSWORD",
    EMAIL_EXISTS: "EMAIL_EXISTS",
    PHONE_EXISTS: "PHONE_EXISTS",
    INVALID_INPUT: "INVALID_INPUT",
    INVALID_TOKEN: "INVALID_TOKEN",
    TOKEN_EXPIRED: "TOKEN_EXPIRED",
    NOT_LOGGED_IN: "NOT_LOGGED_IN",
    PASSWORD_EXISTS: "PASSWORD_EXISTS",
    NETWORK_ERROR: "NETWORK_ERROR",
    UNKNOWN_ERROR: "UNKNOWN_ERROR",
    NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
};

/**
 * Map Supabase error to AuthError
 * Enhanced error mapping to catch specific Supabase/Twilio feedback
 * ensuring user-friendly alerts instead of generic developer logs.
 */
export const handleSupabaseError = (error) => {
    console.error("Supabase Auth Error:", error);
    if (!error) return createAuthError(AuthErrors.UNKNOWN_ERROR, "An unknown error occurred");

    const msg = error.message?.toLowerCase() || "";

    if (msg.includes("invalid login credentials")) {
        return createAuthError(AuthErrors.INVALID_PASSWORD, "Invalid email or password");
    }
    if (msg.includes("user not found")) {
        return createAuthError(AuthErrors.USER_NOT_FOUND, "Account not found");
    }
    if (msg.includes("already registered")) {
        return createAuthError(AuthErrors.EMAIL_EXISTS, "User already exists");
    }
    if (msg.includes("password")) {
        if (msg.includes("different from the old")) {
            return createAuthError(AuthErrors.PASSWORD_EXISTS, "New password must be different from the old one");
        }
        return createAuthError(AuthErrors.INVALID_PASSWORD, error.message);
    }
    if (msg.includes("network")) {
        return createAuthError(AuthErrors.NETWORK_ERROR, "Network connection error");
    }

    // Improved Email Validation Error Catching
    if (msg.includes("invalid email") ||
        msg.includes("email address is invalid") ||
        (msg.includes("email") && msg.includes("is invalid"))) {
        return createAuthError(AuthErrors.INVALID_INPUT, "Please enter a valid email address");
    }

    // Improved Phone Validation Error Catching
    if (msg.includes("phone") && (msg.includes("invalid") || msg.includes("format") || msg.includes("is invalid"))) {
        return createAuthError(AuthErrors.INVALID_INPUT, "Invalid phone number format");
    }

    if (msg.includes("email not confirmed")) {
        return createAuthError(AuthErrors.INVALID_TOKEN, "Please verify your email first");
    }

    // Handle Provider-side Failures (e.g. Twilio Authentication error 20003)
    if (msg.includes("error sending confirmation otp") || msg.includes("twilio") || msg.includes("provider: authenticate")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Verification service is currently unavailable. Please try again later.");
    }

    if (msg.includes("sms")) {
        return createAuthError(AuthErrors.INVALID_TOKEN, "Failed to send SMS. Please check the number.");
    }

    if (msg.includes("otp") || msg.includes("token")) {
        if (msg.includes("expired")) {
            return createAuthError(AuthErrors.TOKEN_EXPIRED, "The code has expired. Please request a new one.");
        }
        if (msg.includes("invalid")) {
            return createAuthError(AuthErrors.INVALID_TOKEN, "Invalid verification code.");
        }
        return createAuthError(AuthErrors.INVALID_TOKEN, "Verification code error.");
    }

    if (msg.includes("rate limit") || msg.includes("too many requests")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Too many attempts. Please wait a few minutes and try again.");
    }
    if (msg.includes("signup disabled")) {
        return createAuthError(AuthErrors.UNKNOWN_ERROR, "Registration is temporarily disabled");
    }

    // Default to a cleaner unknown error presentation
    const cleanMsg = error.message || "An unexpected error occurred during authentication";
    return createAuthError(AuthErrors.UNKNOWN_ERROR, cleanMsg);
};
