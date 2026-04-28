import React from "react";
import { Platform } from "react-native";
import { Animated, Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAP_COMMIT_TRIAGE_COPY } from "./mapCommitTriage.content";
import {
	buildCommitTriageSelectionState,
	getCommitTriageOptionWidthStyle,
	getTriageOptionIcon,
} from "./mapCommitTriage.helpers";
import styles from "./mapCommitTriage.styles";

export function MapCommitTriageHeroBlock({
	progressLabel,
	onSkipAll,
	secondarySurfaceColor,
	mutedColor,
	titleColor,
	orbSize,
	orbRadius,
	orbSurfaceColor,
	orbScale,
	orbIconSize,
	promptText,
	isCritical,
	prioritySurfaceColor,
	dangerColor,
}) {
	const orbSheenColor =
		Platform.OS === "android"
			? "rgba(255,255,255,0.18)"
			: "rgba(255,255,255,0.28)";
	const orbDepthColor =
		Platform.OS === "android"
			? "rgba(0,0,0,0.12)"
			: "rgba(0,0,0,0.16)";

	return (
		<View style={styles.heroBlock}>
			<View style={styles.progressRow}>
				<Text style={[styles.progressText, { color: mutedColor }]}>{progressLabel}</Text>
				<Pressable
					onPress={onSkipAll}
					hitSlop={8}
					style={[styles.skipAllButton, { backgroundColor: secondarySurfaceColor }]}
				>
					<Text style={[styles.skipAllText, { color: titleColor }]}>
						{MAP_COMMIT_TRIAGE_COPY.SKIP_ALL}
					</Text>
				</Pressable>
			</View>
			<Animated.View
				style={[
					styles.avatarOrb,
					{
						width: orbSize,
						height: orbSize,
						borderRadius: orbRadius,
						backgroundColor: orbSurfaceColor,
						shadowColor: orbSurfaceColor,
						transform: [{ scale: orbScale }],
					},
				]}
			>
				<View
					style={[
						styles.avatarOrbSheen,
						{ backgroundColor: orbSheenColor },
					]}
				/>
				<View
					style={[
						styles.avatarOrbDepth,
						{ backgroundColor: orbDepthColor },
					]}
				/>
				<Ionicons name="medkit" size={orbIconSize} color="#FFFFFF" />
			</Animated.View>
			<Text style={[styles.promptText, { color: titleColor }]}>{promptText}</Text>
			{isCritical ? (
				<View
					style={[
						styles.priorityPill,
						{ backgroundColor: prioritySurfaceColor },
					]}
				>
					<Text style={[styles.priorityText, { color: dangerColor }]}>
						{MAP_COMMIT_TRIAGE_COPY.PRIORITY_BADGE}
					</Text>
				</View>
			) : null}
		</View>
	);
}

export function MapCommitTriageTextStep({
	value,
	onChangeText,
	onSkip,
	onContinue,
	noteSurfaceColor,
	noteBorderColor,
	mutedColor,
	titleColor,
	secondarySurfaceColor,
	accentColor,
}) {
	return (
		<>
			<View
				style={[
					styles.textSurface,
					{
						backgroundColor: noteSurfaceColor,
						borderColor: noteBorderColor,
					},
				]}
			>
				<TextInput
					value={value}
					onChangeText={onChangeText}
					placeholder={MAP_COMMIT_TRIAGE_COPY.NOTE_PLACEHOLDER}
					placeholderTextColor={mutedColor}
					style={[styles.textInput, { color: titleColor }]}
					multiline
					maxLength={240}
					textAlignVertical="top"
				/>
			</View>
			<View style={styles.actionsRow}>
				<Pressable
					onPress={onSkip}
					style={[styles.secondaryButton, { backgroundColor: secondarySurfaceColor }]}
				>
					<Text style={[styles.secondaryButtonText, { color: titleColor }]}>
						{MAP_COMMIT_TRIAGE_COPY.SKIP}
					</Text>
				</Pressable>
				<Pressable
					onPress={onContinue}
					style={[styles.primaryButton, { backgroundColor: accentColor }]}
				>
					<Text style={styles.primaryButtonText}>
						{MAP_COMMIT_TRIAGE_COPY.CONTINUE}
					</Text>
				</Pressable>
			</View>
		</>
	);
}

export function MapCommitTriageOptionsStep({
	activeStep,
	draft,
	showExtendedComplaints,
	onShowMoreSymptoms,
	onSelectOption,
	onSkip,
	accentColor,
	mutedColor,
	titleColor,
	secondarySurfaceColor,
	optionSurfaceColor,
	optionSelectedSurfaceColor,
	optionSelectedBorderColor,
}) {
	return (
		<>
			<View style={styles.optionsGrid}>
				{activeStep.options.map((option) => {
					const selectionState = buildCommitTriageSelectionState(activeStep, draft, option);
					const widthStyle = getCommitTriageOptionWidthStyle(
						activeStep,
						option,
						activeStep.options.length,
					);
					const isCompact = widthStyle === "third";
					const iconName = getTriageOptionIcon(activeStep, option);

					return (
						<Pressable
							key={`${activeStep.id}:${String(option.value)}`}
							onPress={() => onSelectOption(option.value)}
							style={[
								styles.optionCard,
								widthStyle === "full"
									? styles.optionSpanFull
									: widthStyle === "third"
										? styles.optionSpanThird
										: styles.optionSpanHalf,
								{
									backgroundColor: selectionState
										? optionSelectedSurfaceColor
										: optionSurfaceColor,
									borderColor: selectionState
										? optionSelectedBorderColor
										: "transparent",
								},
							]}
						>
							<View
								style={[
									styles.optionContent,
									isCompact ? styles.optionContentCompact : null,
								]}
							>
								<View
									style={[
										styles.optionIconBubble,
										isCompact ? styles.optionIconBubbleCompact : null,
										{
											backgroundColor: selectionState
												? optionSelectedSurfaceColor
												: "transparent",
										},
									]}
								>
									<Ionicons
										name={iconName}
										size={16}
										color={selectionState ? optionSelectedBorderColor : mutedColor}
									/>
								</View>
								<Text
									numberOfLines={isCompact ? 1 : 2}
									style={[
										styles.optionLabel,
										isCompact ? styles.optionLabelCompact : null,
										{
											color: selectionState ? optionSelectedBorderColor : titleColor,
										},
									]}
								>
									{option.label}
								</Text>
							</View>
						</Pressable>
					);
				})}
			</View>

			{activeStep.id === "chiefComplaint" && !showExtendedComplaints ? (
				<Pressable
					onPress={onShowMoreSymptoms}
					hitSlop={8}
					style={[styles.showMoreButton, { borderColor: `${accentColor}40` }]}
				>
					<Ionicons name="add-circle-outline" size={14} color={accentColor} />
					<Text style={[styles.showMoreText, { color: accentColor }]}>
						{MAP_COMMIT_TRIAGE_COPY.MORE_SYMPTOMS}
					</Text>
				</Pressable>
			) : null}

			<View style={styles.actionsRow}>
				<Pressable
					onPress={onSkip}
					style={[
						styles.secondaryButton,
						{
							backgroundColor: secondarySurfaceColor,
							flex: 0,
							minWidth: 136,
							alignSelf: "center",
						},
					]}
				>
					<Text style={[styles.secondaryButtonText, { color: titleColor }]}>
						{MAP_COMMIT_TRIAGE_COPY.SKIP}
					</Text>
				</Pressable>
			</View>
		</>
	);
}
