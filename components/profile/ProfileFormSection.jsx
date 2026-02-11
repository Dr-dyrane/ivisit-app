import { Animated, Text } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import ProfileField from "../form/ProfileField";

export default function ProfileFormSection({
	formState,
	handlers,
	fadeAnim,
	slideAnim,
}) {
	const { isDarkMode } = useTheme();
	const colors = {
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};

	const {
		fullName,
		username,
		gender,
		email,
		phone,
		address,
		dateOfBirth,
	} = formState;

	const {
		setFullName,
		setUsername,
		setGender,
		setEmail,
		setPhone,
		setAddress,
		setDateOfBirth,
	} = handlers;

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }],
				paddingHorizontal: 12,
			}}
		>
			<Text
				style={{
					fontSize: 10,
					fontWeight: "800",
					color: colors.textMuted,
					marginBottom: 16,
					letterSpacing: 1.5,
					textTransform: "uppercase",
				}}
			>
				PERSONAL INFORMATION
			</Text>

			<ProfileField
				label="Full Name"
				value={fullName}
				onChange={setFullName}
				iconName="person-outline"
			/>
			<ProfileField
				label="Username"
				value={username}
				onChange={setUsername}
				iconName="at-outline"
			/>
			<ProfileField
				label="Gender"
				value={gender}
				onChange={setGender}
				iconName="transgender-outline"
			/>
			<ProfileField
				label="Email Address"
				value={email}
				onChange={setEmail}
				iconName="mail-outline"
				keyboardType="email-address"
			/>
			<ProfileField
				label="Phone Number"
				value={phone}
				onChange={setPhone}
				iconName="call-outline"
				keyboardType="phone-pad"
			/>
			<ProfileField
				label="Address"
				value={address}
				onChange={setAddress}
				iconName="location-outline"
			/>
			<ProfileField
				label="Date of Birth"
				value={dateOfBirth}
				onChange={setDateOfBirth}
				iconName="calendar-outline"
			/>
		</Animated.View>
	);
}
