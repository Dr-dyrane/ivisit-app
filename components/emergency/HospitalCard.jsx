import React from "react";
import { View, Text, Pressable, Image } from "react-native";
import { Ionicons, Fontisto } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { useHospitalCardLogic } from "../../hooks/emergency/useHospitalCardLogic";
import { styles } from "./HospitalCard.styles";

export default function HospitalCard({
	hospital,
	isSelected,
	onSelect,
	onCall,
	mode = "emergency",
	hideDistanceEta = false,
	hidePrimaryAction = false,
}) {
	if (!hospital) return null;

	const { data, state, actions } = useHospitalCardLogic({
		hospital,
		isSelected,
		onSelect,
		onCall,
		mode,
		hideDistanceEta,
		hidePrimaryAction
	});

	const {
		hospitalName,
		hospitalImageUri,
		hospitalRating,
		isGoogleHospital,
		isVerifiedHospital,
		hospitalDistance,
		hospitalWaitTime,
		hospitalBeds,
		hospitalPhone,
		hospitalSpecialties,
	} = data;

	const { colors } = state;

	return (
		<Pressable
			onPress={data.hospitalId && onSelect ? actions.handlePress : undefined}
			style={({ pressed }) => [
				styles.card,
				{
					backgroundColor: colors.activeBG,
					transform: [{ scale: pressed ? 0.98 : 1 }],
					shadowColor: colors.cardShadow,
					shadowOpacity: colors.cardShadowOpacity,
				},
			]}
		>
			{/* Image Section with Overlay Badges */}
			<View style={styles.imageContainer}>
				{hospitalImageUri ? (
					<Image source={{ uri: hospitalImageUri }} style={styles.image} resizeMode="cover" />
				) : (
					<View style={[styles.image, { backgroundColor: colors.imagePlaceholder }]} />
				)}

				{isGoogleHospital ? (
					<View style={styles.unverifiedBadge}>
						<Ionicons name="warning" size={12} color="#FFFFFF" />
						<Text style={styles.unverifiedText}>CALL 911</Text>
					</View>
				) : isVerifiedHospital && (
					<View style={styles.verifiedBadge}>
						<Ionicons name="shield-checkmark" size={12} color="#FFFFFF" />
						<Text style={styles.verifiedText}>VERIFIED</Text>
					</View>
				)}
			</View>

			{/* Info Section */}
			<View style={styles.content}>
				<View style={styles.titleRow}>
					<Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
						{hospitalName}
					</Text>
					<View style={styles.ratingBox}>
						<Ionicons name="star" size={14} color="#FFC107" />
						<Text style={[styles.ratingText, { color: colors.text }]}>{hospitalRating}</Text>
					</View>
				</View>

				{/* Restored Specialty Slice Logic */}
				<Text style={[styles.specialties, { color: colors.muted }]} numberOfLines={1}>
					{hospitalSpecialties.length > 0 ? hospitalSpecialties.slice(0, 3).join(" • ") : "General Care"}
				</Text>

				{/* Stats Pills */}
				{!hideDistanceEta && (
					<View style={styles.pillRow}>
						<View style={[styles.statPill, { backgroundColor: colors.pillBg }]}>
							<Ionicons name="location" size={12} color={COLORS.brandPrimary} />
							<Text style={[styles.statText, { color: colors.text }]}>{hospitalDistance}</Text>
						</View>
						<View style={[styles.statPill, { backgroundColor: colors.pillBg }]}>
							<Ionicons name="time" size={12} color={COLORS.brandPrimary} />
							<Text style={[styles.statText, { color: colors.text }]}>
								{mode === "booking" ? `${hospitalBeds} Beds` : `Wait: ${hospitalWaitTime}`}
							</Text>
						</View>
					</View>
				)}
			</View>

			{/* Selection/Action Logic */}
			{isSelected && !hidePrimaryAction ? (
				<View style={styles.actionRow}>
					{/* Call Button - Theme-sensitive circular button */}
					{hospitalPhone && (
						<Pressable
							onPress={actions.handlePhoneCall}
							style={({ pressed }) => [
								styles.callButton,
								{
									backgroundColor: colors.callButtonBg,
									opacity: pressed ? 0.8 : 1,
									transform: [{ scale: pressed ? 0.95 : 1 }]
								}
							]}
						>
							<Ionicons
								name="call"
								size={20}
								color={colors.callIcon}
							/>
						</Pressable>
					)}

					{/* Main Request CTA - Manifesto: Card-in-Card (24px) */}
					<Pressable onPress={actions.handleCallPress} style={[styles.primaryAction, !hospitalPhone && styles.primaryActionFull]}>
						<View style={styles.actionLeft}>
							<Fontisto
								name={
									mode === "booking"
										? (hospitalBeds > 0 ? "bed-patient" : "phone")
										: (isGoogleHospital)
											? "phone"
											: "ambulance"
								}
								size={18}
								color="#FFFFFF"
							/>
							<Text style={styles.actionText}>
								{mode === "booking"
									? (hospitalBeds > 0 ? "Secure a Bed" : (hospitalPhone ? "Call Hospital" : "Call 911"))
									: (isGoogleHospital)
										? (hospitalPhone ? "Call Hospital" : "Call 911")
										: "Request Now"
								}
							</Text>
						</View>
						<Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
					</Pressable>
				</View>
			) : (
				isSelected && (
					<View style={styles.checkmarkWrapper}>
						<Ionicons name="checkmark-circle" size={32} color={COLORS.brandPrimary} />
					</View>
				)
			)}
		</Pressable>
	);
}
