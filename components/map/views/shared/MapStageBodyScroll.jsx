import React from "react";
import { Animated, Platform, ScrollView } from "react-native";
import { GestureDetector } from "react-native-gesture-handler";

export default function MapStageBodyScroll({
	bodyScrollRef,
	viewportStyle,
	contentContainerStyle,
	isSidebarPresentation = false,
	allowScrollDetents = true,
	handleBodyWheel,
	onScrollBeginDrag,
	onScroll,
	onScrollEndDrag,
	scrollEnabled = true,
	androidExpandedBodyGesture = null,
	androidExpandedBodyStyle = null,
	automaticallyAdjustKeyboardInsets = false,
	// PULLBACK NOTE: Provider list sidebar — sticky header support
	// OLD: no sticky-header API → web-only `position: sticky` style on FilterRail
	//      (broken by viewport `overflow: hidden`); native sidebar had no sticky.
	// NEW: stages can pin their first body child via `stickyHeaderIndices`.
	//      Cross-platform (RN-web maps it to `position: sticky`, native uses
	//      ScrollView's native sticky header API).
	stickyHeaderIndices = null,
	children,
}) {
	const shouldUseAndroidGestureWrapper =
		Platform.OS !== "web" && Boolean(androidExpandedBodyGesture);
	const content = shouldUseAndroidGestureWrapper ? (
		<GestureDetector gesture={androidExpandedBodyGesture}>
			<Animated.View
				collapsable={false}
				style={androidExpandedBodyStyle}
			>
				{children}
			</Animated.View>
		</GestureDetector>
	) : (
		children
	);

	return (
		<ScrollView
			ref={bodyScrollRef}
			style={viewportStyle}
			contentContainerStyle={contentContainerStyle}
			showsVerticalScrollIndicator={false}
			keyboardShouldPersistTaps="handled"
			nestedScrollEnabled
			bounces={!isSidebarPresentation}
			alwaysBounceVertical={!isSidebarPresentation}
			overScrollMode={isSidebarPresentation || !allowScrollDetents ? "auto" : "always"}
			directionalLockEnabled
			scrollEventThrottle={16}
			onWheel={handleBodyWheel ?? undefined}
			onScrollBeginDrag={onScrollBeginDrag ?? undefined}
			onScroll={onScroll ?? undefined}
			onScrollEndDrag={onScrollEndDrag ?? undefined}
			onMomentumScrollEnd={onScrollEndDrag ?? undefined}
			scrollEnabled={scrollEnabled}
			automaticallyAdjustKeyboardInsets={Boolean(automaticallyAdjustKeyboardInsets)}
			maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
			stickyHeaderIndices={
				Array.isArray(stickyHeaderIndices) && !shouldUseAndroidGestureWrapper
					? stickyHeaderIndices
					: undefined
			}
		>
			{content}
		</ScrollView>
	);
}
