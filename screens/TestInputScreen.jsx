"use client";

import { useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	TextInput,
} from "react-native";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import ProfileField from "../components/form/ProfileField";

export default function TestInputScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();

	const backButton = () => <HeaderBackButton />;

	useFocusEffect(() => {
		setHeaderState({
			title: "Test Input",
			subtitle: "DEBUG",
			icon: null,
			backgroundColor: COLORS.brandPrimary,
			leftComponent: backButton(),
			rightComponent: null,
		});
	});

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
	};

	// Test state management
	const [testValue, setTestValue] = useState("");
	const [profileFieldValue, setProfileFieldValue] = useState("");

	const handleProfileFieldChange = (value) => {
		console.log("ProfileField changed:", value);
		setProfileFieldValue(value);
	};

	const handleNativeInputChange = (value) => {
		console.log("Native input changed:", value);
		setTestValue(value);
	};

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingTop: STACK_TOP_PADDING,
					paddingBottom: 40,
					paddingHorizontal: 12,
				}}
				showsVerticalScrollIndicator={false}
			>
				{/* Test Section 1: Native TextInput */}
				<View style={[styles.section, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Native TextInput Test
					</Text>
					<Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
						Basic React Native input to test if typing works
					</Text>
					
					<View style={styles.inputContainer}>
						<Text style={[styles.label, { color: colors.textMuted }]}>
							Test Input
						</Text>
						<TextInput
							value={testValue}
							onChangeText={handleNativeInputChange}
							style={[
								styles.nativeInput,
								{
									color: colors.text,
									backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
									borderColor: colors.textMuted,
								}
							]}
							placeholder="Type something here..."
							placeholderTextColor={colors.textMuted}
						/>
						<Text style={[styles.valueDisplay, { color: colors.textMuted }]}>
							Current value: "{testValue}"
						</Text>
					</View>
				</View>

				{/* Test Section 2: ProfileField Component */}
				<View style={[styles.section, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						ProfileField Component Test
					</Text>
					<Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
						Custom ProfileField component to test if it works
					</Text>
					
					<ProfileField
						label="Profile Field Test"
						value={profileFieldValue}
						onChange={handleProfileFieldChange}
						iconName="test-tube"
					/>
					<Text style={[styles.valueDisplay, { color: colors.textMuted }]}>
						Current value: "{profileFieldValue}"
					</Text>
				</View>

				{/* Test Section 3: Multiple ProfileFields */}
				<View style={[styles.section, { backgroundColor: colors.card }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>
						Multiple ProfileFields Test
					</Text>
					<Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
						Test multiple fields to see if there's a pattern
					</Text>
					
					<ProfileField
						label="Field 1"
						value=""
						onChange={(v) => console.log("Field 1:", v)}
						iconName="water-outline"
					/>
					<ProfileField
						label="Field 2"
						value=""
						onChange={(v) => console.log("Field 2:", v)}
						iconName="warning-outline"
					/>
					<ProfileField
						label="Field 3"
						value=""
						onChange={(v) => console.log("Field 3:", v)}
						iconName="medical-outline"
					/>
				</View>
			</ScrollView>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	section: {
		borderRadius: 36,
		padding: 24,
		marginBottom: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	sectionTitle: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -1.0,
		marginBottom: 8,
	},
	sectionSubtitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
		marginBottom: 20,
	},
	inputContainer: {
		marginBottom: 16,
	},
	label: {
		fontSize: 10,
		fontWeight: "800",
		letterSpacing: 1.5,
		textTransform: "uppercase",
		marginBottom: 8,
	},
	nativeInput: {
		fontSize: 16,
		fontWeight: "900",
		letterSpacing: -0.5,
		padding: 16,
		borderRadius: 24,
		borderWidth: 1,
		marginBottom: 12,
	},
	valueDisplay: {
		fontSize: 12,
		fontWeight: "500",
		fontStyle: "italic",
	},
});
