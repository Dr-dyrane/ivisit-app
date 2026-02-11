/**
 * Custom error class for database operations
 */
export class DatabaseError extends Error {
	constructor(message, code, originalError = null) {
		super(message);
		this.name = "DatabaseError";
		this.code = code;
		this.originalError = originalError;
	}
}

/**
 * Error codes for database operations
 */
export const ErrorCodes = {
	TIMEOUT: "TIMEOUT",
	INVALID_KEY: "INVALID_KEY",
	INVALID_TYPE: "INVALID_TYPE",
	READ_ERROR: "READ_ERROR",
	WRITE_ERROR: "WRITE_ERROR",
	DELETE_ERROR: "DELETE_ERROR",
	NOT_FOUND: "NOT_FOUND",
	CLEAR_ERROR: "CLEAR_ERROR",
	STATS_ERROR: "STATS_ERROR",
};

/** Default timeout for database operations (ms) */
export const DB_TIMEOUT = 5000;
