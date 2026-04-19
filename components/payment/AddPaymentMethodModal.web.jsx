import React, { useCallback, useEffect, useRef, useState } from "react";
import {
	ActivityIndicator,
	Modal,
	Pressable,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../contexts/ThemeContext";
import { COLORS } from "../../constants/colors";
import { paymentService } from "../../services/paymentService";

const STRIPE_JS_SRC = "https://js.stripe.com/v3/";

let stripeLoaderPromise = null;

const loadStripeJs = () => {
	if (typeof window === "undefined" || typeof document === "undefined") {
		return Promise.reject(new Error("Card setup is only available in a browser."));
	}

	if (window.Stripe) {
		return Promise.resolve(window.Stripe);
	}

	if (stripeLoaderPromise) {
		return stripeLoaderPromise;
	}

	stripeLoaderPromise = new Promise((resolve, reject) => {
		const existingScript = document.querySelector(`script[src="${STRIPE_JS_SRC}"]`);
		if (existingScript) {
			existingScript.addEventListener("load", () => resolve(window.Stripe), { once: true });
			existingScript.addEventListener("error", () => reject(new Error("Could not load Stripe.")), { once: true });
			return;
		}

		const script = document.createElement("script");
		script.src = STRIPE_JS_SRC;
		script.async = true;
		script.onload = () => resolve(window.Stripe);
		script.onerror = () => reject(new Error("Could not load Stripe."));
		document.head.appendChild(script);
	});

	return stripeLoaderPromise;
};

const toDisplayBrand = (brand) => {
	if (!brand) return "Card";
	return String(brand).charAt(0).toUpperCase() + String(brand).slice(1);
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findStripePaymentMethod = async (paymentMethodId) => {
	if (!paymentMethodId) return null;
	for (let attempt = 0; attempt < 3; attempt += 1) {
		const methods = await paymentService.getPatientStripeStatus();
		const match = methods.find((method) => method?.id === paymentMethodId);
		if (match?.card?.last4) return match;
		if (attempt < 2) {
			await delay(350);
		}
	}
	return null;
};

const AddPaymentMethodModal = ({ onClose, onAdd, loading = false }) => {
	const { isDarkMode } = useTheme();
	const cardMountRef = useRef(null);
	const stripeRef = useRef(null);
	const cardElementRef = useRef(null);
	const [isInitializing, setIsInitializing] = useState(true);
	const [isProcessing, setIsProcessing] = useState(false);
	const [cardComplete, setCardComplete] = useState(false);
	const [errorMessage, setErrorMessage] = useState("");

	const titleColor = isDarkMode ? "#F8FAFC" : "#0F172A";
	const mutedColor = isDarkMode ? "#94A3B8" : "#475569";
	const cardBg = isDarkMode ? "#0F172A" : "#FFFFFF";
	const inputBg = isDarkMode ? "#1E293B" : "#F8FAFC";
	const borderColor = isDarkMode ? "rgba(148,163,184,0.16)" : "rgba(15,23,42,0.08)";
	const canSubmit = cardComplete && !isInitializing && !isProcessing && !loading;

	useEffect(() => {
		let cancelled = false;

		const mountStripe = async () => {
			setIsInitializing(true);
			setErrorMessage("");
			try {
				const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;
				if (!publishableKey) {
					throw new Error("Stripe publishable key is missing.");
				}

				const Stripe = await loadStripeJs();
				if (!Stripe || cancelled || !cardMountRef.current) return;

				const stripe = Stripe(publishableKey);
				const elements = stripe.elements();
				const cardElement = elements.create("card", {
					hidePostalCode: true,
					style: {
						base: {
							color: titleColor,
							fontFamily:
								'-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif',
							fontSize: "16px",
							fontWeight: "500",
							"::placeholder": {
								color: mutedColor,
							},
						},
						invalid: {
							color: isDarkMode ? "#FCA5A5" : "#B91C1C",
						},
					},
				});

				cardElement.mount(cardMountRef.current);
				cardElement.on("change", (event) => {
					setCardComplete(Boolean(event.complete));
					setErrorMessage(event.error?.message || "");
				});

				stripeRef.current = stripe;
				cardElementRef.current = cardElement;
			} catch (error) {
				if (!cancelled) {
					setErrorMessage(error?.message || "Could not prepare secure card entry.");
				}
			} finally {
				if (!cancelled) {
					setIsInitializing(false);
				}
			}
		};

		void mountStripe();

		return () => {
			cancelled = true;
			try {
				cardElementRef.current?.destroy?.();
			} catch {
				// Stripe Elements can throw if already unmounted during hot reload.
			}
			cardElementRef.current = null;
			stripeRef.current = null;
		};
	}, [isDarkMode, mutedColor, titleColor]);

	const handleSecureAdd = useCallback(async () => {
		if (!canSubmit || !stripeRef.current || !cardElementRef.current) return;

		setIsProcessing(true);
		setErrorMessage("");
		try {
			const { clientSecret } = await paymentService.createSetupIntent();
			if (!clientSecret) {
				throw new Error("Could not start secure card setup.");
			}

			const { setupIntent, error } = await stripeRef.current.confirmCardSetup(clientSecret, {
				payment_method: {
					card: cardElementRef.current,
				},
			});

			if (error) {
				throw new Error(error.message || "Could not verify card.");
			}

			const paymentMethodId =
				typeof setupIntent?.payment_method === "string"
					? setupIntent.payment_method
					: setupIntent?.payment_method?.id;
			if (!paymentMethodId) {
				throw new Error("Card was verified but no payment method was returned.");
			}

			const stripeMethod = await findStripePaymentMethod(paymentMethodId);
			const card = stripeMethod?.card || {};
			if (!card.last4) {
				throw new Error("Card was verified, but its display details were not ready.");
			}

			await onAdd?.({
				id: paymentMethodId,
				last4: card.last4,
				brand: toDisplayBrand(card.brand),
				expiry_month: card.exp_month || null,
				expiry_year: card.exp_year || null,
				metadata: { secure: true, source: "stripe_js" },
			});
		} catch (error) {
			setErrorMessage(error?.message || "Could not attach card.");
		} finally {
			setIsProcessing(false);
		}
	}, [canSubmit, onAdd]);

	return (
		<Modal visible transparent animationType="fade" onRequestClose={onClose}>
			<View
				style={[
					styles.overlay,
					{
						backgroundColor: isDarkMode
							? "rgba(2, 6, 23, 0.82)"
							: "rgba(15, 23, 42, 0.20)",
					},
				]}
			>
				<Pressable onPress={onClose} style={StyleSheet.absoluteFill} />
				<View
					style={[
						styles.card,
						{
							backgroundColor: cardBg,
							borderColor,
						},
					]}
				>
					<View style={styles.header}>
						<TouchableOpacity onPress={onClose} style={styles.closeButton}>
							<Ionicons name="close" size={22} color={titleColor} />
						</TouchableOpacity>
						<View style={styles.securityTitle}>
							<Ionicons name="shield-checkmark" size={14} color={COLORS.brandPrimary} />
							<Text style={[styles.securityLabel, { color: mutedColor }]}>
								ENCRYPTED CHANNEL
							</Text>
						</View>
						<View style={styles.headerSpacer} />
					</View>

					<View style={styles.body}>
						<Text style={[styles.title, { color: titleColor }]}>Add card</Text>
						<Text style={[styles.subtitle, { color: mutedColor }]}>
							Card details are handled by Stripe.
						</Text>

						<View
							style={[
								styles.cardInputShell,
								{
									backgroundColor: inputBg,
									borderColor,
								},
							]}
						>
							<View ref={cardMountRef} style={styles.cardElement} />
							{isInitializing ? (
								<View style={styles.inputLoadingOverlay}>
									<ActivityIndicator size="small" color={COLORS.brandPrimary} />
								</View>
							) : null}
						</View>

						<Text style={[styles.pciNote, { color: mutedColor }]}>
							Your card data never touches iVisit servers.
						</Text>

						{errorMessage ? (
							<Text style={styles.errorText}>{errorMessage}</Text>
						) : null}
					</View>

					<TouchableOpacity
						style={[
							styles.primaryButton,
							{
								backgroundColor: canSubmit ? COLORS.brandPrimary : inputBg,
								opacity: canSubmit ? 1 : 0.72,
							},
						]}
						onPress={handleSecureAdd}
						disabled={!canSubmit}
					>
						{isProcessing || loading ? (
							<ActivityIndicator color="#FFFFFF" />
						) : (
							<>
								<Text
									style={[
										styles.primaryButtonText,
										{ color: canSubmit ? "#FFFFFF" : mutedColor },
									]}
								>
									Verify & attach
								</Text>
								<Ionicons
									name="lock-closed"
									size={17}
									color={canSubmit ? "#FFFFFF" : mutedColor}
								/>
							</>
						)}
					</TouchableOpacity>
				</View>
			</View>
		</Modal>
	);
};

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		alignItems: "center",
		justifyContent: "center",
		padding: 24,
	},
	card: {
		width: "100%",
		maxWidth: 460,
		borderRadius: 34,
		borderCurve: "continuous",
		borderWidth: 1,
		padding: 22,
		shadowColor: "#000000",
		shadowOpacity: 0.24,
		shadowRadius: 30,
		shadowOffset: { width: 0, height: 20 },
	},
	header: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	closeButton: {
		width: 42,
		height: 42,
		borderRadius: 21,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(148,163,184,0.12)",
	},
	securityTitle: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
	},
	securityLabel: {
		fontSize: 10,
		lineHeight: 13,
		fontWeight: "900",
		letterSpacing: 1.3,
		textTransform: "uppercase",
	},
	headerSpacer: {
		width: 42,
		height: 42,
	},
	body: {
		gap: 12,
	},
	title: {
		fontSize: 26,
		lineHeight: 30,
		fontWeight: "900",
		letterSpacing: -0.7,
		textAlign: "center",
	},
	subtitle: {
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
		textAlign: "center",
		marginBottom: 8,
	},
	cardInputShell: {
		minHeight: 56,
		borderRadius: 20,
		borderCurve: "continuous",
		borderWidth: 1,
		paddingHorizontal: 15,
		justifyContent: "center",
		position: "relative",
		overflow: "hidden",
	},
	cardElement: {
		width: "100%",
		minHeight: 28,
	},
	inputLoadingOverlay: {
		...StyleSheet.absoluteFillObject,
		alignItems: "center",
		justifyContent: "center",
	},
	pciNote: {
		fontSize: 12,
		lineHeight: 17,
		fontWeight: "600",
		textAlign: "center",
	},
	errorText: {
		color: "#B91C1C",
		fontSize: 13,
		lineHeight: 18,
		fontWeight: "700",
		textAlign: "center",
	},
	primaryButton: {
		marginTop: 22,
		height: 54,
		borderRadius: 27,
		borderCurve: "continuous",
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 8,
		shadowColor: "#0F172A",
		shadowOpacity: 0.2,
		shadowRadius: 20,
		shadowOffset: { width: 0, height: 12 },
	},
	primaryButtonText: {
		fontSize: 16,
		lineHeight: 21,
		fontWeight: "800",
		letterSpacing: -0.2,
	},
});

export default AddPaymentMethodModal;
