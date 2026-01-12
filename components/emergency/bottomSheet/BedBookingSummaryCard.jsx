import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from "react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Fontisto } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { COLORS } from "../../../constants/colors";
import { useBedBookingProgress } from "../../../hooks/emergency/useBedBookingProgress";
import HospitalCard from "../HospitalCard";
import { navigateToRequestAmbulance } from "../../../utils/navigationHelpers";

const BedBookingSummaryCollapsed = ({
	isDarkMode,
	statusLabel,
	etaText,
	hospitalName,
	bedNumber,
	bedType,
	specialty,
	bedCount,
	callTarget,
	onCancelBedBooking,
	showMarkOccupied,
	onMarkBedOccupied,
	showComplete,
	onCompleteBedBooking,
}) => {
	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: isDarkMode ? "#1A2333" : "#FFFFFF",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0.35 : 0.08,
					shadowRadius: 12,
					elevation: 5,
					paddingTop: 16,
					paddingBottom: 16,
				},
			]}
		>
			<View style={[styles.headerRow, { marginBottom: 10 }]}>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text
						style={[
							styles.statusTitle,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
						numberOfLines={1}
					>
						{statusLabel}
					</Text>
					<Text
						style={[
							styles.statusSub,
							{
								color: isDarkMode
									? "rgba(255,255,255,0.6)"
									: "rgba(15,23,42,0.6)",
							},
						]}
						numberOfLines={1}
					>
						{hospitalName} • {bedNumber}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>{etaText}</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>min</Text>
				</View>
			</View>

			<Text
				style={{
					fontSize: 12,
					fontWeight: "700",
					color: isDarkMode ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.7)",
				}}
				numberOfLines={1}
			>
				{bedType} • {specialty} • {bedCount} {bedCount === "1" ? "bed" : "beds"}
			</Text>

			<View style={[styles.actionsRow, { marginTop: 12 }]}>
				{callTarget && (
					<Pressable
						onPress={() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							Linking.openURL(callTarget);
						}}
						style={({ pressed }) => [
							styles.actionBtn,
							{
								backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
								opacity: pressed ? 0.7 : 1,
							},
						]}
					>
						<Ionicons
							name="call"
							size={20}
							color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
						/>
					</Pressable>
				)}

				<Pressable
					onPress={() => {
						Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
						onCancelBedBooking?.();
					}}
					style={({ pressed }) => [styles.cancelBtn, { opacity: pressed ? 0.7 : 1 }]}
				>
					<Text style={styles.cancelText}>Cancel</Text>
				</Pressable>

				{showMarkOccupied && (
					<Pressable
						onPress={onMarkBedOccupied}
						style={({ pressed }) => [styles.completeBtn, { opacity: pressed ? 0.7 : 1 }]}
					>
						<Text style={styles.completeText}>Occupied</Text>
					</Pressable>
				)}

				{showComplete && (
					<Pressable
						onPress={onCompleteBedBooking}
						style={({ pressed }) => [styles.completeBtn, { opacity: pressed ? 0.7 : 1 }]}
					>
						<Text style={styles.completeText}>Complete</Text>
					</Pressable>
				)}
			</View>
		</View>
	);
};

