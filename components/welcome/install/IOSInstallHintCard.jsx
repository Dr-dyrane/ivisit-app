import React, { useEffect, useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../contexts/ThemeContext";
import { COLORS } from "../../../constants/colors";
import useAuthViewport from "../../../hooks/ui/useAuthViewport";
import useWebInstallPrompt from "../../../hooks/ui/useWebInstallPrompt";
import IOSInstallGuideModal from "./IOSInstallGuideModal";
import { WEB_INSTALL_VARIANTS } from "./webInstallHint.constants";
import {
	shouldSuppressWebInstallHint,
	writeWebInstallHintSuppression,
} from "./webInstallHint.persistence";
import { styles } from "./iosInstallHint.styles";

export default function IOSInstallHintCard({
	visible = false,
	compact = false,
}) {
	const { isDarkMode } = useTheme();
	const viewport = useAuthViewport();
	const { canPromptInstall, isPromptingInstall, promptInstall } = useWebInstallPrompt();
	const [isDismissed, setIsDismissed] = useState(false);
	const [guideVisible, setGuideVisible] = useState(false);

	useEffect(() => {
		if (!visible || Platform.OS !== "web") {
			setIsDismissed(false);
			setGuideVisible(false);
			return undefined;
		}

		setIsDismissed(shouldSuppressWebInstallHint());
		return undefined;
	}, [visible]);

	const isIosVariant = viewport.isIosBrowser;
	const isAndroidVariant = viewport.isAndroidBrowser && canPromptInstall;
	const installVariant = isIosVariant
		? WEB_INSTALL_VARIANTS.ios
		: isAndroidVariant
			? WEB_INSTALL_VARIANTS.android
			: null;

	const handleDismiss = () => {
		writeWebInstallHintSuppression("dismiss");
		setIsDismissed(true);
	};

	const handleGuideClose = () => {
		setGuideVisible(false);
		setIsDismissed(true);
	};

	const handlePrimaryAction = async () => {
		if (isIosVariant) {
			writeWebInstallHintSuppression("engaged");
			setGuideVisible(true);
			return;
		}

		if (isAndroidVariant) {
			writeWebInstallHintSuppression("engaged");
			await promptInstall();
			setIsDismissed(true);
		}
	};

	if (!visible || isDismissed || !installVariant) {
		return null;
	}

	const cardBackground = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(255,255,255,0.82)";
	const iconBackground = isDarkMode
		? "rgba(134,16,14,0.18)"
		: "rgba(134,16,14,0.10)";
	const dismissBackground = isDarkMode
		? "rgba(255,255,255,0.08)"
		: "rgba(15,23,42,0.06)";
	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const bodyColor = isDarkMode ? "rgba(226,232,240,0.82)" : "#475569";
	const responsiveStyles = {
		card: {
			borderRadius: compact ? 20 : Math.max(20, viewport.modalRadius - 8),
			paddingHorizontal: compact ? Math.max(12, viewport.modalContentPadding - 6) : Math.max(14, viewport.modalContentPadding - 4),
			paddingVertical: compact ? 12 : Math.max(14, viewport.modalContentPadding - 4),
			gap: Math.max(10, viewport.isCompactPhone ? 10 : 12),
		},
		iconWrap: {
			width: compact ? 28 : Math.max(30, Math.round(viewport.bodyTextSize * 1.9)),
			height: compact ? 28 : Math.max(30, Math.round(viewport.bodyTextSize * 1.9)),
			borderRadius: compact ? 14 : Math.max(14, Math.round(viewport.bodyTextSize * 0.95)),
		},
		title: {
			fontSize: Math.max(13, viewport.bodyTextSize - 2),
			lineHeight: Math.max(18, viewport.bodyTextLineHeight - 6),
		},
		body: {
			marginTop: 3,
			fontSize: Math.max(12, viewport.bodyTextSize - 4),
			lineHeight: Math.max(17, viewport.bodyTextLineHeight - 7),
		},
		guideButton: {
			marginTop: Math.max(8, viewport.screenVerticalPadding - 8),
			minHeight: Math.max(34, viewport.entryPrimaryActionHeight - 22),
			paddingHorizontal: Math.max(12, viewport.modalContentPadding - 8),
			borderRadius: Math.max(14, viewport.modalRadius - 14),
		},
		guideButtonText: {
			fontSize: Math.max(12, viewport.bodyTextSize - 4),
			lineHeight: Math.max(16, viewport.bodyTextLineHeight - 8),
		},
		dismissButton: {
			width: compact ? 28 : Math.max(28, Math.round(viewport.bodyTextSize * 1.75)),
			height: compact ? 28 : Math.max(28, Math.round(viewport.bodyTextSize * 1.75)),
			borderRadius: compact ? 14 : Math.max(14, Math.round(viewport.bodyTextSize * 0.88)),
		},
	};

	return (
		<>
			<View
				style={[
					styles.card,
					compact ? styles.cardCompact : null,
					responsiveStyles.card,
					{ backgroundColor: cardBackground },
				]}
			>
				<View style={[styles.iconWrap, responsiveStyles.iconWrap, { backgroundColor: iconBackground }]}>
					<Ionicons name={installVariant.leadingIcon} size={15} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.copy}>
					<Text style={[styles.title, responsiveStyles.title, { color: titleColor }]}>
						{installVariant.title}
					</Text>
					<Text style={[styles.body, responsiveStyles.body, { color: bodyColor }]}>
						{installVariant.body}
					</Text>
					<Pressable
						onPress={handlePrimaryAction}
						disabled={isPromptingInstall}
						style={({ pressed }) => [
							styles.guideButton,
							responsiveStyles.guideButton,
							{
								backgroundColor: dismissBackground,
								opacity: isPromptingInstall ? 0.72 : pressed ? 0.88 : 1,
								transform: [{ scale: pressed && !isPromptingInstall ? 0.98 : 1 }],
							},
						]}
					>
						<Text style={[styles.guideButtonText, responsiveStyles.guideButtonText, { color: titleColor }]}>
							{isAndroidVariant && isPromptingInstall
								? installVariant.actionPendingLabel
								: installVariant.actionLabel}
						</Text>
						<Ionicons name={installVariant.actionIcon} size={14} color={titleColor} />
					</Pressable>
				</View>
				<Pressable
					onPress={handleDismiss}
					style={({ pressed }) => [
						styles.dismissButton,
						responsiveStyles.dismissButton,
						{
							backgroundColor: dismissBackground,
							opacity: pressed ? 0.84 : 1,
							transform: [{ scale: pressed ? 0.96 : 1 }],
						},
					]}
				>
					<Ionicons name="close" size={14} color={titleColor} />
				</Pressable>
			</View>
			<IOSInstallGuideModal
				visible={guideVisible}
				onClose={handleGuideClose}
			/>
		</>
	);
}
