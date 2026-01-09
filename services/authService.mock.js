/**
 * Authentication Service
 *
 * Business logic for authentication operations.
 * Uses database layer for all storage operations.
 *
 * This replaces store/userStore.js with proper abstraction.
 */

import { database, StorageKeys, DatabaseError } from "../database";

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a random token for authentication
 * @returns {string}
 */
const generateRandomToken = () => {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};

/**
 * Generate a 6-digit numeric OTP
 * @returns {string}
 */
const generateNumericOTP = () => {
	const otp = Math.floor(100000 + Math.random() * 900000);
	return otp.toString();
};

/**
 * Normalize email for comparison
 * @param {string} email
 * @returns {string}
 */
const normalizeEmail = (email) => {
	return email?.trim().toLowerCase() || "";
};

/**
 * Find user by email or phone
 * @param {Array} users
 * @param {Object} credentials - { email?, phone? }
 * @returns {Object|null}
 */
const findUserByCredentials = (users, credentials) => {
	return users.find((user) => {
		if (credentials.email && user.email) {
			return normalizeEmail(user.email) === normalizeEmail(credentials.email);
		}
		if (credentials.phone && user.phone) {
			return user.phone === credentials.phone;
		}
		return false;
	});
};

/**
 * Static test user for development
 */
const STATIC_TEST_USER = {
	email: "test@example.com",
	username: "testUser",
	password: "password",
	token: "testToken",
	emailVerified: true,
	phoneVerified: false,
};

// ============================================
// ERROR HELPERS
// ============================================

/**
 * Create a formatted error with code and message
 * @param {string} code
 * @param {string} message
 * @returns {Error}
 */
const createAuthError = (code, message) => {
	const error = new Error(`${code}|${message}`);
	error.code = code;
	return error;
};

// Error codes
const AuthErrors = {
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
};

// ============================================
// HELPER: Ensure users array with test user
// ============================================

/**
 * Get users array, ensuring test user exists
 * @returns {Promise<Array>}
 */
const getUsers = async () => {
	let users = await database.read(StorageKeys.USERS, []);

	if (!Array.isArray(users)) {
		users = [];
	}

	// Ensure static test user exists for development
	if (users.length === 0) {
		users.push(STATIC_TEST_USER);
		await database.write(StorageKeys.USERS, users);
	}

	return users;
};

/**
 * Save users array
 * @param {Array} users
 */
const saveUsers = async (users) => {
	await database.write(StorageKeys.USERS, users);
};

/**
 * Save auth token
 * @param {string} token
 */
const saveToken = async (token) => {
	await database.write(StorageKeys.AUTH_TOKEN, token);
};

/**
 * Get auth token
 * @returns {Promise<string|null>}
 */
const getToken = async () => {
	return await database.read(StorageKeys.AUTH_TOKEN, null);
};

// ============================================
// AUTH SERVICE METHODS
// ============================================

