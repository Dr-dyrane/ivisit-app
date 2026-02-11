import React, { useRef } from "react";
import { View, Text, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Svg, Path } from "react-native-svg";
import InputModal from "../ui/InputModal";
import { useTheme } from "../../contexts/ThemeContext";

export default function PaymentLinkModal({
	visible,
	onClose,
	onPaymentSubmit
}) {
	const { isDarkMode } = useTheme();
	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
	};
	const shakeAnim = useRef(new Animated.Value(0)).current;

	const styles = {
		stepContainer: {
			width: "100%",
		},
		gumroadIconContainer: {
			width: 80,
			height: 80,
			borderRadius: 20,
			backgroundColor: '#FFFFFF',
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: "#000",
			shadowOpacity: 0.1,
			shadowRadius: 10,
			shadowOffset: { width: 0, height: 4 }
		}
	};

	return (
		<InputModal
			visible={visible}
			onClose={onClose}
			title="Secure Payment"
			primaryAction={onPaymentSubmit}
			primaryActionLabel={
				<Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
			}
			secondaryAction={onClose}
			secondaryActionLabel="Cancel"
		>
			<Animated.View style={[styles.stepContainer, { transform: [{ translateX: shakeAnim }] }]}>
				<View style={{ gap: 24, alignItems: 'center', padding: 16 }}>
					<View style={styles.gumroadIconContainer}>
						<Svg width={64} height={64} viewBox="90.295 93.404 330.706 320.703" fill="none">
							<Path
								d="m278.037 414.107c78.957 0 142.964-61.788 142.964-138.008s-64.007-138.009-142.964-138.009-142.965 61.789-142.965 138.009 64.008 138.008 142.965 138.008z"
								fill="#000"
							/>
							<Path
								d="m241.141 385.186c83.044 0 150.846-65.055 150.846-145.891 0-80.835-67.802-145.891-150.846-145.891-83.043 0-150.846 65.056-150.846 145.891 0 80.836 67.803 145.891 150.846 145.891z"
								fill="#ff90e8"
								stroke="#000"
								strokeWidth="1.563"
							/>
							<Path
								d="m229.795 312.898c-42.217 0-67.05-34.11-67.05-76.54 0-44.095 27.316-79.869 79.465-79.869 53.806 0 72.016 36.607 72.844 57.405h-38.905c-.827-11.647-10.761-29.118-34.766-29.118-25.66 0-42.216 22.463-42.216 49.918s16.556 49.917 42.216 49.917c23.178 0 33.111-18.303 37.25-36.605h-37.25v-14.976h78.162v76.54h-34.29v-48.254c-2.484 17.472-13.245 51.582-55.46 51.582z"
								fill="#000"
							/>
						</Svg>
					</View>

					<View style={{ gap: 8 }}>
						<Text style={{
							textAlign: 'center',
							fontSize: 18,
							fontWeight: '700',
							color: colors.text
						}}>
							Complete Purchase via Gumroad
						</Text>
						<Text style={{
							textAlign: 'center',
							fontSize: 14,
							color: colors.textMuted,
							lineHeight: 20
						}}>
							You will be redirected to a secure checkout page to finalize your subscription.
						</Text>
					</View>
				</View>
			</Animated.View>
		</InputModal>
	);
}
