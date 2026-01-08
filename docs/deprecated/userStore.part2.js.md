# userStore.js (Deprecated) - Part 2

> Continuation of `userStore.js.md`

---

## Original Code (Continued)

```javascript
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

			return { message: "Password reset initiated", resetToken };
		} catch (error) {
			throw error;
		}
	},
```

> **Note:** See Part 3 for `resetPassword` and export.

