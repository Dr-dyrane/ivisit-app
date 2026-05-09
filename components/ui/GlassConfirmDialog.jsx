import React from "react";
import {
	Pressable,
	Text,
	View,
	Modal,
	Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "../../contexts/ThemeContext";
import { styles, getDynamicStyles } from "./glassConfirmDialog.styles";

/**
 * GlassConfirmDialog - iVisit-style confirmation dialog
 *
 * Architecture:
 * - Presentation layer only (L5 ephemeral UI)
 * - Uses map sheet glass tokens for consistency
 * - Horizontal squircle buttons (iVisit pattern)
 * - Platform-inclusive token usage
 */
function GlassConfirmDialog({
	visible,
	title,
	message,
	confirmText = "Confirm",
	cancelText = "Cancel",
	isDestructive = false,
	onConfirm,
	onCancel,
}) {
	const { isDarkMode } = useTheme();
	const dynamic = getDynamicStyles(isDarkMode);

	if (!visible) return null;

	const handleCancel = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		onCancel?.();
	};

	const handleConfirm = () => {
		Haptics.impactAsync(
			isDestructive
				? Haptics.ImpactFeedbackStyle.Medium
				: Haptics.ImpactFeedbackStyle.Light
		);
		onConfirm?.();
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			statusBarTranslucent
			onRequestClose={handleCancel}
		>
			<View style={[styles.overlay, dynamic.overlay]}>
				<View style={[styles.dialog, dynamic.dialog, Platform.select({
					ios: dynamic.shadowIOS,
					android: {},
					web: dynamic.shadowWeb,
				})]}>
					{/* Header with title and close */}
					<View style={styles.header}>
						<Text style={[styles.title, dynamic.title]} numberOfLines={1}>
							{title}
						</Text>
						<Pressable
							onPress={handleCancel}
							style={[styles.closeButton, dynamic.closeButton]}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
							accessibilityLabel="Close dialog"
							accessibilityHint="Double tap to dismiss this dialog"
							accessibilityRole="button"
						>
							<Ionicons
								name="close"
								size={20}
								color={dynamic.closeIconColor}
							/>
						</Pressable>
					</View>

					{/* Message body */}
					{message ? (
						<View style={styles.body}>
							<Text style={[styles.message, dynamic.message]}>
								{message}
							</Text>
						</View>
					) : null}

					{/* Horizontal button row */}
					<View style={styles.buttonRow}>
						<Pressable
							onPress={handleCancel}
							style={[styles.button, styles.cancelButton, dynamic.cancelButton]}
							accessibilityLabel={cancelText}
							accessibilityHint={`Double tap to ${cancelText.toLowerCase()}`}
							accessibilityRole="button"
						>
							<Text style={[styles.buttonText, dynamic.cancelText]}>
								{cancelText}
							</Text>
						</Pressable>

						<Pressable
							onPress={handleConfirm}
							style={[styles.button, styles.confirmButton, dynamic.confirmButton]}
							accessibilityLabel={confirmText}
							accessibilityHint={`Double tap to ${isDestructive ? 'permanently ' : ''}${confirmText.toLowerCase()}`}
							accessibilityRole="button"
						>
							<Text
								style={[
									styles.buttonText,
									isDestructive ? dynamic.destructiveText : dynamic.confirmText,
								]}
							>
								{confirmText}
							</Text>
						</Pressable>
					</View>
				</View>
			</View>
		</Modal>
	);
}

export default GlassConfirmDialog;
