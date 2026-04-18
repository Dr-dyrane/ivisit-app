import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, TextInput, View } from "react-native";
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
	placeholder,
	placeholderTextColor,
	textColor,
	backgroundColor,
	actionLabel,
	actionMinWidth = 112,
	height = 54,
	radius,
	loading = false,
	disabled = false,
	containerStyle,
	inputStyle,
	actionAccessibilityHint,
	slideTravel = DEFAULT_SLIDE_TRAVEL,
	preserveFocusOnSubmit = true,
	autoFocus,
	autoCapitalize,
	autoComplete,
	autoCorrect,
	keyboardType,
	maxLength,
	returnKeyType = "go",
	textContentType,
}) {
	const actionProgress = useRef(new Animated.Value(0)).current;
	const inputRef = useRef(null);
	const pulseTimeoutRef = useRef(null);
	const refocusTimeoutRef = useRef(null);
	const [isActionPrimed, setIsActionPrimed] = useState(false);
	const [actionPulseKey, setActionPulseKey] = useState(0);
	const resolvedHeight = Math.max(50, Math.min(height || 54, 58));
	const resolvedRadius = Number.isFinite(radius)
		? radius
		: Math.round(resolvedHeight / 2);
	const actionHeight = Math.max(42, resolvedHeight - 8);
	const actionRadius = Math.round(actionHeight / 2);
	const isActionActive = loading || isActionPrimed;

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
			<TextInput
				ref={inputRef}
				autoFocus={autoFocus}
				value={value}
				onChangeText={onChangeText}
				onSubmitEditing={handleSubmit}
				blurOnSubmit={false}
				placeholder={placeholder}
				placeholderTextColor={placeholderTextColor}
				style={[styles.input, { color: textColor }, inputStyle]}
				autoCapitalize={autoCapitalize}
				autoComplete={autoComplete}
				autoCorrect={autoCorrect}
				keyboardType={keyboardType}
				maxLength={maxLength}
				returnKeyType={returnKeyType}
				textContentType={textContentType}
			/>
			<Animated.View style={[styles.actionWrap, { transform: actionTransform }]}>
				<EntryActionButton
					label={actionLabel}
					onPress={handleSubmit}
					height={actionHeight}
					radius={actionRadius}
					fullWidth={false}
					minWidth={actionMinWidth}
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
	actionWrap: {
		flexShrink: 0,
	},
	actionButton: {
		flexShrink: 0,
	},
});
