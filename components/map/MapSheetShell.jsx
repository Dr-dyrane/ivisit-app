import React from "react";
import { Animated, Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useMapSheetShell } from "./useMapSheetShell";
import styles from "./mapSheetShell.styles";

export default function MapSheetShell({
	sheetHeight,
	snapState,
	presentationMode = "sheet",
	shellWidth = null,
	allowedSnapStates = null,
	topSlot = null,
	footerSlot = null,
	handleFloatsOverContent = false,
	onHandlePress,
	children,
}) {
	const {
		blurTint,
		clipStyle,
		contentStyle,
		handleStyle,
		hostLayoutStyle,
		isAndroid,
		isCollapsed,
		isSidebar,
		panResponder,
		sidebarShapeStyle,
		shouldUseBodyGestureRegion,
		shouldUseHeaderGestureRegion,
		tokens,
		underlayStyle,
		overlayStyle,
		backdropStyle,
		useFloatingShell,
		radiusStyle,
	} = useMapSheetShell({
		sheetHeight,
		snapState,
		presentationMode,
		shellWidth,
		allowedSnapStates,
		onHandlePress,
	});

	return (
		<Animated.View
			renderToHardwareTextureAndroid={isAndroid}
			needsOffscreenAlphaCompositing={isAndroid}
			style={[
				styles.sheetHost,
				useFloatingShell ? styles.sheetHostFloating : null,
				presentationMode === "modal" ? styles.sheetHostModal : null,
				presentationMode === "panel" || presentationMode === "sidebar"
					? styles.sheetHostPanel
					: null,
				presentationMode === "sidebar" ? styles.sheetHostSidebar : null,
				tokens.shadowStyle,
				isSidebar ? sidebarShapeStyle : null,
				hostLayoutStyle,
				radiusStyle,
			]}
		>
			{isAndroid ? (
				<Animated.View
					pointerEvents="none"
					style={[styles.sheetUnderlay, isSidebar ? sidebarShapeStyle : null, underlayStyle]}
				/>
			) : null}

			<Animated.View
				renderToHardwareTextureAndroid={isAndroid}
				needsOffscreenAlphaCompositing={isAndroid}
				style={[styles.sheetClip, isSidebar ? sidebarShapeStyle : null, clipStyle]}
			>
				{Platform.OS === "ios" ? (
					<BlurView intensity={tokens.blurIntensity} tint={blurTint} style={StyleSheet.absoluteFill} />
				) : null}

				<Animated.View
					pointerEvents="none"
					style={[StyleSheet.absoluteFillObject, isSidebar ? sidebarShapeStyle : null, backdropStyle]}
				/>
				<Animated.View
					pointerEvents="none"
					style={[StyleSheet.absoluteFillObject, isSidebar ? sidebarShapeStyle : null, overlayStyle]}
				/>

				<Animated.View
					style={[
						styles.sheetContent,
						contentStyle,
						handleFloatsOverContent ? styles.sheetContentHandleOverlay : null,
					]}
				>
					{isSidebar ? null : (
						<View
							{...panResponder.panHandlers}
							style={[
								styles.dragZone,
								handleFloatsOverContent ? styles.dragZoneFloating : null,
							]}
						>
							<Pressable
								onPress={() => onHandlePress?.()}
								hitSlop={isCollapsed ? { top: 14, bottom: 14, left: 16, right: 16 } : 12}
								style={[
									styles.handleTapTarget,
									isCollapsed ? styles.handleTapTargetCollapsed : null,
									handleFloatsOverContent ? styles.handleTapTargetFloating : null,
								]}
							>
								<Animated.View
									style={[
										styles.handle,
										handleStyle,
										handleFloatsOverContent ? styles.handleFloating : null,
									]}
								/>
							</Pressable>
						</View>
					)}
					{topSlot ? (
						<View
							{...(shouldUseHeaderGestureRegion ? panResponder.panHandlers : {})}
							style={[
								styles.topSlotGestureRegion,
								handleFloatsOverContent ? styles.topSlotGestureRegionOverlay : null,
							]}
						>
							{topSlot}
						</View>
					) : null}
					{children ? (
						<View
							{...(shouldUseBodyGestureRegion ? panResponder.panHandlers : {})}
							style={[
								styles.contentViewport,
								shouldUseBodyGestureRegion ? styles.contentViewportGestureRegion : null,
							]}
						>
							{children}
						</View>
					) : null}
					{footerSlot}
				</Animated.View>
			</Animated.View>
		</Animated.View>
	);
}
