import React from "react";
import { Animated, ScrollView, View } from "react-native";
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
	children,
}) {
	const content = androidExpandedBodyGesture ? (
		<GestureDetector gesture={androidExpandedBodyGesture}>
			<Animated.View collapsable={false} style={androidExpandedBodyStyle}>
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
			onWheel={handleBodyWheel}
			onScrollBeginDrag={onScrollBeginDrag}
			onScroll={onScroll}
			onScrollEndDrag={onScrollEndDrag}
			onMomentumScrollEnd={onScrollEndDrag}
			scrollEnabled={scrollEnabled}
		>
			{content}
		</ScrollView>
	);
}
