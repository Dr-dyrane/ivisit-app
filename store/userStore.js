// store/userStore.js

import AsyncStorage from "@react-native-async-storage/async-storage";

const generateRandomToken = () => {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};

const userStore = {
	staticUserData: {
		email: "test@example.com",
		username: "testUser",
		password: "password",
		token: "testToken",
	},

	checkUserExists: async (credentials) => {
		try {
			const usersData = await AsyncStorage.getItem("users");
			let users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				users = [];
			}

			if (users.length === 0) {
				users.push(userStore.staticUserData);
				await AsyncStorage.setItem("users", JSON.stringify(users));
			}

			const user = users.find(
				(user) =>
					(credentials.email &&
						user.email &&
						user.email.trim().toLowerCase() ===
							credentials.email.trim().toLowerCase()) ||
					(credentials.phone && user.phone && user.phone === credentials.phone)
			);

			if (!user) {
				throw new Error(
					"USER_NOT_FOUND|No account found with these credentials. Please sign up first."
				);
			}

			return {
				exists: true,
				hasPassword: !!user.password,
				email: user.email,
				phone: user.phone,
				username: user.username,
			};
		} catch (error) {
			console.error("Check user exists error:", error.message);
			throw error;
		}
	},

	setPassword: async (credentials) => {
		try {
			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("INVALID_DATA|Invalid user data");
			}

			const userIndex = users.findIndex(
				(user) =>
					(credentials.email &&
						user.email &&
						user.email.trim().toLowerCase() ===
							credentials.email.trim().toLowerCase()) ||
					(credentials.phone && user.phone && user.phone === credentials.phone)
			);

			if (userIndex === -1) {
				throw new Error("USER_NOT_FOUND|User not found");
			}

			users[userIndex].password = credentials.password;
			await AsyncStorage.setItem("users", JSON.stringify(users));

			const token = generateRandomToken();
			users[userIndex].token = token;
			await AsyncStorage.setItem("token", token);

			return { data: users[userIndex] };
		} catch (error) {
			console.error("Set password error:", error.message);
			throw error;
		}
	},

	login: async (credentials) => {
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			const usersData = await AsyncStorage.getItem("users");
			let users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				users = [];
			}

			if (users.length === 0) {
				users.push(userStore.staticUserData);
				await AsyncStorage.setItem("users", JSON.stringify(users));
			}

			const user = users.find(
				(user) =>
					(user.email &&
						user.email.trim().toLowerCase() ===
							credentials.email?.trim().toLowerCase()) ||
					user.phone === credentials.phone
			);

			if (!user) {
				throw new Error(
					"USER_NOT_FOUND|No account found. Please sign up first."
				);
			}

			if (credentials.otp) {
				// OTP-based login (password not required)
				const token = generateRandomToken();
				user.token = token;

				const updatedUsers = users.map((u) =>
					u.email === user.email || u.phone === user.phone ? user : u
				);
				await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));
				await AsyncStorage.setItem("token", token);

				return { data: user };
			}

			if (!user.password) {
				throw new Error(
					"NO_PASSWORD|No password set. Please use OTP login or set a password."
				);
			}

			if (user.password === credentials.password) {
				const token = generateRandomToken();
				user.token = token;

				const updatedUsers = users.map((u) =>
					u.email === user.email || u.phone === user.phone ? user : u
				);
				await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));
				await AsyncStorage.setItem("token", token);

				return { data: user };
			} else {
				throw new Error(
					"INVALID_PASSWORD|Incorrect password. Please try again."
				);
			}
		} catch (error) {
			console.error("Login error:", error.message);
			throw error;
		}
	},

	signUp: async (credentials) => {
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

			if (!credentials.username || (!credentials.email && !credentials.phone)) {
				throw new Error(
					"INVALID_INPUT|Username and either email or phone are required."
				);
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
				token: generateRandomToken(),
			};

			const usersData = await AsyncStorage.getItem("users");
			let users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				users = [];
			}

			if (users.length === 0) {
				users.push(userStore.staticUserData);
			}

			if (newUser.email) {
				const existingEmail = users.find(
					(user) =>
						user.email &&
						user.email.trim().toLowerCase() ===
							newUser.email.trim().toLowerCase()
				);
				if (existingEmail) {
					throw new Error(
						"EMAIL_EXISTS|An account with this email already exists. Please log in instead."
					);
				}
			}

			if (newUser.phone) {
				const existingPhone = users.find(
					(user) => user.phone && user.phone === newUser.phone
				);
				if (existingPhone) {
					throw new Error(
						"PHONE_EXISTS|An account with this phone number already exists. Please log in instead."
					);
				}
			}

			users.push(newUser);
			await AsyncStorage.setItem("users", JSON.stringify(users));
			await AsyncStorage.setItem("token", newUser.token);

			return { data: newUser };
		} catch (error) {
			console.error("Sign-up error:", error.message);
			throw error;
		}
	},

	getCurrentUser: async () => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				throw new Error("No user logged in");
			}

			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			const user = users.find((user) => user.token === token);

			if (user) {
				return { data: user };
			} else {
				throw new Error("User not found");
			}
		} catch (error) {
			console.error("Get current user error:", error.message);
			throw error;
		}
	},

	updateUser: async (newData) => {
		try {
			const token = await AsyncStorage.getItem("token");
			if (!token) {
				throw new Error("No user logged in");
			}

			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			const userIndex = users.findIndex((user) => user.token === token);

			if (userIndex === -1) {
				throw new Error("User not found");
			}

			users[userIndex] = { ...users[userIndex], ...newData };
			await AsyncStorage.setItem("users", JSON.stringify(users));
			return { data: users[userIndex] };
		} catch (error) {
			console.error("Update user error:", error.message);
			throw error;
		}
	},

	forgotPassword: async (email) => {
		const generateNumericOTP = () => {
			const otp = Math.floor(100000 + Math.random() * 900000);
			return otp.toString();
		};

		try {
			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			console.log("Users before processing:", users);

			const userIndex = users.findIndex(
				(user) =>
					user.email &&
					user.email.trim().toLowerCase() === email.trim().toLowerCase()
			);

			if (userIndex === -1) {
				throw new Error("User not found");
			}

			const resetToken = generateNumericOTP();
			users[userIndex] = {
				...users[userIndex],
				resetToken: resetToken,
				resetTokenExpiry: Date.now() + 3600000,
			};

			await AsyncStorage.setItem("users", JSON.stringify(users));

			const updatedUsersData = await AsyncStorage.getItem("users");
			const updatedUsers = updatedUsersData ? JSON.parse(updatedUsersData) : [];
			const verifiedUser = updatedUsers.find(
				(u) =>
					u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
					u.resetToken === resetToken
			);

			if (verifiedUser) {
				return { message: "Password reset initiated", resetToken };
			} else {
				throw new Error("Failed to update reset token");
			}
		} catch (error) {
			throw error;
		}
	},

	resetPassword: async (data) => {
		const { resetToken, newPassword, email } = data;

		try {
			if (!resetToken || typeof resetToken !== "string") {
				throw new Error("Invalid reset token");
			}
			if (!email || typeof email !== "string") {
				throw new Error("Invalid email");
			}

			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			console.log("Users before password reset:", users);

			const user = users.find(
				(user) =>
					user.email &&
					user.email.trim().toLowerCase() === email.trim().toLowerCase()
			);

			if (!user) {
				throw new Error("User not found");
			}

			if (String(user.resetToken) !== String(resetToken)) {
				throw new Error("Invalid or expired reset token");
			}

			if (Date.now() > user.resetTokenExpiry) {
				throw new Error("Reset token has expired");
			}

			user.password = newPassword;
			delete user.resetToken;
			delete user.resetTokenExpiry;

			const updatedUsers = users.map((u) =>
				u.email === user.email ? user : u
			);
			await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));

			return { message: "Password reset successful" };
		} catch (error) {
			throw error;
		}
	},
};

export default userStore;