const BedBookingSummaryHalf = ({
	isDarkMode,
	statusLabel,
	etaText,
	hospitalName,
	bedType,
	bedCount,
	bedNumber,
	specialty,
	bedProgress,
	bookingHospital,
	callTarget,
	onCancelBedBooking,
	isBusy,
	busyAction,
	onPressCall,
	onPressCancel,
	showMarkOccupied,
	onMarkBedOccupied,
	onPressOccupied,
	showComplete,
	onCompleteBedBooking,
	onPressComplete,
	showSecondaryCta,
	secondaryCtaLabel,
	onPressSecondaryCta,
}) => {
	return (
		<View
			style={[
				styles.container,
				{
					backgroundColor: isDarkMode ? "#1A2333" : "#FFFFFF",
					shadowColor: "#000",
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: isDarkMode ? 0.4 : 0.08,
					shadowRadius: 12,
					elevation: 5,
				},
			]}
		>
			{/* Header: Status & Time */}
			<View style={styles.headerRow}>
				<View>
					<Text
						style={[
							styles.statusTitle,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						{statusLabel}
					</Text>
					<Text
						style={[
							styles.statusSub,
							{
								color: isDarkMode
									? "rgba(255,255,255,0.6)"
									: "rgba(15,23,42,0.6)",
							},
						]}
					>
						{hospitalName}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>
						{etaText}
					</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>
						min
					</Text>
				</View>
			</View>

			{/* Progress Bar */}
			<View
				style={[
					styles.progressTrack,
					{ backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" },
				]}
			>
				<View
					style={[
						styles.progressBar,
						{
							width: `${Math.max(5, (bedProgress ?? 0) * 100)}%`,
							backgroundColor: COLORS.brandPrimary,
						},
					]}
				/>
			</View>

			{/* Bed Info Row */}
			<View style={styles.driverRow}>
				<View
					style={[
						styles.driverAvatar,
						{ backgroundColor: isDarkMode ? "#252D3B" : "#E2E8F0" },
					]}
				>
					<Fontisto
						name="bed-patient"
						size={20}
						color={isDarkMode ? "#94A3B8" : "#64748B"}
					/>
				</View>

				<View style={styles.driverInfo}>
					<Text
						style={[
							styles.driverName,
							{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
						]}
					>
						{bedType}
					</Text>
					<View style={styles.ratingRow}>
						<Text
							style={[
								styles.ratingText,
								{
									color: isDarkMode
										? "rgba(255,255,255,0.6)"
										: "rgba(15,23,42,0.6)",
								},
							]}
						>
							{specialty} • {bedCount} {bedCount === "1" ? "bed" : "beds"}
						</Text>
					</View>
				</View>

				<View style={styles.plateContainer}>
					<Text style={styles.plateText}>
						{bedNumber}
					</Text>
				</View>
			</View>

			{bookingHospital && (
				<View style={{ marginTop: 14 }}>
					<HospitalCard
						hospital={bookingHospital}
						isSelected={true}
						onSelect={undefined}
						onCall={undefined}
						mode="booking"
						hidePrimaryAction={true}
					/>
				</View>
			)}

			{/* Actions */}
			<View style={styles.actionsRow}>
				{callTarget && (
					<Pressable
						onPress={
							onPressCall ??
							(() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
								Linking.openURL(callTarget);
							})
						}
						disabled={!!isBusy}
						style={({ pressed }) => [
							styles.actionBtn,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.1)"
									: "#F1F5F9",
								opacity: isBusy ? 0.5 : pressed ? 0.7 : 1,
							},
						]}
					>
						<Ionicons
							name="call"
							size={20}
							color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
						/>
					</Pressable>
				)}

				<Pressable
					onPress={
						onPressCancel ??
						(() => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
							onCancelBedBooking?.();
						})
					}
					disabled={!!isBusy}
					style={({ pressed }) => [
						styles.cancelBtn,
						{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
					]}
				>
					{busyAction === "cancel" ? (
						<ActivityIndicator size="small" color="#DC2626" />
					) : (
						<Text style={styles.cancelText}>Cancel Reservation</Text>
					)}
				</Pressable>

				{showMarkOccupied && (
					<Pressable
						onPress={onPressOccupied ?? onMarkBedOccupied}
						disabled={!!isBusy}
						style={({ pressed }) => [
							styles.completeBtn,
							{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
						]}
					>
						{busyAction === "occupied" ? (
							<ActivityIndicator size="small" color="#10B981" />
						) : (
							<Text style={styles.completeText}>Mark Occupied</Text>
						)}
					</Pressable>
				)}

				{showComplete && (
					<Pressable
						onPress={onPressComplete ?? onCompleteBedBooking}
						disabled={!!isBusy}
						style={({ pressed }) => [
							styles.completeBtn,
							{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
						]}
					>
						{busyAction === "complete" ? (
							<ActivityIndicator size="small" color="#10B981" />
						) : (
							<Text style={styles.completeText}>Complete</Text>
						)}
					</Pressable>
				)}
			</View>

			{showSecondaryCta && typeof onPressSecondaryCta === "function" ? (
				<Pressable
					onPress={onPressSecondaryCta}
					disabled={!!isBusy}
					style={({ pressed }) => [
						styles.secondaryCta,
						{
							backgroundColor: isDarkMode
								? "rgba(255,255,255,0.08)"
								: "rgba(37, 99, 235, 0.08)",
							opacity: isBusy ? 0.6 : pressed ? 0.75 : 1,
						},
					]}
				>
					<Text style={[styles.secondaryCtaText, { color: COLORS.brandPrimary }]}>
						{secondaryCtaLabel ?? "Request Ambulance"}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
};

const BedBookingSummaryFull = ({
	isDarkMode,
	statusLabel,
	etaText,
	hospitalName,
	bedType,
	bedCount,
	bedNumber,
	specialty,
	bedProgress,
	callTarget,
	onCancelBedBooking,
	isBusy,
	busyAction,
	onPressCall,
	onPressCancel,
	showMarkOccupied,
	onMarkBedOccupied,
	onPressOccupied,
	showComplete,
	onCompleteBedBooking,
	onPressComplete,
	bookingHospital,
	showSecondaryCta,
	secondaryCtaLabel,
	onPressSecondaryCta,
}) => {
	return (
		<View style={[styles.fullContainer, { backgroundColor: isDarkMode ? "#121826" : "#FFFFFF" }]}>
			<View style={[styles.fullHeader, { backgroundColor: COLORS.brandPrimary }]}
			>
				<View style={{ flex: 1, paddingRight: 12 }}>
					<Text style={[styles.fullStatusTitle, { color: "#FFFFFF" }]} numberOfLines={1}>
						{statusLabel}
					</Text>
					<Text style={[styles.fullStatusSub, { color: "rgba(255,255,255,0.85)" }]} numberOfLines={1}>
						{hospitalName}
					</Text>
				</View>
				<View style={styles.etaContainer}>
					<Text style={[styles.etaTime, { color: COLORS.textLight }]}>{etaText}</Text>
					<Text style={[styles.etaLabel, { color: "rgba(255,255,255,0.8)" }]}>min</Text>
				</View>
			</View>

			<View style={styles.fullBody}>
				<View style={[styles.progressTrack, { backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9" }]}>
					<View
						style={[
							styles.progressBar,
							{
								width: `${Math.max(5, (bedProgress ?? 0) * 100)}%`,
								backgroundColor: COLORS.brandPrimary,
							},
						]}
					/>
				</View>

				{/* Bed Details Section */}
				<View style={styles.bedSection}>
					<View
						style={[
							styles.bedImageContainer,
							{
								backgroundColor: isDarkMode
									? COLORS.brandPrimary
									: "rgba(37, 99, 235, 0.10)",
							},
						]}
					>
						<Fontisto
							name="bed-patient"
							size={44}
							color={isDarkMode ? "#FFFFFF" : COLORS.brandPrimary}
						/>
					</View>
					<View style={styles.bedInfo}>
						<Text
							style={[
								styles.bedTitle,
								{ color: isDarkMode ? COLORS.textLight : COLORS.textPrimary },
							]}
						>
							{bedType}
						</Text>
						<Text
							style={[
								styles.bedSubtitle,
								{
									color: isDarkMode
										? "rgba(255,255,255,0.7)"
										: "rgba(15,23,42,0.7)",
								},
							]}
						>
							{specialty} • {bedCount} {bedCount === "1" ? "bed" : "beds"}
						</Text>
						<Text
							style={[styles.bedNumber, { color: COLORS.brandPrimary }]}
						>
							Bed {bedNumber}
						</Text>
					</View>
				</View>

				{bookingHospital && (
					<View style={{ marginBottom: 18 }}>
						<HospitalCard
							hospital={bookingHospital}
							isSelected={true}
							onSelect={undefined}
							onCall={undefined}
							mode="booking"
							hidePrimaryAction={true}
						/>
					</View>
				)}

				<View style={styles.actionsRow}>
					{callTarget && (
						<Pressable
							onPress={
								onPressCall ??
								(() => {
									Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
									Linking.openURL(callTarget);
								})
							}
							disabled={!!isBusy}
							style={({ pressed }) => [
								styles.actionBtn,
								{
									backgroundColor: isDarkMode ? "rgba(255,255,255,0.1)" : "#F1F5F9",
									opacity: isBusy ? 0.5 : pressed ? 0.7 : 1,
								},
							]}
						>
							<Ionicons name="call" size={20} color={isDarkMode ? COLORS.textLight : COLORS.textPrimary} />
						</Pressable>
					)}

					<Pressable
						onPress={
							onPressCancel ??
							(() => {
								Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
								onCancelBedBooking?.();
							})
						}
						disabled={!!isBusy}
						style={({ pressed }) => [
							styles.cancelBtn,
							{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
						]}
					>
						{busyAction === "cancel" ? (
							<ActivityIndicator size="small" color="#DC2626" />
						) : (
							<Text style={styles.cancelText}>Cancel</Text>
						)}
					</Pressable>

					{showMarkOccupied && (
						<Pressable
							onPress={onPressOccupied ?? onMarkBedOccupied}
							disabled={!!isBusy}
							style={({ pressed }) => [
								styles.completeBtn,
								{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
							]}
						>
							{busyAction === "occupied" ? (
								<ActivityIndicator size="small" color="#10B981" />
							) : (
								<Text style={styles.completeText}>Mark Occupied</Text>
							)}
						</Pressable>
					)}

					{showComplete && (
						<Pressable
							onPress={onPressComplete ?? onCompleteBedBooking}
							disabled={!!isBusy}
							style={({ pressed }) => [
								styles.completeBtn,
								{ opacity: isBusy ? 0.6 : pressed ? 0.7 : 1 },
							]}
						>
							{busyAction === "complete" ? (
								<ActivityIndicator size="small" color="#10B981" />
							) : (
								<Text style={styles.completeText}>Complete</Text>
							)}
						</Pressable>
					)}
				</View>

				{showSecondaryCta && typeof onPressSecondaryCta === "function" ? (
					<Pressable
						onPress={onPressSecondaryCta}
						disabled={!!isBusy}
						style={({ pressed }) => [
							styles.secondaryCta,
							{
								backgroundColor: isDarkMode
									? "rgba(255,255,255,0.08)"
									: "rgba(37, 99, 235, 0.08)",
								opacity: isBusy ? 0.6 : pressed ? 0.75 : 1,
							},
						]}
					>
						<Text style={[styles.secondaryCtaText, { color: COLORS.brandPrimary }]}>
							{secondaryCtaLabel ?? "Request Ambulance"}
						</Text>
					</Pressable>
				) : null}
			</View>
		</View>
	);
};

export const BedBookingSummaryCard = ({
	activeBedBooking,
	hasOtherActiveVisit,
	allHospitals = [],
	onCancelBedBooking,
	onMarkBedOccupied,
	onCompleteBedBooking,
	isDarkMode,
	isCollapsed,
	isExpanded,
	sheetPhase,
}) => {
	const router = useRouter();
	const collapsed = sheetPhase ? sheetPhase === "collapsed" : !!isCollapsed;
	const expanded = sheetPhase ? sheetPhase === "full" : !!isExpanded;
	const [nowMs, setNowMs] = useState(Date.now());
	const [busyAction, setBusyAction] = useState(null);
	const mountedRef = useRef(true);

	useEffect(() => {
		mountedRef.current = true;
		return () => {
			mountedRef.current = false;
		};
	}, []);

	useEffect(() => {
		if (!activeBedBooking?.requestId) return;
		if (collapsed) return;
		const id = setInterval(() => setNowMs(Date.now()), 1000);
		return () => clearInterval(id);
	}, [activeBedBooking?.requestId, collapsed]);

	const bookingHospital =
		activeBedBooking?.hospitalId && Array.isArray(allHospitals)
			? allHospitals.find((h) => h?.id === activeBedBooking.hospitalId) ?? null
			: null;

	const { bedProgress, bedStatus, formattedBedRemaining } = useBedBookingProgress({
		activeBedBooking,
		nowMs,
	});

	const normalizePhone = useCallback((value) => {
		if (!value || typeof value !== "string") return null;
		const trimmed = value.trim();
		if (!trimmed) return null;
		if (trimmed.startsWith("+")) {
			const plusDigits = `+${trimmed.slice(1).replace(/[^\d]/g, "")}`;
			return plusDigits.length > 1 ? plusDigits : null;
		}
		const digits = trimmed.replace(/[^\d]/g, "");
		return digits ? digits : null;
	}, []);

	const callTarget = useMemo(() => {
		const phoneRaw = bookingHospital?.phone ?? null;
		const normalized = normalizePhone(phoneRaw);
		return normalized ? `tel:${normalized}` : null;
	}, [normalizePhone, bookingHospital?.phone]);

	const runAction = useCallback(
		(actionKey, fn) => {
			if (busyAction) return;
			if (typeof fn !== "function") return;
			setBusyAction(actionKey);
			Promise.resolve(fn())
				.catch(() => {})
				.finally(() => {
					if (mountedRef.current) setBusyAction(null);
				});
		},
		[busyAction]
	);

	const handlePressCall = useCallback(() => {
		if (busyAction) return;
		if (!callTarget) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		Linking.openURL(callTarget);
	}, [busyAction, callTarget]);

	const handlePressRequestAmbulance = useCallback(() => {
		if (busyAction) return;
		const hospitalId = activeBedBooking?.hospitalId ?? bookingHospital?.id ?? null;
		if (!hospitalId) return;
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		navigateToRequestAmbulance({ router, hospitalId });
	}, [activeBedBooking?.hospitalId, bookingHospital?.id, busyAction, router]);

	const etaText =
		formattedBedRemaining ??
		activeBedBooking?.estimatedWait ??
		(Number.isFinite(activeBedBooking?.etaSeconds)
			? `${Math.round(activeBedBooking.etaSeconds / 60)}`
			: "--");

	const lifecycleStatus = activeBedBooking?.status ?? null;
	const lifecycleLabel = useMemo(() => {
		switch (String(lifecycleStatus || "")) {
			case "in_progress":
				return "Reserved";
			case "accepted":
				return "Confirmed";
			case "arrived":
				return "Ready";
			default:
				return null;
		}
	}, [lifecycleStatus]);

	const statusLabel = lifecycleLabel ?? bedStatus ?? "Waiting";
	// e.g. "Reserved", "Ready"
	
	const bedNumber = activeBedBooking?.bedNumber ?? "--";
	const bedType = activeBedBooking?.bedType 
		? activeBedBooking.bedType.charAt(0).toUpperCase() + activeBedBooking.bedType.slice(1) + " Bed"
		: "Standard Bed";
	const bedCount = Number.isFinite(activeBedBooking?.bedCount)
		? String(activeBedBooking.bedCount)
		: "1";
	const specialty = activeBedBooking?.specialty ?? "General";
	const hospitalName =
		activeBedBooking?.hospitalName ?? bookingHospital?.name ?? "Hospital";

	const showMarkOccupied =
		typeof onMarkBedOccupied === "function" &&
		(statusLabel === "Ready" || bedStatus === "Ready") &&
		String(lifecycleStatus || "") !== "arrived";
	const showComplete =
		typeof onCompleteBedBooking === "function" &&
		String(lifecycleStatus || "") === "arrived";

	if (collapsed) {
		return (
			<BedBookingSummaryCollapsed
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				hospitalName={hospitalName}
				bedNumber={bedNumber}
				bedType={bedType}
				specialty={specialty}
				bedCount={bedCount}
				callTarget={callTarget}
				onCancelBedBooking={onCancelBedBooking}
				showMarkOccupied={showMarkOccupied}
				onMarkBedOccupied={onMarkBedOccupied}
				showComplete={showComplete}
				onCompleteBedBooking={onCompleteBedBooking}
			/>
		);
	}

	if (expanded) {
		return (
			<BedBookingSummaryFull
				isDarkMode={isDarkMode}
				statusLabel={statusLabel}
				etaText={etaText}
				hospitalName={hospitalName}
				bedType={bedType}
				bedCount={bedCount}
				bedNumber={bedNumber}
				specialty={specialty}
				bedProgress={bedProgress}
				callTarget={callTarget}
				onCancelBedBooking={onCancelBedBooking}
				isBusy={!!busyAction}
				busyAction={busyAction}
				onPressCall={handlePressCall}
				onPressCancel={() => runAction("cancel", onCancelBedBooking)}
				showMarkOccupied={showMarkOccupied}
				onMarkBedOccupied={onMarkBedOccupied}
				onPressOccupied={() => runAction("occupied", onMarkBedOccupied)}
				showComplete={showComplete}
				onCompleteBedBooking={onCompleteBedBooking}
				onPressComplete={() => runAction("complete", onCompleteBedBooking)}
				bookingHospital={bookingHospital}
				showSecondaryCta={!hasOtherActiveVisit}
				secondaryCtaLabel="Request Ambulance"
				onPressSecondaryCta={handlePressRequestAmbulance}
			/>
		);
	}

	return (
		<BedBookingSummaryHalf
			isDarkMode={isDarkMode}
			statusLabel={statusLabel}
			etaText={etaText}
			hospitalName={hospitalName}
			bedType={bedType}
			bedCount={bedCount}
			bedNumber={bedNumber}
			specialty={specialty}
			bedProgress={bedProgress}
			bookingHospital={bookingHospital}
			callTarget={callTarget}
			onCancelBedBooking={onCancelBedBooking}
			isBusy={!!busyAction}
			busyAction={busyAction}
			onPressCall={handlePressCall}
			onPressCancel={() => runAction("cancel", onCancelBedBooking)}
			showMarkOccupied={showMarkOccupied}
			onMarkBedOccupied={onMarkBedOccupied}
			onPressOccupied={() => runAction("occupied", onMarkBedOccupied)}
			showComplete={showComplete}
			onCompleteBedBooking={onCompleteBedBooking}
			onPressComplete={() => runAction("complete", onCompleteBedBooking)}
			showSecondaryCta={!hasOtherActiveVisit}
			secondaryCtaLabel="Request Ambulance"
			onPressSecondaryCta={handlePressRequestAmbulance}
		/>
	);
};

const styles = StyleSheet.create({
	collapsedContainer: {
		borderRadius: 22,
		padding: 12,
		marginBottom: 0,
		marginHorizontal: 0,
	},
	collapsedRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	collapsedIconBox: {
		width: 48,
		height: 48,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
	},
	collapsedContent: {
		flex: 1,
		justifyContent: "center",
	},
	collapsedTitle: {
		fontSize: 17,
		fontWeight: "600",
		letterSpacing: -0.4,
		marginBottom: 2,
	},
	collapsedSub: {
		fontSize: 13,
		fontWeight: "400",
	},
	collapsedRightAction: {
		alignItems: "flex-end",
		justifyContent: "center",
	},
	collapsedEtaBadge: {
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
	},
	collapsedEtaText: {
		fontSize: 15,
		fontWeight: "700",
		marginRight: 2,
	},
	collapsedEtaLabel: {
		fontSize: 11,
		fontWeight: "600",
		marginTop: 1,
	},
	container: {
		borderRadius: 20,
		padding: 24,
		marginBottom: 0,
		marginHorizontal: 0, // Uber-like edge-to-edge card
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3,
	},
	headerRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "flex-start",
		marginBottom: 16,
	},
	statusTitle: {
		fontSize: 22,
		fontWeight: "700",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	statusSub: {
		fontSize: 14,
		fontWeight: "500",
	},
	etaContainer: {
		backgroundColor: COLORS.brandPrimary,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12,
		alignItems: "center",
		justifyContent: "center",
	},
	etaTime: {
		fontSize: 18,
		fontWeight: "800",
		lineHeight: 22,
	},
	etaLabel: {
		fontSize: 10,
		fontWeight: "600",
		textTransform: "uppercase",
	},
	progressTrack: {
		height: 6,
		borderRadius: 3,
		overflow: "hidden",
		marginBottom: 20,
	},
	progressBar: {
		height: "100%",
		borderRadius: 3,
	},
	driverRow: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 20,
	},
	driverAvatar: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	driverInfo: {
		flex: 1,
	},
	driverName: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 2,
	},
	ratingRow: {
		flexDirection: "row",
		alignItems: "center",
	},
	ratingText: {
		fontSize: 13,
		marginLeft: 4,
		fontWeight: "500",
	},
	plateContainer: {
		backgroundColor: "#F1F5F9",
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1,
		borderColor: "#E2E8F0",
	},
	plateText: {
		fontSize: 12,
		fontWeight: "700",
		color: "#475569",
		letterSpacing: 0.5,
	},
	actionsRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	secondaryCta: {
		marginTop: 12,
		height: 44,
		borderRadius: 22,
		alignItems: "center",
		justifyContent: "center",
	},
	secondaryCtaText: {
		fontSize: 14,
		fontWeight: "800",
	},
	fullContainer: {
		flex: 1,
		borderRadius: 24,
		overflow: "hidden",
		marginBottom: 0,
	},
	fullHeader: {
		paddingHorizontal: 18,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
	},
	fullBody: {
		paddingHorizontal: 16,
		paddingTop: 14,
		paddingBottom: 0,
	},
	fullStatusTitle: {
		fontSize: 22,
		fontWeight: "800",
		letterSpacing: -0.5,
		marginBottom: 4,
	},
	fullStatusSub: {
		fontSize: 14,
		fontWeight: "600",
	},
	actionBtn: {
		width: 48,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#F3F4F6", // Softer Uber-like gray
	},
	cancelBtn: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "#FEF2F2", // Softer Uber-like red
	},
	cancelText: {
		color: "#DC2626", // Softer Uber-like red
		fontSize: 15,
		fontWeight: "600",
	},
	bedSection: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 24,
		paddingVertical: 8,
	},
	bedImageContainer: {
		width: 60,
		height: 60,
		borderRadius: 16,
		backgroundColor: "rgba(37, 99, 235, 0.10)",
		alignItems: "center",
		justifyContent: "center",
		marginRight: 12,
	},
	bedInfo: {
		flex: 1,
	},
	bedTitle: {
		fontSize: 16,
		fontWeight: "700",
		marginBottom: 4,
	},
	bedSubtitle: {
		fontSize: 13,
		fontWeight: "500",
		marginBottom: 8,
	},
	bedNumber: {
		fontSize: 20,
		fontWeight: "800",
	},
	completeBtn: {
		flex: 1,
		height: 48,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(16, 185, 129, 0.12)",
	},
	completeText: {
		color: "#10B981",
		fontSize: 15,
		fontWeight: "600",
	},
});
