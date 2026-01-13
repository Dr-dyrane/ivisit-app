import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import * as Haptics from "expo-haptics";

export default function ProviderSelection({
	providers,
	specialty,
	onSelect
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
	};

	const handlePress = (item) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onSelect(item);
	};

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={[styles.title, { color: colors.text }]}>Select a Provider</Text>
				<Text style={[styles.subtitle, { color: colors.textMuted }]}>
					Found {providers.length} locations for {specialty}
				</Text>
			</View>
			
			<FlatList
				data={providers}
				keyExtractor={item => item.id}
				renderItem={({ item }) => (
					<Pressable 
						onPress={() => handlePress(item)} 
						style={({ pressed }) => [
							styles.listItem, 
							{ 
								backgroundColor: colors.cardBg,
								transform: [{ scale: pressed ? 0.98 : 1 }]
							}
						]}
					>
						<View style={styles.providerRow}>
							{item.image ? (
								<Image source={{ uri: item.image }} style={styles.providerImage} />
							) : (
								<View style={[styles.providerImage, { backgroundColor: COLORS.brandPrimary + '20' }]}>
									<Ionicons name="business" size={24} color={COLORS.brandPrimary} />
								</View>
							)}
							<View style={{ flex: 1 }}>
								<Text style={[styles.listTitle, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
								<Text style={[styles.listSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.address}</Text>
								<View style={styles.ratingRow}>
									<Ionicons name="star" size={14} color="#F59E0B" />
									<Text style={[styles.ratingText, { color: colors.text }]}>
										{item.rating || 4.8}
									</Text>
									<Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: "500" }}>• 120+ reviews</Text>
								</View>
							</View>
							<Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
						</View>
					</Pressable>
				)}
				contentContainerStyle={{ paddingBottom: 100, gap: 12 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		paddingHorizontal: 20,
	},
	header: {
		paddingVertical: 24,
	},
	title: {
		fontSize: 28,
		fontWeight: "900",
		marginBottom: 8,
		letterSpacing: -1,
	},
	subtitle: {
		fontSize: 16,
		fontWeight: "500",
		lineHeight: 22,
	},
	listItem: {
		padding: 20,
		borderRadius: 32,
		minHeight: 100,
		justifyContent: "center",
	},
	providerRow: {
		flexDirection: "row",
		gap: 16,
		alignItems: "center",
	},
	providerImage: {
		width: 64,
		height: 64,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
	},
	listTitle: {
		fontSize: 18,
		fontWeight: "800",
		letterSpacing: -0.5,
	},
	listSubtitle: {
		fontSize: 13,
		marginTop: 2,
		fontWeight: "500",
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 6,
	},
	ratingText: {
		fontSize: 13,
		fontWeight: "700",
	},
});
