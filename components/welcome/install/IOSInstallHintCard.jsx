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

	return (
		<>
			<View
				style={[
					styles.card,
					compact ? styles.cardCompact : null,
					{ backgroundColor: cardBackground },
				]}
			>
				<View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
					<Ionicons name={installVariant.leadingIcon} size={15} color={COLORS.brandPrimary} />
				</View>
				<View style={styles.copy}>
					<Text style={[styles.title, { color: titleColor }]}>
						{installVariant.title}
					</Text>
					<Text style={[styles.body, { color: bodyColor }]}>
						{installVariant.body}
					</Text>
					<Pressable
						onPress={handlePrimaryAction}
						disabled={isPromptingInstall}
						style={({ pressed }) => [
							styles.guideButton,
							{
								backgroundColor: dismissBackground,
								opacity: isPromptingInstall ? 0.72 : pressed ? 0.88 : 1,
								transform: [{ scale: pressed && !isPromptingInstall ? 0.98 : 1 }],
							},
						]}
					>
						<Text style={[styles.guideButtonText, { color: titleColor }]}>
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
