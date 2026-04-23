import React from "react";
import { Text, View } from "react-native";
import { styles as bodyStyles } from "./mapVisitDetail.styles";

// PULLBACK NOTE: Extract VisitDetailSkeleton to separate component for modularity
// OLD: VisitDetailSkeleton embedded in MapVisitDetailBody
// NEW: Separate component file for easier maintenance and platform inclusivity

function SkeletonBlock({ style, color }) {
	return <View style={[bodyStyles.skeletonBlock, { backgroundColor: color }, style]} />;
}

export default function VisitDetailSkeleton({ theme }) {
	return (
		<View style={bodyStyles.scrollContent}>
			<View
				style={[
					bodyStyles.heroCanvas,
					bodyStyles.skeletonHeroCard,
					{ backgroundColor: theme.heroSurface },
				]}
			>
				<View style={bodyStyles.skeletonHeroInner}>
					<View style={bodyStyles.skeletonHeroBadgeRow}>
						<SkeletonBlock
							color={theme.skeletonSoftColor}
							style={bodyStyles.skeletonHeroBadge}
						/>
						<SkeletonBlock
							color={theme.skeletonBaseColor}
							style={bodyStyles.skeletonHeroStatus}
						/>
					</View>
					<SkeletonBlock
						color={theme.skeletonBaseColor}
						style={bodyStyles.skeletonHeroTitle}
					/>
					<SkeletonBlock
						color={theme.skeletonSoftColor}
						style={bodyStyles.skeletonHeroSubtitle}
					/>
					<SkeletonBlock
						color={theme.skeletonSoftColor}
						style={bodyStyles.skeletonHeroSupport}
					/>
				</View>
			</View>
			<View style={bodyStyles.skeletonActionRow}>
				<SkeletonBlock
					color={theme.skeletonBaseColor}
					style={bodyStyles.skeletonActionPrimary}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonActionSecondary}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonActionTertiary}
				/>
			</View>
			<View style={bodyStyles.skeletonStatsRow}>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonStat}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonStat}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonStat}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonStat}
				/>
			</View>
			<View style={bodyStyles.skeletonDetailsRow}>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonDetail}
				/>
				<SkeletonBlock
					color={theme.skeletonSoftColor}
					style={bodyStyles.skeletonDetail}
				/>
			</View>
		</View>
	);
}
