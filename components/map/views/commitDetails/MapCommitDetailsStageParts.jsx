import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import MapInlineActionInput from "../../shared/MapInlineActionInput";
import CountryPickerModal from "../../../register/CountryPickerModal";
import MapHeaderIconButton from "../shared/MapHeaderIconButton";
import { MAP_COMMIT_DETAILS_COPY } from "./mapCommitDetails.content";
import styles from "./mapCommitDetails.styles";

const formatOtpCountdown = (seconds) => {
	const safeSeconds = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
	const minutes = Math.floor(safeSeconds / 60);
	const remainingSeconds = safeSeconds % 60;
	return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
};

function MapCommitPhoneCountryChip({
	country,
	countryLoading,
	titleColor,
	mutedColor,
	onPress,
}) {
	return (
		<Pressable
			disabled={countryLoading}
			onPress={onPress}
			style={({ pressed }) => [
				styles.phoneCountryChip,
				pressed && !countryLoading ? styles.phoneCountryChipPressed : null,
				countryLoading ? styles.phoneCountryChipDisabled : null,
			]}
		>
			<Text style={styles.phoneCountryFlag}>
				{country?.flag || "\u{1F310}"}
			</Text>
			<Text numberOfLines={1} style={[styles.phoneCountryDial, { color: titleColor }]}>
				{countryLoading ? "..." : country?.dial_code || "+1"}
			</Text>
			<Ionicons name="chevron-down" size={14} color={mutedColor} />
		</Pressable>
	);
}

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
	statusTextColor,
	successColor,
	errorColor,
	resendSurfaceColor,
	disabledTextColor,
	step,
	value,
	selectionColor,
	errorMessage,
	successMessage,
	otpRemainingSeconds,
	isSubmitting,
	onChangeValue,
	onSubmit,
	onResend,
	phoneField,
}) {
	const isOtpStep = step.key === "otp";
	const isEmailStep = step.key === "email";
	const isPhoneStep = step.key === "phone";
	const hasOtpCountdown = isOtpStep && typeof otpRemainingSeconds === "number";
	const isOtpExpired = hasOtpCountdown && otpRemainingSeconds <= 0;
	const inlineActionHeight = Math.max(50, Math.min(stageMetrics?.footer?.buttonHeight || 54, 56));
	const inlineActionMinWidth =
		isPhoneStep
			? 104
			: isOtpStep
				? 118
				: 108;
	const inlineActionPaddingHorizontal =
		isPhoneStep
			? 14
			: isOtpStep
				? 18
				: 20;
	const [countryPickerVisible, setCountryPickerVisible] = useState(false);
	const phoneCountryAccessory =
		isPhoneStep && phoneField
			? (
					<MapCommitPhoneCountryChip
						country={phoneField.country}
						countryLoading={phoneField.countryLoading}
						titleColor={titleColor}
						mutedColor={mutedColor}
						onPress={() => setCountryPickerVisible(true)}
					/>
				)
			: null;

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
					semanticType={isEmailStep ? "email" : isPhoneStep ? "phone" : "otp"}
					leadingAccessory={phoneCountryAccessory}
					value={value}
					onChangeText={onChangeValue}
					onSubmit={onSubmit}
					placeholder={step.placeholder}
					placeholderTextColor={mutedColor}
					textColor={titleColor}
					backgroundColor={inputSurfaceColor}
					actionLabel={step.cta}
					actionMinWidth={inlineActionMinWidth}
					actionContentPaddingHorizontal={inlineActionPaddingHorizontal}
					height={inlineActionHeight}
					loading={isSubmitting}
					containerStyle={styles.inputShell}
					inputStyle={styles.input}
					autoCapitalize="none"
					autoCorrect={false}
					clipboardAutofillOnFocus={isOtpStep}
					keyboardType={
						isEmailStep
							? "email-address"
							: isPhoneStep
								? "phone-pad"
								: "number-pad"
					}
					preserveFocusOnSubmit={!isOtpStep}
					returnKeyType="go"
					maxLength={isOtpStep ? 6 : 120}
					selectionColor={selectionColor}
					showClearButton={isEmailStep || isPhoneStep}
				/>

				{errorMessage ? (
					<Text style={[styles.errorText, { color: errorColor }]}>{errorMessage}</Text>
				) : successMessage ? (
					<Text style={[styles.successText, { color: successColor }]}>{successMessage}</Text>
				) : null}

				{isOtpStep ? (
					<View style={styles.otpStatusRow}>
						<Text
							style={[
								styles.otpCountdownText,
								{ color: isOtpExpired ? errorColor : statusTextColor },
							]}
						>
							{isOtpExpired
								? "Code expired"
								: `Expires in ${formatOtpCountdown(otpRemainingSeconds ?? 600)}`}
						</Text>
						{typeof onResend === "function" ? (
							<Pressable
								disabled={isSubmitting}
								onPress={onResend}
								style={({ pressed }) => [
									styles.resendPill,
									{ backgroundColor: resendSurfaceColor },
									pressed && !isSubmitting ? styles.resendPillPressed : null,
									isSubmitting ? styles.resendPillDisabled : null,
								]}
							>
								<Text
									style={[
										styles.resendPillText,
										{ color: isSubmitting ? disabledTextColor : accentColor },
									]}
								>
									{MAP_COMMIT_DETAILS_COPY.OTP_STEP.resend}
								</Text>
							</Pressable>
						) : null}
					</View>
				) : null}

				{isPhoneStep && phoneField ? (
					<CountryPickerModal
						visible={countryPickerVisible}
						onClose={() => setCountryPickerVisible(false)}
						onSelect={(country) => {
							phoneField.onSelectCountry?.(country);
							setCountryPickerVisible(false);
						}}
					/>
				) : null}
			</View>
		</View>
	);
}