const authService = {
	/**
	 * Check if a user exists by email or phone
	 * @param {Object} credentials - { email?, phone? }
	 * @returns {Promise<{success: boolean, data?: {exists: boolean, hasPassword: boolean, ...}, error?: string}>}
	 */
	async checkUserExists(credentials) {
		try {
			const users = await getUsers();
			const user = findUserByCredentials(users, credentials);

			if (!user) {
				return {
					success: false,
					error: "No account found. Please sign up first.",
					data: { exists: false },
				};
			}

			return {
				success: true,
				data: {
					exists: true,
					hasPassword: !!user.password,
					email: user.email,
					phone: user.phone,
					username: user.username,
				},
			};
		} catch (error) {
			return {
				success: false,
				error: error.message || "Unable to check account",
			};
		}
	},

	/**
	 * Set password for a user who doesn't have one
	 * @param {Object} credentials - { email?, phone?, password }
	 * @returns {Promise<{success: boolean, data?: {user: Object, token: string}, error?: string}>}
	 */
	async setPassword(credentials) {
		try {
			const users = await getUsers();
			const userIndex = users.findIndex((u) => {
				if (credentials.email && u.email) {
					return normalizeEmail(u.email) === normalizeEmail(credentials.email);
				}
				if (credentials.phone && u.phone) {
					return u.phone === credentials.phone;
				}
				return false;
			});

			if (userIndex === -1) {
				return {
					success: false,
					error: "User not found. Please sign up first.",
				};
			}

			const token = generateRandomToken();
			users[userIndex].password = credentials.password;
			users[userIndex].token = token;

			await saveUsers(users);
			await saveToken(token);

			return {
				success: true,
				data: {
					user: users[userIndex],
					token: token,
				},
			};
		} catch (error) {
			const errorMessage = error.message?.split("|")[1] || error.message || "Failed to set password";
			return {
				success: false,
				error: errorMessage,
			};
		}
	},

	/**
	 * Login with email/phone and password or OTP
	 * @param {Object} credentials - { email?, phone?, password?, otp? }
	 * @returns {Promise<{ data: Object }>}
	 */
	async login(credentials) {
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		const users = await getUsers();
		const user = findUserByCredentials(users, credentials);

		if (!user) {
			throw createAuthError(
				AuthErrors.USER_NOT_FOUND,
				"No account found. Please sign up first."
			);
		}

		// OTP-based login (password not required)
		if (credentials.otp) {
			const token = generateRandomToken();
			user.token = token;
			if (credentials.email && user.email) user.emailVerified = true;
			if (credentials.phone && user.phone) user.phoneVerified = true;
			if (user.email && user.emailVerified == null) user.emailVerified = true;
			if (user.phone && user.phoneVerified == null) user.phoneVerified = true;

			const updatedUsers = users.map((u) =>
				(u.email && user.email && normalizeEmail(u.email) === normalizeEmail(user.email)) ||
				(u.phone && user.phone && u.phone === user.phone)
					? user
					: u
			);

			await saveUsers(updatedUsers);
			await saveToken(token);

			return { data: user };
		}

		// Password-based login
		if (!user.password) {
			throw createAuthError(
				AuthErrors.NO_PASSWORD,
				"No password set. Please use OTP login or set a password."
			);
		}

		if (user.password !== credentials.password) {
			throw createAuthError(
				AuthErrors.INVALID_PASSWORD,
				"Incorrect password. Please try again."
			);
		}

		const token = generateRandomToken();
		user.token = token;
		if (user.email && user.emailVerified == null) user.emailVerified = true;
		if (user.phone && user.phoneVerified == null) user.phoneVerified = true;

		const updatedUsers = users.map((u) =>
			(u.email && user.email && normalizeEmail(u.email) === normalizeEmail(user.email)) ||
			(u.phone && user.phone && u.phone === user.phone)
				? user
				: u
		);

		await saveUsers(updatedUsers);
		await saveToken(token);

		return { data: user };
	},

	/**
	 * Login with password (wrapper with standard response format)
	 * @param {Object} credentials - { email?, phone?, password }
	 * @returns {Promise<{success: boolean, data?: {user: Object, token: string}, error?: string}>}
	 */
	async loginWithPassword(credentials) {
		try {
			const result = await this.login(credentials);
			return {
				success: true,
				data: {
					user: result.data,
					token: result.data.token,
				},
			};
		} catch (error) {
			const errorMessage = error.message?.split("|")[1] || error.message || "Login failed";
			return {
				success: false,
				error: errorMessage,
			};
		}
	},

	/**
	 * Sign up a new user
	 * @param {Object} credentials - { username, email?, phone?, password?, firstName?, lastName?, etc. }
	 * @returns {Promise<{ data: Object }>}
	 */
	async signUp(credentials) {
		// Simulate network delay
		await new Promise((resolve) => setTimeout(resolve, 1000));

		if (!credentials.username || (!credentials.email && !credentials.phone)) {
			throw createAuthError(
				AuthErrors.INVALID_INPUT,
				"Username and either email or phone are required."
			);
		}

		const users = await getUsers();

		// Check for existing email
		if (credentials.email) {
			const existingEmail = users.find(
				(u) => u.email && normalizeEmail(u.email) === normalizeEmail(credentials.email)
			);
			if (existingEmail) {
				throw createAuthError(
					AuthErrors.EMAIL_EXISTS,
					"An account with this email already exists. Please log in instead."
				);
			}
		}

		// Check for existing phone
		if (credentials.phone) {
			const existingPhone = users.find((u) => u.phone && u.phone === credentials.phone);
			if (existingPhone) {
				throw createAuthError(
					AuthErrors.PHONE_EXISTS,
					"An account with this phone number already exists. Please log in instead."
				);
			}
		}

		const newUser = {
			email: credentials.email || null,
			phone: credentials.phone || null,
			username: credentials.username,
			password: credentials.password || null,
			firstName: credentials.firstName || null,
			lastName: credentials.lastName || null,
			fullName: credentials.fullName || null,
			imageUri: credentials.imageUri || null,
			dateOfBirth: credentials.dateOfBirth || null,
			emailVerified: !!credentials.email,
			phoneVerified: !!credentials.phone,
			token: generateRandomToken(),
		};

		users.push(newUser);
		await saveUsers(users);
		await saveToken(newUser.token);

		return { data: newUser };
	},

	/**
	 * Register a new user (wrapper for signUp with standard response format)
	 * @param {Object} userData - { username, email?, phone?, password?, firstName?, lastName?, etc. }
	 * @returns {Promise<{success: boolean, data?: {user: Object, token: string}, error?: string}>}
	 */
	async register(userData) {
		try {
			// Ensure username exists or generate one
			if (!userData.username) {
				userData.username = userData.email
					? userData.email.split("@")[0].replace(/[^a-z0-9]/gi, "_")
					: userData.phone
					? `user_${userData.phone.replace(/\D/g, "").slice(-6)}`
					: `user_${Date.now()}`;
			}

			const result = await this.signUp(userData);

			return {
				success: true,
				data: {
					user: result.data,
					token: result.data.token,
				},
			};
		} catch (error) {
			const errorMessage = error.message?.split("|")[1] || error.message || "Registration failed";
			return {
				success: false,
				error: errorMessage,
			};
		}
	},

	/**
	 * Get the currently logged in user
	 * @returns {Promise<{ data: Object }>}
	 */
	async getCurrentUser() {
		const token = await getToken();
		if (!token) {
			throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");
		}

		const users = await getUsers();
		const user = users.find((u) => u.token === token);

		if (!user) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		if (!user) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		const shouldBackfillEmailVerified = user.email && user.emailVerified == null;
		const shouldBackfillPhoneVerified = user.phone && user.phoneVerified == null;

		if (shouldBackfillEmailVerified || shouldBackfillPhoneVerified) {
			const updatedUsers = users.map((u) => {
				if (u.token !== token) return u;
				return {
					...u,
					emailVerified: shouldBackfillEmailVerified ? true : u.emailVerified,
					phoneVerified: shouldBackfillPhoneVerified ? true : u.phoneVerified,
				};
			});
			await saveUsers(updatedUsers);
			const updatedUser = updatedUsers.find((u) => u.token === token) ?? user;
			return { data: updatedUser };
		}

		return { data: user };
	},

	/**
	 * Update current user's data
	 * @param {Object} newData - Data to update
	 * @returns {Promise<{ data: Object }>}
	 */
	async updateUser(newData) {
		const token = await getToken();
		if (!token) {
			throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");
		}

		const users = await getUsers();
		const userIndex = users.findIndex((u) => u.token === token);

		if (userIndex === -1) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		users[userIndex] = { ...users[userIndex], ...newData };
		await saveUsers(users);

		return { data: users[userIndex] };
	},

	async createPassword({ password }) {
		const token = await getToken();
		if (!token) {
			throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");
		}
		if (!password || typeof password !== "string" || password.length < 6) {
			throw createAuthError(
				AuthErrors.INVALID_INPUT,
				"Password must be at least 6 characters"
			);
		}

		const users = await getUsers();
		const userIndex = users.findIndex((u) => u.token === token);
		if (userIndex === -1) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		if (users[userIndex].password) {
			throw createAuthError(AuthErrors.PASSWORD_EXISTS, "Password already set");
		}

		users[userIndex] = { ...users[userIndex], password };
		await saveUsers(users);
		return { data: users[userIndex] };
	},

	async changePassword({ currentPassword, newPassword }) {
		const token = await getToken();
		if (!token) {
			throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");
		}
		if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
			throw createAuthError(
				AuthErrors.INVALID_INPUT,
				"Password must be at least 6 characters"
			);
		}

		const users = await getUsers();
		const userIndex = users.findIndex((u) => u.token === token);
		if (userIndex === -1) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		const user = users[userIndex];
		if (!user.password) {
			throw createAuthError(AuthErrors.NO_PASSWORD, "No password set");
		}
		if (user.password !== currentPassword) {
			throw createAuthError(AuthErrors.INVALID_PASSWORD, "Incorrect current password");
		}

		users[userIndex] = { ...user, password: newPassword };
		await saveUsers(users);
		return { data: users[userIndex] };
	},

	/**
	 * Initiate password reset by email
	 * @param {string} email
	 * @returns {Promise<{ message: string, resetToken: string }>}
	 */
	async forgotPassword(email) {
		const users = await getUsers();
		const userIndex = users.findIndex(
			(u) => u.email && normalizeEmail(u.email) === normalizeEmail(email)
		);

		if (userIndex === -1) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		const resetToken = generateNumericOTP();
		users[userIndex] = {
			...users[userIndex],
			resetToken: resetToken,
			resetTokenExpiry: Date.now() + 3600000, // 1 hour
		};

		await saveUsers(users);

		return { message: "Password reset initiated", resetToken };
	},

	/**
	 * Reset password using token
	 * @param {Object} data - { resetToken, newPassword, email }
	 * @returns {Promise<{ message: string }>}
	 */
	async resetPassword(data) {
		const { resetToken, newPassword, email } = data;

		if (!resetToken || typeof resetToken !== "string") {
			throw createAuthError(AuthErrors.INVALID_TOKEN, "Invalid reset token");
		}
		if (!email || typeof email !== "string") {
			throw createAuthError(AuthErrors.INVALID_INPUT, "Invalid email");
		}

		const users = await getUsers();
		const user = users.find(
			(u) => u.email && normalizeEmail(u.email) === normalizeEmail(email)
		);

		if (!user) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		if (String(user.resetToken) !== String(resetToken)) {
			throw createAuthError(AuthErrors.INVALID_TOKEN, "Invalid or expired reset token");
		}

		if (Date.now() > user.resetTokenExpiry) {
			throw createAuthError(AuthErrors.TOKEN_EXPIRED, "Reset token has expired");
		}

		// Update password and clear reset token
		user.password = newPassword;
		delete user.resetToken;
		delete user.resetTokenExpiry;

		const updatedUsers = users.map((u) =>
			u.email && normalizeEmail(u.email) === normalizeEmail(email) ? user : u
		);
		await saveUsers(updatedUsers);

		return { message: "Password reset successful" };
	},

	/**
	 * Logout current user
	 * @returns {Promise<boolean>}
	 */
	async logout() {
		await database.delete(StorageKeys.AUTH_TOKEN);
		return true;
	},

	/**
	 * Delete current user's account
	 * @returns {Promise<boolean>}
	 */
	async deleteUser() {
		const token = await getToken();
		if (!token) {
			throw createAuthError(AuthErrors.NOT_LOGGED_IN, "No user logged in");
		}

		const users = await getUsers();
		const filteredUsers = users.filter((u) => u.token !== token);

		if (filteredUsers.length === users.length) {
			throw createAuthError(AuthErrors.USER_NOT_FOUND, "User not found");
		}

		await saveUsers(filteredUsers);
		await database.delete(StorageKeys.AUTH_TOKEN);

		return true;
	},

	/**
	 * Save pending registration data
	 * @param {Object} data
	 */
	async savePendingRegistration(data) {
		await database.write(StorageKeys.PENDING_REGISTRATION, data);
	},

	/**
	 * Get pending registration data
	 * @returns {Promise<Object|null>}
	 */
	async getPendingRegistration() {
		return await database.read(StorageKeys.PENDING_REGISTRATION, null);
	},

	/**
	 * Clear pending registration data
	 */
	async clearPendingRegistration() {
		await database.delete(StorageKeys.PENDING_REGISTRATION);
	},

	/**
	 * Request OTP for verification (mock implementation)
	 * TODO: Replace with real OTP service when available
	 * @param {Object} params - { email?, phone? }
	 * @returns {Promise<{success: boolean, data?: {otp: string}, error?: string}>}
	 */
	async requestOtp({ email, phone }) {
		if (!email && !phone) {
			return { success: false, error: AuthErrors.INVALID_INPUT };
		}

		// Generate a mock 6-digit OTP
		const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();

		// Store the OTP temporarily for verification
		await database.write(StorageKeys.PENDING_OTP, {
			otp: mockOtp,
			email,
			phone,
			createdAt: Date.now(),
			expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
		});

		console.log(`[DEV] Mock OTP generated: ${mockOtp}`);

		// Return the OTP in response for development display
		return {
			success: true,
			data: {
				otp: mockOtp, // For dev display - remove in production
				message: `OTP sent to ${email || phone}`,
			},
		};
	},

	/**
	 * Verify OTP (mock implementation - accepts any 6-digit code)
	 * TODO: Replace with real OTP verification when available
	 * @param {Object} params - { email?, phone?, otp }
	 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
	 */
	async verifyOtp({ email, phone, otp }) {
		if (!otp || otp.length !== 6) {
			return { success: false, error: "Invalid OTP format" };
		}

		// For development: accept any 6-digit OTP
		// In production, verify against stored OTP
		const storedOtpData = await database.read(StorageKeys.PENDING_OTP, null);

		// Check if there's a stored OTP and if it matches (optional strict mode)
		// For now, we accept any 6-digit OTP for testing
		const isValidOtp = /^\d{6}$/.test(otp);

		if (!isValidOtp) {
			return { success: false, error: "OTP must be 6 digits" };
		}

		// Clear stored OTP after verification attempt
		await database.delete(StorageKeys.PENDING_OTP);

		// Check if user exists for auto-login
		const users = await getUsers();
		const existingUser = users.find(
			(u) =>
				(email && u.email?.toLowerCase() === email.toLowerCase()) ||
				(phone && u.phone === phone)
		);

		if (existingUser) {
			const updatedUsers = users.map((u) => {
				const match =
					(email && u.email?.toLowerCase() === email.toLowerCase()) ||
					(phone && u.phone === phone);
				if (!match) return u;
				return {
					...u,
					emailVerified: email ? true : u.emailVerified,
					phoneVerified: phone ? true : u.phoneVerified,
				};
			});
			await saveUsers(updatedUsers);
			const updatedUser =
				updatedUsers.find(
					(u) =>
						(email && u.email?.toLowerCase() === email.toLowerCase()) ||
						(phone && u.phone === phone)
				) ?? existingUser;

			// User exists - return user data for auto-login
			return {
				success: true,
				data: {
					user: updatedUser,
					token: updatedUser.token,
					isExistingUser: true,
				},
			};
		}

		// User doesn't exist - just verify OTP success
		return {
			success: true,
			data: {
				verified: true,
				isExistingUser: false,
			},
		};
	},
};

export { authService, AuthErrors, createAuthError };
