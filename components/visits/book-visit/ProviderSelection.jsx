import React from "react";
import { View, Text, StyleSheet, FlatList, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";

export default function ProviderSelection({
	providers,
	specialty,
	onSelect
}) {
	const { isDarkMode } = useTheme();

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		cardBg: isDarkMode ? "#0B0F1A" : "#FFFFFF",
	};

	const cardStyle = {
		backgroundColor: colors.cardBg,
		borderRadius: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: isDarkMode ? 0 : 0.05,
		shadowRadius: 8,
		elevation: 2,
	};

	return (
		<View style={styles.container}>
			<Text style={[styles.title, { color: colors.text }]}>Select a Provider</Text>
			<Text style={[styles.subtitle, { color: colors.textMuted }]}>
				Found {providers.length} locations for {specialty}
			</Text>
			
			<FlatList
				data={providers}
				keyExtractor={item => item.id}
				renderItem={({ item }) => (
					<Pressable onPress={() => onSelect(item)} style={{ marginBottom: 12 }}>
						<View style={[styles.listItem, cardStyle]}>
							<View style={styles.providerRow}>
								{item.image ? (
									<Image source={{ uri: item.image }} style={styles.providerImage} />
								) : (
									<View style={[styles.providerImage, { backgroundColor: COLORS.brandPrimary }]} />
								)}
								<View style={{ flex: 1 }}>
									<Text style={[styles.listTitle, { color: colors.text }]}>{item.name}</Text>
									<Text style={[styles.listSubtitle, { color: colors.textMuted }]}>{item.address}</Text>
									<View style={styles.ratingRow}>
										<Ionicons name="star" size={14} color="#F59E0B" />
										<Text style={[styles.ratingText, { color: colors.text }]}>
											{item.rating || 4.8} (120+ reviews)
										</Text>
									</View>
								</View>
							</View>
						</View>
					</Pressable>
				)}
				contentContainerStyle={{ paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 20,
	},
	title: {
		fontSize: 24,
		fontWeight: "900",
		marginBottom: 8,
		letterSpacing: -0.5,
	},
	subtitle: {
		fontSize: 16,
		marginBottom: 24,
		lineHeight: 22,
	},
	listItem: {
		padding: 16,
		minHeight: 60,
		justifyContent: "center",
	},
	providerRow: {
		flexDirection: "row",
		gap: 12,
		alignItems: "center",
	},
	providerImage: {
		width: 50,
		height: 50,
		borderRadius: 25,
	},
	listTitle: {
		fontSize: 16,
		fontWeight: "700",
	},
	listSubtitle: {
		fontSize: 13,
		marginTop: 4,
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 4,
		marginTop: 6,
	},
	ratingText: {
		fontSize: 12,
		fontWeight: "500",
	},
});
