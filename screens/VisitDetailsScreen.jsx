"use client";

import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback } from "react";
import { styles } from "../components/visits/VisitDetailsScreen.styles";
import { useVisitDetailsLogic } from "../hooks/visits/useVisitDetailsLogic";

export default function VisitDetailsScreen() {
	const { state, actions } = useVisitDetailsLogic();
	const {
		visit,
		isDarkMode,
		textColor,
		mutedColor,
		widgetBg,
		statusColor,
		COLORS,
	} = state;
	const {
		handleScroll,
		resetTabBar,
		resetHeader,
		setHeaderState,
		backButton,
		handleCallClinic,
		handleJoinVideo,
		handleCancelVisit,
	} = actions;

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Identity Card",
				subtitle: visit?.status ? String(visit.status).toUpperCase() : "VISIT",
				icon: <Ionicons name="medical" size={24} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [resetTabBar, resetHeader, setHeaderState, visit?.status, backButton, COLORS])
	);

	return (
		<LinearGradient
			colors={isDarkMode ? [COLORS.bgDark, COLORS.bgDarkAlt] : [COLORS.bgLight, COLORS.bgLightAlt]}
			style={{ flex: 1 }}
		>
			<ScrollView
				contentContainerStyle={styles.content}
				showsVerticalScrollIndicator={false}
				onScroll={handleScroll}
				scrollEventThrottle={16}
			>
				{visit ? (
					<>
						{/* HERO SECTION: High-Visual Identity */}
						<View style={styles.heroSection}>
							<Image
								source={{ uri: visit?.image }}
								style={styles.heroImage}
								resizeMode="cover"
							/>
							<View style={[styles.floatingBadge, { backgroundColor: statusColor }]}>
								<Text style={styles.statusText}>{visit?.status?.toUpperCase()}</Text>
							</View>
						</View>

						{/* PRIMARY TITLE SECTION */}
						<View style={styles.titleSection}>
							<Text style={[styles.hospitalName, { color: textColor }]}>
								{visit?.hospital}
							</Text>
							<View style={styles.typeTag}>
								<Text style={[styles.typeText, { color: COLORS.brandPrimary }]}>
									{visit?.type} • {visit?.specialty}
								</Text>
							</View>
						</View>

						{/* DOCTOR IDENTITY WIDGET: Nested Squircle */}
						<View style={[styles.identityWidget, { backgroundColor: widgetBg }]}>
							<View style={[styles.squircleAvatar, { backgroundColor: COLORS.brandPrimary + '15' }]}>
								<Text style={[styles.initials, { color: COLORS.brandPrimary }]}>
									{visit?.doctor?.split(" ").map(n => n[0]).join("")}
								</Text>
							</View>
							<View style={styles.doctorInfo}>
								<Text style={[styles.label, { color: mutedColor }]}>ATTENDING DOCTOR</Text>
								<Text style={[styles.value, { color: textColor }]}>{visit?.doctor}</Text>
							</View>
							<View style={[styles.roomPill, { backgroundColor: isDarkMode ? COLORS.bgDark : "#FFF" }]}>
								<Text style={[styles.roomText, { color: textColor }]}>Room {visit?.roomNumber || "TBA"}</Text>
							</View>
						</View>

						{/* DATA GRID: Clean Editorial Layout */}
						<View style={styles.gridContainer}>
							<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
								<Ionicons name="calendar" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.gridLabel, { color: mutedColor }]}>DATE</Text>
								<Text style={[styles.gridValue, { color: textColor }]}>{visit?.date}</Text>
							</View>
							<View style={[styles.dataSquare, { backgroundColor: widgetBg }]}>
								<Ionicons name="time" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.gridLabel, { color: mutedColor }]}>TIME</Text>
								<Text style={[styles.gridValue, { color: textColor }]}>{visit?.time}</Text>
							</View>
						</View>

						{/* ACTIONS: Premium Ghost Pills */}
						<View style={styles.actionsContainer}>
							<Pressable
								onPress={handleCallClinic}
								style={({ pressed }) => [styles.actionBtn, { backgroundColor: widgetBg, opacity: pressed ? 0.7 : 1 }]}
							>
								<Ionicons name="call" size={20} color={COLORS.brandPrimary} />
								<Text style={[styles.actionBtnText, { color: textColor }]}>Call Clinic</Text>
							</Pressable>

							{visit?.meetingLink && (
								<Pressable
									onPress={handleJoinVideo}
									style={({ pressed }) => [
										styles.actionBtn, 
										{ 
											backgroundColor: COLORS.brandPrimary, 
											opacity: pressed ? 0.9 : 1,
											...styles.actionBtnShadow
										}
									]}
								>
									<Ionicons name="videocam" size={20} color="#FFF" />
									<Text style={[styles.actionBtnText, { color: "#FFF" }]}>Join Video</Text>
								</Pressable>
							)}
						</View>

						{/* PREPARATION SECTION */}
						{visit?.preparation && (
							<View style={[styles.prepSection, { backgroundColor: widgetBg }]}>
								<Text style={[styles.widgetTitle, { color: textColor }]}>PREPARATION</Text>
								{visit.preparation.map((item, i) => (
									<View key={i} style={styles.bulletRow}>
										<View style={[styles.bullet, { backgroundColor: COLORS.brandPrimary }]} />
										<Text style={[styles.bulletText, { color: textColor }]}>{item}</Text>
									</View>
								))}
							</View>
						)}

						{/* CANCEL ACTION */}
						{visit?.status === "upcoming" && (
							<Pressable 
								onPress={handleCancelVisit} 
								style={({ pressed }) => [
									styles.cancelButton,
									{ 
										backgroundColor: isDarkMode ? "rgba(239, 68, 68, 0.1)" : "#FEF2F2",
										opacity: pressed ? 0.7 : 1 
									}
								]}
							>
								<Ionicons name="trash-outline" size={20} color={COLORS.error} />
								<Text style={styles.cancelButtonText}>Cancel Appointment</Text>
							</Pressable>
						)}
					</>
				) : null}
			</ScrollView>
		</LinearGradient>
	);
}
