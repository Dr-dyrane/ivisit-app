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
					user.email &&
					user.email.trim().toLowerCase() ===
						credentials.email.trim().toLowerCase()
			);

			if (user && user.password === credentials.password) {
				const token = generateRandomToken();
				user.token = token;

				const updatedUsers = users.map((u) =>
					u.email === user.email ? user : u
				);
				await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));
				await AsyncStorage.setItem("token", token);

				return { data: user };
			} else {
				throw new Error("Invalid email or password");
			}
		} catch (error) {
			console.error("Login error:", error.message);
			throw error;
		}
	},

	signUp: async (credentials) => {
		try {
			await new Promise((resolve) => setTimeout(resolve, 1000));

				// Allow sign-up with either email or phone; password optional (can be set later)
				if (!credentials.username || (!credentials.email && !credentials.phone)) {
					throw new Error("Username and either email or phone are required for sign-up");
				}

				const newUser = {
					email: credentials.email || null,
					phone: credentials.phone || null,
					username: credentials.username,
					password: credentials.password || null,
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

				// Check duplicates by email or phone
				if (newUser.email) {
					if (
						users.some((user) => user.email && user.email.trim().toLowerCase() === newUser.email.trim().toLowerCase())
					) {
						throw new Error("User with this email already exists");
					}
				}
				if (newUser.phone) {
					if (
						users.some((user) => user.phone && user.phone === newUser.phone)
					) {
						throw new Error("User with this phone already exists");
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
			let users = usersData ? JSON.parse(usersData) : [];

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
			let users = usersData ? JSON.parse(usersData) : [];

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
		// Utility function to generate a 6-digit numeric OTP
		const generateNumericOTP = () => {
			const otp = Math.floor(100000 + Math.random() * 900000); // Generates a random number between 100000 and 999999
			return otp.toString(); // Convert to string if needed
		};

		try {
			// Load existing users from AsyncStorage
			const usersData = await AsyncStorage.getItem("users");
			let users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			// Log users before processing
			console.log("Users before processing:", users);

			// Find the user
			const userIndex = users.findIndex(
				(user) =>
					user.email &&
					user.email.trim().toLowerCase() === email.trim().toLowerCase()
			);

			if (userIndex === -1) {
				throw new Error("User not found");
			}

			// Generate a reset token
			const resetToken = generateNumericOTP();
			users[userIndex] = {
				...users[userIndex],
				resetToken: resetToken,
				resetTokenExpiry: Date.now() + 3600000, // 1 hour validity
			};

			// Save updated users data back to AsyncStorage
			await AsyncStorage.setItem("users", JSON.stringify(users));

			// Retrieve and verify if the reset token was correctly saved
			const updatedUsersData = await AsyncStorage.getItem("users");
			const updatedUsers = updatedUsersData ? JSON.parse(updatedUsersData) : [];
			const verifiedUser = updatedUsers.find(
				(u) =>
					u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
					u.resetToken === resetToken
			);

			//console.log("Verified user after reset token:", verifiedUser);

			if (verifiedUser) {
				//	console.log("Password reset initiated. Token:", resetToken);
				return { message: "Password reset initiated", resetToken };
			} else {
				throw new Error("Failed to update reset token");
			}
		} catch (error) {
			//console.error("Forgot password error:", error.message);
			throw error;
		}
	},

	resetPassword: async (data) => {
		// console.log(data);
		const { resetToken, newPassword, email } = data; // Destructure the data object

		// console.log("Reset Token:", resetToken);
		// console.log("New Password:", newPassword);
		// console.log("Email:", email);

		try {
			// Validate resetToken and email
			if (!resetToken || typeof resetToken !== "string") {
				throw new Error("Invalid reset token");
			}
			if (!email || typeof email !== "string") {
				throw new Error("Invalid email");
			}

			// Load the latest users data from AsyncStorage
			const usersData = await AsyncStorage.getItem("users");
			const users = usersData ? JSON.parse(usersData) : [];

			if (!Array.isArray(users)) {
				throw new Error("Invalid user data");
			}

			// Log users before password reset
			console.log("Users before password reset:", users);

			// Find the user by email (trimmed and lowercase for comparison)
			const user = users.find(
				(user) =>
					user.email &&
					user.email.trim().toLowerCase() === email.trim().toLowerCase()
			);

			if (!user) {
				throw new Error("User not found");
			}

			// Check if the reset token matches
			if (String(user.resetToken) !== String(resetToken)) {
				throw new Error("Invalid or expired reset token");
			}

			// Check if the reset token has expired
			if (Date.now() > user.resetTokenExpiry) {
				throw new Error("Reset token has expired");
			}

			// Update the user's password
			user.password = newPassword;
			delete user.resetToken; // Clean up
			delete user.resetTokenExpiry; // Clean up

			// Update the user in the users array and save it back to AsyncStorage
			const updatedUsers = users.map((u) =>
				u.email === user.email ? user : u
			);
			await AsyncStorage.setItem("users", JSON.stringify(updatedUsers));

			return { message: "Password reset successful" };
		} catch (error) {
			//console.error("Reset password error:", error.message);
			throw error;
		}
	},
};

export default userStore;
