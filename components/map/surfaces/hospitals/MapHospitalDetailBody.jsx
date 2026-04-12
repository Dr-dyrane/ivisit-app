import React from "react";
import { ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import EmergencyHospitalRoutePreview from "../../../emergency/intake/EmergencyHospitalRoutePreview";
import { COLORS } from "../../../../constants/colors";
import { getHospitalHeroSource } from "../../mapHospitalImage";
import { styles } from "./mapHospitalDetail.styles";

function renderIcon(item, color = COLORS.brandPrimary, size = 14) {
	if (item.iconType === "material") {
		return <MaterialCommunityIcons name={item.icon} size={size} color={color} />;
	}
	return <Ionicons name={item.icon} size={size} color={color} />;
}

function SheetIcon({ item, isDarkMode, titleColor, tone = "muted", size = 14 }) {
	const gradientColors =
		tone === "strong"
			? isDarkMode
				? ["rgba(255,255,255,0.16)", "rgba(255,255,255,0.06)"]
				: ["#FFFFFF", "#E8EEF7"]
			: isDarkMode
				? ["rgba(255,255,255,0.12)", "rgba(255,255,255,0.04)"]
				: ["rgba(255,255,255,0.98)", "#F1F5F9"];
	const iconColor = tone === "strong" ? titleColor : COLORS.brandPrimary;

	return (
		<View style={[styles.sheetIconShell, tone === "strong" ? styles.sheetIconShellStrong : null]}>
			<LinearGradient
				colors={gradientColors}
				start={{ x: 0.08, y: 0 }}
				end={{ x: 1, y: 1 }}
				style={styles.sheetIconFill}
			>
				<View pointerEvents="none" style={styles.sheetIconHighlight} />
				{renderIcon(item, iconColor, size)}
			</LinearGradient>
		</View>
	);
}

export default function MapHospitalDetailBody({ model, visible = true }) {
	const {
		cardSurface,
		dockAction,
		destination,
		featureList,
		heroBadges,
		hospital,
		isCalculatingRoute,
		isDarkMode,
		onClose,
		origin,
		quickFacts,
		roomRows,
		rowSurface,
		routeCoordinates,
		routeDistanceLabel,
		routeEtaLabel,
		routeInfo,
		summary,
		subtleColor,
		titleColor,
		handleOpenDirections,
	} = model;

	const hasCareSnapshot = featureList.length > 0 || roomRows.length > 0;
	const routeSummaryBits = [
		routeDistanceLabel,
		routeEtaLabel && routeEtaLabel !== "Live route" ? routeEtaLabel : null,
	].filter(Boolean);

	return (
		<View style={styles.scrollContent}>
			<ImageBackground
				source={getHospitalHeroSource(hospital)}
				resizeMode="cover"
				style={styles.hero}
				imageStyle={styles.heroImage}
			>
				<LinearGradient
					colors={
						isDarkMode
							? ["rgba(2,6,23,0.06)", "rgba(2,6,23,0.22)", "rgba(2,6,23,0.88)"]
							: ["rgba(15,23,42,0.01)", "rgba(15,23,42,0.12)", "rgba(15,23,42,0.76)"]
					}
					style={StyleSheet.absoluteFillObject}
				/>

				{heroBadges.length > 0 ? (
					<View style={styles.heroBadgeRow}>
						{heroBadges.map((item, index) => {
							const badgeBg =
								item.tone === "verified"
									? "rgba(16,185,129,0.18)"
									: item.tone === "alert"
										? "rgba(225,29,72,0.18)"
										: "rgba(255,255,255,0.12)";
							return (
								<View
									key={`${item.label}-${index}`}
									style={[styles.heroBadge, { backgroundColor: badgeBg }]}
								>
									{renderIcon(item, "#F8FAFC")}
									<Text style={styles.heroBadgeText}>{item.label}</Text>
								</View>
							);
						})}
					</View>
				) : null}

				{typeof onClose === "function" ? (
					<Pressable onPress={onClose} style={styles.heroCloseButton}>
						{({ pressed }) => (
							<View
								style={[
									styles.heroCloseButtonSurface,
									pressed ? styles.heroCloseButtonSurfacePressed : null,
								]}
							>
								<Ionicons name="close" size={18} color="#F8FAFC" />
							</View>
						)}
					</Pressable>
				) : null}

				<View style={styles.heroFooter}>
					<Text numberOfLines={2} style={styles.heroTitle}>
						{hospital?.name || "Hospital"}
					</Text>
				</View>
			</ImageBackground>

			{quickFacts.length > 0 ? (
				<View style={styles.quickFactRow}>
					{quickFacts.map((item, index) => {
						const isPrimaryAction =
							index === 0 && typeof dockAction?.onPress === "function";
						const pill = (
							<View
								style={[
									styles.quickFactPill,
									isPrimaryAction
										? styles.quickFactPillPrimary
										: { backgroundColor: rowSurface },
								]}
							>
								{isPrimaryAction ? (
									<View style={styles.primaryQuickFactIconWrap}>
										{renderIcon(item, "#F8FAFC", 15)}
									</View>
								) : (
									<SheetIcon item={item} isDarkMode={isDarkMode} titleColor={titleColor} />
								)}
								<View style={styles.quickFactCopy}>
									<Text
										numberOfLines={1}
										style={[
											styles.quickFactLabel,
											{ color: isPrimaryAction ? "rgba(248,250,252,0.82)" : subtleColor },
										]}
									>
										{item.label}
									</Text>
									<Text
										numberOfLines={1}
										style={[
											styles.quickFactText,
											{ color: isPrimaryAction ? "#F8FAFC" : titleColor },
										]}
									>
										{item.value}
									</Text>
								</View>
								{isPrimaryAction ? (
									<Ionicons
										name="chevron-forward"
										size={18}
										color="#F8FAFC"
										style={styles.primaryQuickFactChevron}
									/>
								) : null}
							</View>
						);

						if (!isPrimaryAction) {
							return <View key={item.label}>{pill}</View>;
						}

						return (
							<Pressable
								key={item.label}
								onPress={dockAction.onPress}
								accessibilityLabel={dockAction.label}
								style={styles.primaryQuickFactPressable}
							>
								{({ pressed }) => (
									<View style={pressed ? styles.quickFactPillPrimaryPressed : null}>
										{pill}
									</View>
								)}
							</Pressable>
						);
					})}
				</View>
			) : null}

			{destination || routeCoordinates.length > 1 || summary.addressLine ? (
				<Pressable
					onPress={destination ? handleOpenDirections : undefined}
					disabled={!destination}
					style={styles.routePressable}
				>
					{({ pressed }) => (
						<View style={[styles.routeShell, pressed && destination ? styles.routeShellPressed : null]}>
							<EmergencyHospitalRoutePreview
								origin={origin}
								hospital={destination ? { ...hospital, ...destination } : hospital}
								bottomPadding={18}
								routeCoordinates={routeCoordinates}
								routeInfo={routeInfo}
								isCalculatingRoute={isCalculatingRoute}
								visible={visible}
								showLoadingBadge={false}
							/>
							<LinearGradient
								pointerEvents="none"
								colors={["rgba(15,23,42,0.48)", "rgba(15,23,42,0.08)", "rgba(15,23,42,0)"]}
								style={StyleSheet.absoluteFillObject}
							/>
							<View pointerEvents="none" style={styles.routeCanvasHeader}>
								<View
									style={[
										styles.routeSummaryPill,
										{
											backgroundColor: isDarkMode
												? "rgba(8,15,27,0.56)"
												: "rgba(15,23,42,0.42)",
										},
									]}
								>
									<Text style={styles.routeSummaryText}>
										{routeSummaryBits.length > 0 ? routeSummaryBits.join(" • ") : "Route preview"}
									</Text>
									{summary.addressLine ? (
										<Text numberOfLines={1} style={styles.routeAddressText}>
											{summary.addressLine}
										</Text>
									) : null}
								</View>
								{destination ? (
									<View
										style={[
											styles.routeMapsPill,
											{
												backgroundColor: isDarkMode
													? "rgba(8,15,27,0.48)"
													: "rgba(15,23,42,0.38)",
											},
										]}
									>
										<SheetIcon
											item={{ icon: "navigate-outline", iconType: "ion" }}
											isDarkMode={isDarkMode}
											titleColor={titleColor}
											tone="strong"
											size={13}
										/>
										<Text style={styles.routeMapsText}>Maps</Text>
									</View>
								) : null}
							</View>
						</View>
					)}
				</Pressable>
			) : null}

			{hasCareSnapshot ? (
				<View style={[styles.minimalCard, { backgroundColor: cardSurface }]}>
					{featureList.length > 0 ? (
						<View style={styles.tagRow}>
							{featureList.map((item, index) => (
								<View key={`${item}-${index}`} style={[styles.tagChip, { backgroundColor: rowSurface }]}>
									<Text style={[styles.tagText, { color: titleColor }]}>{item}</Text>
								</View>
							))}
						</View>
					) : null}

					{roomRows.length > 0 ? (
						<View style={styles.roomList}>
							{roomRows.map((room, index) => (
								<View key={`${room.id}-${index}`} style={[styles.roomRow, { backgroundColor: rowSurface }]}>
									<View style={styles.roomCopy}>
										<Text style={[styles.roomLabel, { color: titleColor }]}>{room.label}</Text>
										<Text style={[styles.roomMeta, { color: subtleColor }]}>
											{room.total
												? `${room.available} of ${room.total} open`
												: `${room.available} open`}
										</Text>
									</View>
									{room.price ? (
										<Text style={[styles.roomPrice, { color: titleColor }]}>
											From {Math.round(room.price).toLocaleString()}
										</Text>
									) : null}
								</View>
							))}
						</View>
					) : null}
				</View>
			) : null}
		</View>
	);
}
