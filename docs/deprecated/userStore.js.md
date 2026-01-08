# userStore.js (Deprecated)

> **Original Location:** `store/userStore.js`  
> **Replaced By:** `services/authService.js`  
> **Backup Date:** 2026-01-08

---

## Overview

This was the original user data store that handled all authentication logic directly with AsyncStorage.

### Issues with this approach:
1. Directly calls `AsyncStorage` instead of using database abstraction
2. Uses unprefixed keys (`"users"`, `"token"`) causing potential conflicts
3. Mixes business logic with data access
4. No separation between API and database layers

---

## Original Code

```javascript
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
```

> **Note:** This file is truncated. See Part 2 for remaining methods.

