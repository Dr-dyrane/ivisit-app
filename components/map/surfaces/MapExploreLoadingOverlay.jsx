import React, { useEffect, useMemo, useRef, useState } from "react";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { Animated, Image, Platform, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../../../contexts/ThemeContext";
import getViewportSurfaceMetrics from "../../../utils/ui/viewportSurfaceMetrics";
import { getMapSheetHeight, MAP_SHEET_SNAP_STATES } from "../core/MapSheetOrchestrator";
import { getMapSheetTokens } from "../tokens/mapSheetTokens";
import {
	getMapViewportSurfaceConfig,
	getMapViewportVariant,
} from "../core/mapViewportConfig";
import { styles } from "./mapExploreLoadingOverlay.styles";

const MIN_VISIBLE_MS = 420;

export default function MapExploreLoadingOverlay({
	screenHeight,
	snapState = MAP_SHEET_SNAP_STATES.HALF,
	status = null,
	visible = false,
	backgroundImageUri = null,
}) {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { width: screenWidth } = useWindowDimensions();
	const viewportVariant = getMapViewportVariant({ platform: Platform.OS, width: screenWidth });
	const surfaceConfig = getMapViewportSurfaceConfig(viewportVariant);
	const usesSidebarLayout = surfaceConfig.overlayLayout === "left-sidebar";
	const viewportMetrics = useMemo(
		() =>
			getViewportSurfaceMetrics({
				width: screenWidth,
				height: screenHeight,
				platform: Platform.OS,
				presentationMode: usesSidebarLayout ? "modal" : "sheet",
			}),
		[screenHeight, screenWidth, usesSidebarLayout],
	);
	const sheetHeight = useMemo(
		() => (usesSidebarLayout ? screenHeight : getMapSheetHeight(screenHeight, snapState)),
		[screenHeight, snapState, usesSidebarLayout],
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
	const resolvedVisible = Boolean(visible ?? status?.visible ?? false);
	const resolvedStatus = status || {
		title: "Preparing nearby help",
		message: "Opening the live map and nearby emergency options for this area.",
		steps: [
			{ key: "location", label: "Location", status: "active" },
			{ key: "providers", label: "Nearby care", status: "pending" },
			{ key: "map", label: "Map + route", status: "pending" },
		],
	};
	const sidebarWidth = usesSidebarLayout
		? Math.min(
				surfaceConfig.overlaySheetMaxWidth || surfaceConfig.sidebarMaxWidth || Math.max(380, screenWidth * 0.38),
				Math.max(320, screenWidth - 64),
			)
		: 0;
	const sheetWidth = usesSidebarLayout
		? sidebarWidth
		: surfaceConfig.overlaySheetMaxWidth
			? Math.min(
					surfaceConfig.overlaySheetMaxWidth,
					Math.max(320, screenWidth - surfaceConfig.overlaySheetSideInset * 2),
				)
			: Math.max(0, screenWidth - surfaceConfig.overlaySheetSideInset * 2);
	const overlaySheetTopInset = surfaceConfig.overlaySheetTopInset || 0;
	const overlaySheetBottomInset = surfaceConfig.overlaySheetBottomInset || 0;
	const sheetTop = usesSidebarLayout
		? overlaySheetTopInset
		: null;
	const sheetLeft = usesSidebarLayout
		? surfaceConfig.overlaySheetSideInset || 0
		: (screenWidth - sheetWidth) / 2;
	const sheetBottom = usesSidebarLayout
		? overlaySheetBottomInset
		: surfaceConfig.overlaySheetBottomInset;
	const sheetSafeTopOffset = usesSidebarLayout ? Math.max(0, insets.top - overlaySheetTopInset) : 0;
	const sheetSafeBottomOffset = usesSidebarLayout
		? Math.max(0, insets.bottom - overlaySheetBottomInset)
		: 0;
	const sheetHeightValue = usesSidebarLayout
		? Math.max(320, sheetHeight - sheetTop - sheetBottom)
		: sheetHeight;
	const headerLeft = usesSidebarLayout
		? sheetLeft + sidebarWidth + surfaceConfig.overlayHeaderSideInset
		: (screenWidth -
				(surfaceConfig.overlayHeaderMaxWidth
					? Math.min(
							surfaceConfig.overlayHeaderMaxWidth,
							Math.max(280, screenWidth - surfaceConfig.overlayHeaderSideInset * 2),
						)
					: Math.max(0, screenWidth - surfaceConfig.overlayHeaderSideInset * 2))) /
			2;
	const headerWidth = usesSidebarLayout
		? Math.max(260, screenWidth - headerLeft - surfaceConfig.overlayHeaderSideInset)
		: surfaceConfig.overlayHeaderMaxWidth
			? Math.min(
					surfaceConfig.overlayHeaderMaxWidth,
					Math.max(280, screenWidth - surfaceConfig.overlayHeaderSideInset * 2),
				)
			: Math.max(0, screenWidth - surfaceConfig.overlayHeaderSideInset * 2);
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
				style={[
					styles.headerGhost,
					{
						backgroundColor: ghostSurface,
						top: insets.top + surfaceConfig.overlayHeaderTopInset,
						left: headerLeft,
						right: undefined,
						width: headerWidth,
						borderRadius: viewportMetrics.map.loadingHeaderRadius,
						borderCurve: "continuous",
					},
				]}
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
						height: sheetHeightValue,
						width: sheetWidth,
						left: sheetLeft,
						right: undefined,
						bottom: sheetBottom,
						top: usesSidebarLayout ? sheetTop : undefined,
						borderTopLeftRadius: viewportMetrics.map.loadingSheetRadius,
						borderTopRightRadius: viewportMetrics.map.loadingSheetRadius,
						borderBottomLeftRadius: viewportMetrics.map.loadingSheetRadius,
						borderBottomRightRadius: viewportMetrics.map.loadingSheetRadius,
						borderCurve: "continuous",
						paddingHorizontal: viewportMetrics.modal.contentPadding,
						paddingTop: usesSidebarLayout
							? Math.max(surfaceConfig.sidebarContentTopPadding || 8, viewportMetrics.modal.contentPadding - 10) + sheetSafeTopOffset
							: Math.max(10, viewportMetrics.modal.contentPadding - 8),
						paddingBottom: usesSidebarLayout
							? Math.max(surfaceConfig.sidebarContentBottomPadding || 10, viewportMetrics.modal.contentPadding - 8) + sheetSafeBottomOffset
							: viewportMetrics.modal.contentPadding + insets.bottom,
					},
				]}
			>
				{usesSidebarLayout ? null : (
					<View
						style={[
							styles.handle,
							{
								backgroundColor: tokens.handleColor,
								width: viewportMetrics.map.handleWidth,
								height: viewportMetrics.map.handleHeight,
							},
						]}
					/>
				)}
				<View style={styles.loadingCopyBlock}>
					<Text style={[styles.loadingEyebrow, { color: quietColor }]}>Nearby help</Text>
					<Text style={[styles.loadingTitle, { color: titleColor }]}>{resolvedStatus.title}</Text>
					{resolvedStatus.message ? (
						<Text
							numberOfLines={1}
							style={[
								styles.loadingMessage,
								{
									color: bodyColor,
									maxWidth: usesSidebarLayout ? "88%" : "86%",
								},
							]}
						>
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
