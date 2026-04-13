import React from "react";
import { ScrollView, View } from "react-native";
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
	children,
}) {
	const content = androidExpandedBodyGesture ? (
		<GestureDetector gesture={androidExpandedBodyGesture}>
			<View collapsable={false}>{children}</View>
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
