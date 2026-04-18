import React from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapInlineActionInput from "../../shared/MapInlineActionInput";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import { MAP_COMMIT_DETAILS_COPY } from "./mapCommitDetails.content";
import styles from "./mapCommitDetails.styles";

export function MapCommitDetailsTopSlot({
	title,
	subtitle,
	onBack,
	onClose,
	titleColor,
	mutedColor,
	closeSurface,
}) {
	return (
		<View style={styles.topSlot}>
			{typeof onBack === "function" ? (
				<MapHeaderIconButton
					onPress={onBack}
					accessibilityLabel="Go back"
					backgroundColor={closeSurface}
					color={titleColor}
					iconName="chevron-back"
					pressableStyle={styles.topSlotAction}
					style={styles.topSlotCloseButton}
				/>
			) : (
				<View style={styles.topSlotSpacer} />
			)}
			<View style={styles.topSlotCopy}>
				<Text numberOfLines={1} style={[styles.topSlotTitle, { color: titleColor }]}>
					{title}
				</Text>
				{subtitle ? (
					<Text numberOfLines={1} style={[styles.topSlotSubtitle, { color: mutedColor }]}>
						{subtitle}
					</Text>
				) : null}
			</View>
			<MapHeaderIconButton
				onPress={onClose}
				accessibilityLabel="Close commit details"
				backgroundColor={closeSurface}
				color={titleColor}
				pressableStyle={styles.topSlotAction}
				style={styles.topSlotCloseButton}
			/>
		</View>
	);
}

export function MapCommitDetailsQuestionCard({
	stageMetrics,
	inputSurfaceColor,
	avatarSurfaceColor,
	titleColor,
	mutedColor,
	accentColor,
	step,
	value,
	errorMessage,
	successMessage,
	isSubmitting,
	onChangeValue,
	onSubmit,
	onResend,
}) {
	const isOtpStep = step.key === "otp";
	const inlineActionHeight = Math.max(50, Math.min(stageMetrics?.footer?.buttonHeight || 54, 56));
	const inlineActionMinWidth =
		step.key === "phone"
			? 132
			: step.key === "otp"
				? 118
				: 108;

	return (
		<View style={styles.questionCard}>
			<View style={[styles.avatarOrb, { backgroundColor: avatarSurfaceColor }]}>
				<Ionicons name="person-outline" size={38} color={mutedColor} />
			</View>

			<Text style={[styles.questionTitle, { color: titleColor }]}>{step.title}</Text>
			{step.description ? (
				<Text style={[styles.questionDescription, { color: mutedColor }]}>
					{step.description}
				</Text>
			) : null}

			<View style={styles.formBlock}>
				<MapInlineActionInput
					key={step.key}
					autoFocus
					value={value}
					onChangeText={onChangeValue}
					onSubmit={onSubmit}
					placeholder={step.placeholder}
					placeholderTextColor={mutedColor}
					textColor={titleColor}
					backgroundColor={inputSurfaceColor}
					actionLabel={step.cta}
					actionMinWidth={inlineActionMinWidth}
					height={inlineActionHeight}
					loading={isSubmitting}
					containerStyle={styles.inputShell}
					inputStyle={styles.input}
					autoCapitalize="none"
					autoCorrect={false}
					autoComplete={
						step.key === "email"
							? "email"
							: step.key === "phone"
								? "tel"
								: "one-time-code"
					}
					textContentType={
						step.key === "email"
							? "emailAddress"
							: step.key === "phone"
								? "telephoneNumber"
								: "oneTimeCode"
					}
					keyboardType={
						step.key === "email"
							? "email-address"
							: step.key === "phone"
								? "phone-pad"
								: "number-pad"
					}
					returnKeyType="go"
					maxLength={step.key === "otp" ? 6 : 120}
				/>

				{errorMessage ? (
					<Text style={[styles.errorText, { color: "#FCA5A5" }]}>{errorMessage}</Text>
				) : successMessage ? (
					<Text style={[styles.successText, { color: accentColor }]}>{successMessage}</Text>
				) : null}

			</View>

			{isOtpStep && typeof onResend === "function" ? (
				<Pressable onPress={onResend} style={styles.secondaryAction}>
					<Text style={[styles.secondaryActionText, { color: accentColor }]}>
						{MAP_COMMIT_DETAILS_COPY.OTP_STEP.resend}
					</Text>
				</Pressable>
			) : null}
		</View>
	);
}
