//components/auth/SocialAuthRow.jsx

import { View } from "react-native";
import SocialAuthButton from "./SocialAuthButton";

/**
 * SocialAuthRow
 *
 * Layout-only component.
 * Owns provider ordering and spacing.
 * Zero business logic.
 */

export default function SocialAuthRow() {
	return (
		<View className="flex-row justify-between">
			<SocialAuthButton provider="apple" />
			<SocialAuthButton provider="google" />
			<SocialAuthButton provider="x" />
		</View>
	);
}
