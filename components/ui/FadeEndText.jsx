import React, { memo, useCallback, useMemo, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

function parseColorChannels(color) {
	if (typeof color !== "string") return null;
	const trimmed = color.trim();
	const hex = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
	if (hex) {
		const raw = hex[1];
		const normalized =
			raw.length === 3
				? raw
					.split("")
					.map((char) => char + char)
					.join("")
				: raw;
		const rgb = normalized.slice(0, 6);
		const int = parseInt(rgb, 16);
		const r = (int >> 16) & 255;
		const g = (int >> 8) & 255;
		const b = int & 255;
		const alphaHex = normalized.length === 8 ? normalized.slice(6, 8) : null;
		const alpha = alphaHex ? parseInt(alphaHex, 16) / 255 : 1;
		return { r, g, b, alpha };
	}
	const rgba = trimmed.match(
		/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*[\d.]+)?\s*\)$/i,
	);
	if (rgba) {
		const alphaMatch = trimmed.match(
			/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)$/i,
		);
		return {
			r: Number(rgba[1]),
			g: Number(rgba[2]),
			b: Number(rgba[3]),
			alpha: alphaMatch ? Number(alphaMatch[1]) : 1,
		};
	}
	return null;
}

function buildFadeColors(fadeColor, transparentFadeColor) {
	const parsed = parseColorChannels(fadeColor);
	if (!parsed) {
		return {
			solid: fadeColor || "#FFFFFF",
			transparent: transparentFadeColor || "rgba(255,255,255,0)",
		};
	}
	const { r, g, b } = parsed;
	return {
		solid: fadeColor || `rgb(${r},${g},${b})`,
		transparent: transparentFadeColor || `rgba(${r},${g},${b},0)`,
	};
}

/**
 * FadeEndText
 *
 * Dense-surface text treatment for premium clipped labels.
 * Keeps the full value accessible while visually clipping under a soft
 * trailing surface overlay instead of showing a harsh ellipsis.
 */
function FadeEndText({
	text,
	children,
	textStyle,
	containerStyle,
	fadeColor = "#FFFFFF",
	transparentFadeColor,
	fadeWidth = 28,
	fadeRadius = 12,
	fadeLocations = [0, 0.88, 1],
	fadeOpacity = 0.9,
	numberOfLines = 1,
	accessibilityLabel,
	textProps,
}) {
	const content = text ?? children ?? "";
	const [containerWidth, setContainerWidth] = useState(0);
	const [textWidth, setTextWidth] = useState(0);
	const [laidOutLineCount, setLaidOutLineCount] = useState(0);
	const fadeColors = useMemo(
		() => buildFadeColors(fadeColor, transparentFadeColor),
		[fadeColor, transparentFadeColor],
	);
	const shouldClipSingleLine = numberOfLines === 1;
	const hasMeasured = containerWidth > 0 && (textWidth > 0 || laidOutLineCount > 0);
	const hasHorizontalOverflow = textWidth > containerWidth + 1;
	const hasLineOverflow =
		Number.isFinite(numberOfLines) &&
		numberOfLines > 0 &&
		laidOutLineCount > numberOfLines;
	const shouldRenderFade = hasMeasured && (hasHorizontalOverflow || hasLineOverflow);

	const handleContainerLayout = useCallback((event) => {
		const nextWidth = event?.nativeEvent?.layout?.width || 0;
		setContainerWidth((current) =>
			Math.abs(current - nextWidth) > 0.5 ? nextWidth : current,
		);
	}, []);

	const handleTextLayout = useCallback(
		(event) => {
			textProps?.onTextLayout?.(event);
			const lines = event?.nativeEvent?.lines || [];
			setLaidOutLineCount((current) =>
				current === lines.length ? current : lines.length,
			);
			if (shouldClipSingleLine) return;
			const widestLine = lines.reduce(
				(max, line) => Math.max(max, Number(line?.width) || 0),
				0,
			);
			setTextWidth((current) =>
				Math.abs(current - widestLine) > 0.5 ? widestLine : current,
			);
		},
		[shouldClipSingleLine, textProps],
	);

	const handleMeasureLayout = useCallback((event) => {
		const nextWidth = event?.nativeEvent?.layout?.width || 0;
		setTextWidth((current) =>
			Math.abs(current - nextWidth) > 0.5 ? nextWidth : current,
		);
	}, []);

	return (
		<View
			onLayout={handleContainerLayout}
			style={[styles.container, containerStyle]}
		>
			<Text
				{...textProps}
				accessibilityLabel={accessibilityLabel || String(content)}
				onTextLayout={handleTextLayout}
				numberOfLines={Platform.OS === "web" && shouldClipSingleLine ? undefined : numberOfLines}
				ellipsizeMode="clip"
				style={[
					styles.text,
					shouldClipSingleLine && Platform.OS === "web" ? styles.textWebSingleLine : null,
					textStyle,
				]}
			>
				{content}
			</Text>
			{shouldClipSingleLine ? (
				<Text
					accessible={false}
					accessibilityElementsHidden
					importantForAccessibility="no-hide-descendants"
					pointerEvents="none"
					onLayout={handleMeasureLayout}
					numberOfLines={1}
					style={[
						styles.measureText,
						shouldClipSingleLine && Platform.OS === "web" ? styles.textWebSingleLine : null,
						textStyle,
					]}
				>
					{content}
				</Text>
			) : null}
			{shouldRenderFade ? (
				<View
					pointerEvents="none"
					style={[
						styles.fadeOverlay,
						{
							width: fadeWidth,
							opacity: fadeOpacity,
							borderTopRightRadius: fadeRadius,
							borderBottomRightRadius: fadeRadius,
						},
					]}
				>
					<LinearGradient
						pointerEvents="none"
						colors={[fadeColors.transparent, fadeColors.solid, fadeColors.solid]}
						locations={fadeLocations}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 0 }}
						style={StyleSheet.absoluteFill}
					/>
				</View>
			) : null}
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		position: "relative",
		minWidth: 0,
		maxWidth: "100%",
		overflow: "hidden",
	},
	text: {
		minWidth: 0,
	},
	measureText: {
		position: "absolute",
		left: 0,
		top: 0,
		opacity: 0,
	},
	textWebSingleLine: {
		whiteSpace: "nowrap",
		textOverflow: "clip",
	},
	fadeOverlay: {
		position: "absolute",
		top: 0,
		right: 0,
		bottom: 0,
		overflow: "hidden",
		borderCurve: "continuous",
		zIndex: 2,
	},
});

export default memo(FadeEndText);
