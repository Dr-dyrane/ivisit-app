import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, TextInput, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import EntryActionButton from "../../entry/EntryActionButton";
import { MAP_APPLE_EASE } from "../tokens/mapMotionTokens";

const DEFAULT_SLIDE_TRAVEL = 8;
const ACTION_SLIDE_IN_MS = 2000;
const ACTION_SLIDE_OUT_MS = 2000;
const ACTION_PULSE_MS = 2000;

export default function MapInlineActionInput({
	value,
	onChangeText,
	onSubmit,
	semanticType = "text",
	placeholder,
	placeholderTextColor,
	textColor,
	backgroundColor,
	actionLabel,
	actionMinWidth = 112,
	actionContentPaddingHorizontal,
	height = 54,
	radius,
	loading = false,
	disabled = false,
	containerStyle,
	inputStyle,
	leadingAccessory,
	actionAccessibilityHint,
	slideTravel = DEFAULT_SLIDE_TRAVEL,
	preserveFocusOnSubmit = true,
	autoFocus,
	autoCapitalize,
	autoComplete,
	autoCorrect,
	clearButtonMode,
	enablesReturnKeyAutomatically,
	enterKeyHint,
	importantForAutofill,
	inputMode,
	keyboardType,
	maxLength,
	onFocus,
	returnKeyType = "go",
	selectionColor,
	spellCheck,
	textContentType,
	clipboardAutofillOnFocus = false,
	clipboardAutofillLength = 6,
}) {
	const actionProgress = useRef(new Animated.Value(0)).current;
	const inputRef = useRef(null);
	const pulseTimeoutRef = useRef(null);
	const refocusTimeoutRef = useRef(null);
	const clipboardAutofilledRef = useRef(false);
	const [isActionPrimed, setIsActionPrimed] = useState(false);
	const [actionPulseKey, setActionPulseKey] = useState(0);
	const resolvedHeight = Math.max(50, Math.min(height || 54, 58));
	const resolvedRadius = Number.isFinite(radius)
		? radius
		: Math.round(resolvedHeight / 2);
	const actionHeight = Math.max(42, resolvedHeight - 8);
	const actionRadius = Math.round(actionHeight / 2);
	const isActionActive = loading || isActionPrimed;
	const semanticDefaults = useMemo(() => {
		switch (semanticType) {
			case "email":
				return {
					autoComplete: Platform.select({
						ios: undefined,
						android: "email",
						web: "username",
						default: "email",
					}),
					clearButtonMode: "while-editing",
					enablesReturnKeyAutomatically: true,
					enterKeyHint: "go",
					importantForAutofill: Platform.OS === "android" ? "yes" : undefined,
					inputMode: "email",
					spellCheck: false,
					textContentType: Platform.OS === "ios" ? "username" : undefined,
				};
			case "phone":
				return {
					autoComplete: Platform.OS === "ios" ? undefined : "tel",
					clearButtonMode: "while-editing",
					enablesReturnKeyAutomatically: true,
					enterKeyHint: "go",
					importantForAutofill: Platform.OS === "android" ? "yes" : undefined,
					inputMode: "tel",
					spellCheck: false,
					textContentType: Platform.OS === "ios" ? "telephoneNumber" : undefined,
				};
			case "otp":
				return {
					autoComplete: Platform.OS === "ios" ? undefined : "one-time-code",
					enablesReturnKeyAutomatically: true,
					enterKeyHint: "go",
					importantForAutofill: Platform.OS === "android" ? "yes" : undefined,
					inputMode: "numeric",
					spellCheck: false,
					textContentType: Platform.OS === "ios" ? "oneTimeCode" : undefined,
				};
			default:
				return {
					autoComplete: undefined,
					clearButtonMode: undefined,
					enablesReturnKeyAutomatically: undefined,
					enterKeyHint: undefined,
					importantForAutofill: undefined,
					inputMode: undefined,
					spellCheck: undefined,
					textContentType: undefined,
				};
		}
	}, [semanticType]);
	const resolvedAutoComplete =
		autoComplete !== undefined ? autoComplete : semanticDefaults.autoComplete;
	const resolvedClearButtonMode =
		clearButtonMode !== undefined ? clearButtonMode : semanticDefaults.clearButtonMode;
	const resolvedEnablesReturnKeyAutomatically =
		enablesReturnKeyAutomatically !== undefined
			? enablesReturnKeyAutomatically
			: semanticDefaults.enablesReturnKeyAutomatically;
	const resolvedEnterKeyHint =
		enterKeyHint !== undefined ? enterKeyHint : semanticDefaults.enterKeyHint;
	const resolvedImportantForAutofill =
		importantForAutofill !== undefined
			? importantForAutofill
			: semanticDefaults.importantForAutofill;
	const resolvedInputMode =
		inputMode !== undefined ? inputMode : semanticDefaults.inputMode;
	const resolvedSpellCheck =
		spellCheck !== undefined ? spellCheck : semanticDefaults.spellCheck;
	const resolvedTextContentType =
		textContentType !== undefined ? textContentType : semanticDefaults.textContentType;

	useEffect(() => {
		Animated.timing(actionProgress, {
			toValue: isActionActive ? 1 : 0,
			duration: isActionActive ? ACTION_SLIDE_IN_MS : ACTION_SLIDE_OUT_MS,
			easing: MAP_APPLE_EASE,
			useNativeDriver: true,
		}).start();
	}, [actionProgress, actionPulseKey, isActionActive]);

	useEffect(
		() => () => {
			if (pulseTimeoutRef.current) {
				clearTimeout(pulseTimeoutRef.current);
			}
			if (refocusTimeoutRef.current) {
				clearTimeout(refocusTimeoutRef.current);
			}
		},
		[],
	);

	useEffect(() => {
		if (!String(value || "").trim()) {
			clipboardAutofilledRef.current = false;
		}
	}, [value]);

	const focusInput = useCallback(() => {
		if (!preserveFocusOnSubmit) return;

		inputRef.current?.focus?.();
		if (refocusTimeoutRef.current) {
			clearTimeout(refocusTimeoutRef.current);
		}
		refocusTimeoutRef.current = setTimeout(() => {
			inputRef.current?.focus?.();
		}, 32);
	}, [preserveFocusOnSubmit]);

	const actionTransform = useMemo(
		() => [
			{
				translateX: actionProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [0, slideTravel],
				}),
			},
			{
				scale: actionProgress.interpolate({
					inputRange: [0, 1],
					outputRange: [1, 0.985],
				}),
			},
		],
		[actionProgress, slideTravel],
	);

	const handleFocus = useCallback(async (event) => {
		onFocus?.(event);
		if (!clipboardAutofillOnFocus || clipboardAutofilledRef.current) return;
		if (String(value || "").trim().length > 0) return;
		try {
			const clipboardValue = await Clipboard.getStringAsync();
			const digitsOnly = String(clipboardValue || "").replace(/\D/g, "");
			if (digitsOnly.length !== clipboardAutofillLength) return;
			clipboardAutofilledRef.current = true;
			onChangeText?.(digitsOnly);
		} catch (error) {
			console.warn("[MapInlineActionInput] Clipboard OTP autofill failed:", error?.message || error);
		}
	}, [clipboardAutofillLength, clipboardAutofillOnFocus, onChangeText, onFocus, value]);

	const handleSubmit = () => {
		if (disabled || loading) return;
		actionProgress.stopAnimation();
		actionProgress.setValue(0);
		setIsActionPrimed(true);
		setActionPulseKey((currentKey) => currentKey + 1);
		if (pulseTimeoutRef.current) {
			clearTimeout(pulseTimeoutRef.current);
		}
		pulseTimeoutRef.current = setTimeout(() => {
			setIsActionPrimed(false);
		}, ACTION_PULSE_MS);
		focusInput();
		onSubmit?.();
	};

	return (
		<View
			style={[
				styles.shell,
				{
					minHeight: resolvedHeight,
					borderRadius: resolvedRadius,
					borderCurve: "continuous",
					backgroundColor,
					paddingRight: 6 + slideTravel,
				},
				containerStyle,
			]}
		>
			{leadingAccessory ? <View style={styles.leadingAccessory}>{leadingAccessory}</View> : null}
			<TextInput
				ref={inputRef}
				autoFocus={autoFocus}
				value={value}
				onChangeText={onChangeText}
				onFocus={handleFocus}
				onSubmitEditing={handleSubmit}
				blurOnSubmit={false}
				placeholder={placeholder}
				placeholderTextColor={placeholderTextColor}
				style={[styles.input, { color: textColor }, inputStyle]}
				autoCapitalize={autoCapitalize}
				autoComplete={resolvedAutoComplete}
				autoCorrect={autoCorrect}
				clearButtonMode={resolvedClearButtonMode}
				enablesReturnKeyAutomatically={resolvedEnablesReturnKeyAutomatically}
				enterKeyHint={resolvedEnterKeyHint}
				importantForAutofill={resolvedImportantForAutofill}
				inputMode={resolvedInputMode}
				keyboardType={keyboardType}
				maxLength={maxLength}
				returnKeyType={returnKeyType}
				selectionColor={selectionColor}
				spellCheck={resolvedSpellCheck}
				textContentType={resolvedTextContentType}
			/>
			<Animated.View style={[styles.actionWrap, { transform: actionTransform }]}>
				<EntryActionButton
					label={actionLabel}
					onPress={handleSubmit}
					height={actionHeight}
					radius={actionRadius}
					fullWidth={false}
					minWidth={actionMinWidth}
					contentPaddingHorizontal={actionContentPaddingHorizontal}
					disabled={disabled}
					loading={loading}
					onPressIn={focusInput}
					accessibilityHint={actionAccessibilityHint}
					style={styles.actionButton}
				/>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	shell: {
		width: "100%",
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		paddingLeft: 18,
		overflow: "visible",
	},
	input: {
		flex: 1,
		minWidth: 0,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "500",
		paddingVertical: 0,
	},
	leadingAccessory: {
		flexShrink: 0,
	},
	actionWrap: {
		flexShrink: 0,
	},
	actionButton: {
		flexShrink: 0,
	},
});
