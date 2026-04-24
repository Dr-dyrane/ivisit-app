import React from "react";
import { View, Animated } from "react-native";
import * as Haptics from "expo-haptics";
import MiniProfileShortcutGroup from "../../emergency/miniProfile/MiniProfileShortcutGroup";
import {
	getMiniProfileColors,
	getMiniProfileLayout,
	getMiniProfileTones,
} from "../../emergency/miniProfile/miniProfile.model";

// PULLBACK NOTE: ProfileActionList - Modular action list component
// Extracted from ProfileScreen to follow /map module pattern
// REASON: Separation of concerns, easier debugging and maintenance

export default function ProfileActionList({
	emergencyContacts,
	user,
	isDarkMode,
	router,
	navigateToEmergencyContacts,
	navigateToMedicalProfile,
	navigateToInsurance,
	onPersonalInfoPress,
	onDeleteAccountPress,
	onSignOutPress,
	fadeAnim,
	slideAnim,
}) {
	const miniProfileColors = getMiniProfileColors(isDarkMode);
	const miniProfileTones = getMiniProfileTones(isDarkMode);

	const layout = getMiniProfileLayout(
		{
			content: { paddingHorizontal: 12 },
		},
		{ preferDrawerPresentation: false }
	);

	const actionGroups = [
		[
			{
				key: "personal-info",
				label: "Personal Information",
				icon: "person",
				tone: miniProfileTones.profile,
				badge: null,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onPersonalInfoPress();
				},
			},
		],
		[
			{
				key: "emergency-contacts",
				label: "Emergency Contacts",
				icon: "people",
				tone: miniProfileTones.contacts,
				badge: Array.isArray(emergencyContacts) ? emergencyContacts.length : 0,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					navigateToEmergencyContacts({ router });
				},
			},
			{
				key: "health-info",
				label: "Health Information",
				icon: "medical",
				tone: miniProfileTones.care,
				badge: null,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					navigateToMedicalProfile({ router });
				},
			},
		],
		[
			{
				key: "coverage",
				label: "Coverage",
				icon: "shield-checkmark",
				tone: miniProfileTones.payment,
				badge: user?.hasInsurance ? 1 : 0,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					navigateToInsurance({ router });
				},
			},
		],
		[
			{
				key: "sign-out",
				label: "Sign Out",
				icon: "exit",
				tone: miniProfileTones.destructive,
				badge: null,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onSignOutPress();
				},
			},
			{
				key: "delete-account",
				label: "Delete Account",
				icon: "trash",
				tone: miniProfileTones.destructive,
				badge: null,
				onPress: () => {
					Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					onDeleteAccountPress();
				},
			},
		],
	];

	return (
		<Animated.View
			style={{
				opacity: fadeAnim,
				transform: [{ translateY: slideAnim }],
				paddingHorizontal: 12,
			}}
		>
			<View style={{ gap: 16 }}>
				{actionGroups.map((rows, groupIndex) => (
					<MiniProfileShortcutGroup
						key={`group-${groupIndex}`}
						rows={rows}
						colors={miniProfileColors}
						layout={layout}
					/>
				))}
			</View>
		</Animated.View>
	);
}
