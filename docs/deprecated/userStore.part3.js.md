# userStore.js (Deprecated) - Part 3

> Continuation of `userStore.part2.js.md`

---

## Original Code (Continued)

```javascript
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
```

---

## Key Methods Summary

| Method | Purpose | Error Codes |
|--------|---------|-------------|
| `checkUserExists` | Check if user exists by email/phone | `USER_NOT_FOUND` |
| `setPassword` | Set password for existing user | `USER_NOT_FOUND`, `INVALID_DATA` |
| `login` | Login with OTP or password | `USER_NOT_FOUND`, `NO_PASSWORD`, `INVALID_PASSWORD` |
| `signUp` | Create new user account | `INVALID_INPUT`, `EMAIL_EXISTS`, `PHONE_EXISTS` |
| `getCurrentUser` | Get logged in user by token | - |
| `updateUser` | Update user profile data | - |
| `forgotPassword` | Initiate password reset | - |
| `resetPassword` | Complete password reset | - |

---

## Error Format

All errors use the format: `CODE|Human readable message`

Example:
```javascript
throw new Error("USER_NOT_FOUND|No account found. Please sign up first.");
```

This allows parsing:
```javascript
const [code, message] = error.message.split("|");
```

---

## Storage Keys Used

| Key | Purpose |
|-----|---------|
| `"users"` | Array of all user objects |
| `"token"` | Current logged-in user's token |

**Note:** These keys have no prefix, which is a problem when migrating to the new database abstraction.

---

## Token Generation

```javascript
const generateRandomToken = () => {
	return (
		Math.random().toString(36).substring(2, 15) +
		Math.random().toString(36).substring(2, 15)
	);
};
```

This produces a ~26 character alphanumeric token.

---

## Static Test User

```javascript
staticUserData: {
	email: "test@example.com",
	username: "testUser",
	password: "password",
	token: "testToken",
}
```

This is automatically added if the users array is empty.

