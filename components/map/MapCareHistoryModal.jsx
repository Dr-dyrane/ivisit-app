import React, { useMemo } from "react";
import {
	Dimensions,
	Modal,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useTheme } from "../../contexts/ThemeContext";
import { useVisits } from "../../contexts/VisitsContext";
import { navigateToVisits } from "../../utils/navigationHelpers";

const SCREEN_HEIGHT = Dimensions.get("window").height;

function formatVisitSupport(visit) {
	const hospital = visit?.hospital || visit?.hospitalName || "iVisit care";
	const date = typeof visit?.date === "string" ? visit.date : "";
	const time = typeof visit?.time === "string" ? visit.time : "";
	return [hospital, date, time].filter(Boolean).join(" | ");
}

function CareBlade({
	colors,
	iconName,
	title,
	subtext,
	onPress,
	titleColor,
	mutedColor,
}) {
	return (
		<Pressable onPress={onPress} style={styles.careBlade}>
			<LinearGradient
				colors={colors}
				start={{ x: 0.18, y: 0.18 }}
				end={{ x: 0.82, y: 0.9 }}
				style={styles.bladeIconWrap}
			>
				<MaterialCommunityIcons name={iconName} size={24} color="#FFFFFF" />
			</LinearGradient>
			<View style={styles.bladeCopy}>
				<Text style={[styles.bladeTitle, { color: titleColor }]}>{title}</Text>
				{subtext ? (
					<Text style={[styles.bladeSubtext, { color: mutedColor }]}>{subtext}</Text>
				) : null}
			</View>
			<Ionicons name="chevron-forward" size={18} color={mutedColor} />
		</Pressable>
	);
}

export default function MapCareHistoryModal({
	visible,
	onClose,
	onChooseCare,
}) {
	const router = useRouter();
	const { isDarkMode } = useTheme();
	const { visits = [] } = useVisits();
	const recentVisits = useMemo(() => (Array.isArray(visits) ? visits.slice(0, 3) : []), [visits]);
	const hasVisits = recentVisits.length > 0;

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const mutedColor = isDarkMode ? "#94A3B8" : "#64748B";
	const surfaceColor = isDarkMode ? "rgba(8, 15, 27, 0.84)" : "rgba(255, 255, 255, 0.86)";
	const bladeSurface = isDarkMode ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<View style={styles.root}>
				<Pressable style={styles.backdrop} onPress={onClose} />
				<View style={styles.sheetHost}>
					<BlurView
						intensity={isDarkMode ? 44 : 56}
						tint={isDarkMode ? "dark" : "light"}
						style={styles.sheetBlur}
					>
						<View style={[styles.sheetSurface, { backgroundColor: surfaceColor }]}>
							<View style={styles.headerRow}>
								<Text style={[styles.title, styles.simpleTitle, { color: titleColor }]}>Choose care</Text>
								<Pressable onPress={onClose} style={styles.closeButton}>
									<Ionicons name="close" size={20} color={titleColor} />
								</Pressable>
							</View>

							<ScrollView
								showsVerticalScrollIndicator={false}
								contentContainerStyle={styles.scrollContent}
							>
								<View style={styles.bladeStack}>
									<View style={[styles.bladeSurface, { backgroundColor: bladeSurface }]}>
										<CareBlade
											colors={["#F97316", "#DC2626"]}
											iconName="ambulance"
											title="Ambulance"
											subtext="Fast transport nearby"
											onPress={() => onChooseCare?.("ambulance")}
											titleColor={titleColor}
											mutedColor={mutedColor}
										/>
									</View>
									<View style={[styles.bladeSurface, { backgroundColor: bladeSurface }]}>
										<CareBlade
											colors={["#38BDF8", "#2563EB"]}
											iconName="bed"
											title="Bed space"
											subtext="Available beds nearby"
											onPress={() => onChooseCare?.("bed")}
											titleColor={titleColor}
											mutedColor={mutedColor}
										/>
									</View>
									<View style={[styles.bladeSurface, { backgroundColor: bladeSurface }]}>
										<CareBlade
											colors={["#14B8A6", "#0F766E"]}
											iconName="hospital-box"
											title="Ambulance + bed"
											subtext="Transport and admission"
											onPress={() => onChooseCare?.("both")}
											titleColor={titleColor}
											mutedColor={mutedColor}
										/>
									</View>
								</View>

								{hasVisits ? (
									<View style={styles.recentSection}>
										<View style={styles.recentHeader}>
											<Text style={[styles.recentTitle, { color: titleColor }]}>Recent visits</Text>
											<Pressable
												onPress={() => {
													onClose();
													navigateToVisits({ router });
												}}
											>
												<Text style={[styles.recentAction, { color: mutedColor }]}>See more</Text>
											</Pressable>
										</View>

										{recentVisits.map((visit, index) => (
											<View
												key={visit?.id || `${visit?.hospital || "visit"}-${index}`}
												style={[
													styles.visitCard,
													{
														backgroundColor: isDarkMode
															? "rgba(255,255,255,0.06)"
															: "rgba(15,23,42,0.04)",
													},
												]}
											>
												<View style={styles.visitIconWrap}>
													<Ionicons name="time-outline" size={18} color="#86100E" />
												</View>
												<View style={styles.visitCopy}>
													<Text numberOfLines={1} style={[styles.visitTitle, { color: titleColor }]}>
														{visit?.type || "Care visit"}
													</Text>
													<Text numberOfLines={2} style={[styles.visitMeta, { color: bodyColor }]}>
														{formatVisitSupport(visit)}
													</Text>
												</View>
											</View>
										))}
									</View>
								) : null}
							</ScrollView>
						</View>
					</BlurView>
				</View>
			</View>
		</Modal>
	);
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		justifyContent: "flex-end",
	},
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: "rgba(0, 0, 0, 0.44)",
	},
	sheetHost: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		overflow: "hidden",
	},
	sheetBlur: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
	},
	sheetSurface: {
		borderTopLeftRadius: 38,
		borderTopRightRadius: 38,
		minHeight: SCREEN_HEIGHT * 0.78,
		paddingTop: 14,
		paddingHorizontal: 18,
		paddingBottom: 18,
	},
	headerRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	closeButton: {
		width: 40,
		height: 40,
		borderRadius: 20,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148, 163, 184, 0.12)",
	},
	title: {
		marginTop: 8,
		fontSize: 30,
		lineHeight: 34,
		fontWeight: "900",
		letterSpacing: -0.9,
	},
	simpleTitle: {
		marginTop: 0,
		fontSize: 21,
		lineHeight: 24,
	},
	scrollContent: {
		paddingTop: 14,
		paddingBottom: 12,
		gap: 18,
		flexGrow: 1,
	},
	bladeStack: {
		gap: 12,
	},
	bladeSurface: {
		borderRadius: 28,
	},
	careBlade: {
		borderRadius: 28,
		paddingHorizontal: 14,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
	},
	bladeIconWrap: {
		width: 46,
		height: 46,
		borderRadius: 23,
		alignItems: "center",
		justifyContent: "center",
	},
	bladeCopy: {
		flex: 1,
	},
	bladeTitle: {
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "800",
	},
	bladeSubtext: {
		marginTop: 3,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	recentSection: {
		marginTop: 8,
	},
	recentHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 12,
	},
	recentTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	recentAction: {
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "700",
	},
	visitCard: {
		borderRadius: 26,
		padding: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 10,
	},
	visitIconWrap: {
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "rgba(134, 16, 14, 0.10)",
		alignItems: "center",
		justifyContent: "center",
	},
	visitCopy: {
		flex: 1,
	},
	visitTitle: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	visitMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "400",
	},
});
