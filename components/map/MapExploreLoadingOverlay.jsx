import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Image, Text, View } from "react-native";
import { useTheme } from "../../contexts/ThemeContext";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "./MapSheetOrchestrator";
import { getMapSheetTokens } from "./mapSheetTokens";
import { styles } from "./mapExploreLoadingOverlay.styles";

const MIN_VISIBLE_MS = 420;

export default function MapExploreLoadingOverlay({
	screenHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	status = null,
	visible = true,
	backgroundImageUri = null,
}) {
	const { isDarkMode } = useTheme();
	const sheetHeight = useMemo(
		() => getMapSheetHeight(screenHeight, snapState),
		[screenHeight, snapState],
	);
	const tokens = useMemo(() => getMapSheetTokens({ isDarkMode }), [isDarkMode]);
	const ghostSurface = isDarkMode ? "rgba(8,15,27,0.74)" : "rgba(248,250,252,0.76)";
	const ghostCard = isDarkMode ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.05)";
	const lineColor = isDarkMode ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "#CBD5E1" : "#475569";
	const quietColor = isDarkMode ? "#94A3B8" : "#64748B";
	const accentColor = "#86100E";
	const backdropGradient = backgroundImageUri
		? isDarkMode
			? ["rgba(8,16,27,0.76)", "rgba(10,19,32,0.72)", "rgba(13,23,39,0.90)"]
			: ["rgba(244,247,251,0.68)", "rgba(237,243,248,0.64)", "rgba(232,239,246,0.86)"]
		: isDarkMode
			? ["#08101B", "#0A1320", "#0D1727"]
			: ["#F4F7FB", "#EDF3F8", "#E8EFF6"];
	const resolvedVisible = Boolean(visible ?? status?.visible ?? true);
	const resolvedStatus = status || {
		title: "Preparing nearby help",
		message: "Opening the live map and nearby emergency options for this area.",
		steps: [
			{ key: "location", label: "Location", status: "active" },
			{ key: "providers", label: "Nearby care", status: "pending" },
			{ key: "map", label: "Map + route", status: "pending" },
		],
	};
	const opacity = useRef(new Animated.Value(resolvedVisible ? 1 : 0)).current;
	const visibleSinceRef = useRef(resolvedVisible ? Date.now() : 0);
	const [isRendered, setIsRendered] = useState(resolvedVisible);

	useEffect(() => {
		let hideTimeout = null;

		if (resolvedVisible) {
			visibleSinceRef.current = Date.now();
			setIsRendered(true);
			opacity.stopAnimation();
			Animated.timing(opacity, {
				toValue: 1,
				duration: 180,
				useNativeDriver: true,
			}).start();
			return undefined;
		}

		const elapsed = Date.now() - visibleSinceRef.current;
		hideTimeout = setTimeout(() => {
			opacity.stopAnimation();
			Animated.timing(opacity, {
				toValue: 0,
				duration: 220,
				useNativeDriver: true,
			}).start(({ finished }) => {
				if (finished) {
					setIsRendered(false);
				}
			});
		}, Math.max(0, MIN_VISIBLE_MS - elapsed));

		return () => {
			if (hideTimeout) {
				clearTimeout(hideTimeout);
			}
		};
	}, [opacity, resolvedVisible]);

	if (!isRendered) {
		return null;
	}

	return (
		<Animated.View
			style={[
				styles.root,
				resolvedVisible ? styles.rootInteractive : styles.rootPassive,
				{ opacity },
			]}
		>
			{backgroundImageUri ? (
				<Image source={{ uri: backgroundImageUri }} style={styles.backdropImage} resizeMode="cover" />
			) : null}
			<LinearGradient colors={backdropGradient} style={styles.backdrop} />

			<BlurView
				intensity={tokens.blurIntensity}
				tint={isDarkMode ? "dark" : "light"}
				style={[styles.headerGhost, { backgroundColor: ghostSurface }]}
			>
				<View style={[styles.headerButtonGhost, { backgroundColor: ghostCard }]} />
				<View style={styles.headerCopy}>
					<View style={[styles.headerLinePrimary, { backgroundColor: lineColor }]} />
					<View style={[styles.headerLineSecondary, { backgroundColor: lineColor }]} />
				</View>
				<View style={[styles.headerButtonGhost, { backgroundColor: ghostCard }]} />
			</BlurView>

			<BlurView
				intensity={tokens.blurIntensity}
				tint={isDarkMode ? "dark" : "light"}
				style={[
					styles.sheetGhost,
					{
						backgroundColor: ghostSurface,
						height: sheetHeight,
					},
				]}
			>
				<View style={[styles.handle, { backgroundColor: tokens.handleColor }]} />
				<View style={styles.loadingCopyBlock}>
					<Text style={[styles.loadingEyebrow, { color: quietColor }]}>Nearby help</Text>
					<Text style={[styles.loadingTitle, { color: titleColor }]}>{resolvedStatus.title}</Text>
					{resolvedStatus.message ? (
						<Text numberOfLines={1} style={[styles.loadingMessage, { color: bodyColor }]}>
							{resolvedStatus.message}
						</Text>
					) : null}
				</View>

				<View style={styles.statusRow}>
					{resolvedStatus.steps.map((step) => {
						const isDone = step.status === "done";
						const isActive = step.status === "active";
						return (
							<View
								key={step.key}
								style={[
									styles.statusChip,
									{
										backgroundColor: isDone
											? `${accentColor}18`
											: isActive
												? ghostCard
												: "transparent",
										borderColor: isDone
											? `${accentColor}30`
											: isActive
												? lineColor
												: "transparent",
									},
								]}
							>
								<View
									style={[
										styles.statusDot,
										{
											backgroundColor: isDone ? accentColor : isActive ? quietColor : lineColor,
										},
									]}
								/>
								<Text style={[styles.statusChipText, { color: isDone ? titleColor : quietColor }]}>
									{step.label}
								</Text>
							</View>
						);
					})}
				</View>

				<View style={[styles.searchRow, { backgroundColor: ghostCard }]} />
				<View style={[styles.hospitalCard, { backgroundColor: ghostCard }]} />
				<View style={[styles.sectionLabel, { backgroundColor: lineColor }]} />
				<View style={styles.providerStack}>
					{Array.from({ length: 2 }).map((_, index) => (
						<View key={`provider-ghost-${index}`} style={[styles.providerRow, { backgroundColor: ghostCard }]}>
							<View style={[styles.providerIcon, { backgroundColor: lineColor }]} />
							<View style={styles.providerCopy}>
								<View style={[styles.providerLinePrimary, { backgroundColor: lineColor }]} />
								<View style={[styles.providerLineSecondary, { backgroundColor: lineColor }]} />
							</View>
							<View style={[styles.providerMeta, { backgroundColor: lineColor }]} />
						</View>
					))}
				</View>

				<View style={styles.careRow}>
					{Array.from({ length: 3 }).map((_, index) => (
						<View key={`care-ghost-${index}`} style={styles.careItem}>
							<View style={[styles.careOrb, { backgroundColor: ghostCard }]} />
							<View style={[styles.careLinePrimary, { backgroundColor: lineColor }]} />
							<View style={[styles.careLineSecondary, { backgroundColor: lineColor }]} />
						</View>
					))}
				</View>
			</BlurView>
		</Animated.View>
	);
}
