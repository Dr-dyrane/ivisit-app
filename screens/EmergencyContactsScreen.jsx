"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Pressable,
	Modal,
	Animated,
	TextInput,
	ActivityIndicator,
    KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import * as Haptics from "expo-haptics";
import { useEmergencyContacts } from "../hooks/emergency/useEmergencyContacts";
import { useToast } from "../contexts/ToastContext";

export default function EmergencyContactsScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { setHeaderState } = useHeaderState();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { showToast } = useToast();

	const backButton = useCallback(() => <HeaderBackButton />, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Emergency Contacts",
				subtitle: "SAFETY",
				icon: <Ionicons name="people" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
		}, [backButton, resetHeader, resetTabBar, setHeaderState])
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	useEffect(() => {
		Animated.parallel([
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 600,
				useNativeDriver: true,
			}),
			Animated.spring(slideAnim, {
				toValue: 0,
				friction: 8,
				tension: 50,
				useNativeDriver: true,
			}),
		]).start();
	}, []);

	const handleScroll = useCallback(
		(event) => {
			handleTabBarScroll(event);
			handleHeaderScroll(event);
		},
		[handleHeaderScroll, handleTabBarScroll]
	);

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F3E7E7", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#0B0F1A" : "#F3E7E7",
		inputBg: isDarkMode ? "#0B0F1A" : "#F3F4F6",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 20;
	const topPadding = STACK_TOP_PADDING;

	const {
		contacts,
		isLoading,
		refreshContacts,
		addContact,
		updateContact,
		removeContact,
	} = useEmergencyContacts();
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [editingId, setEditingId] = useState(null);
	const [name, setName] = useState("");
	const [relationship, setRelationship] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [error, setError] = useState(null);
	const [isSaving, setIsSaving] = useState(false);

	const shakeAnim = useRef(new Animated.Value(0)).current;

	const refresh = useCallback(async () => {
		refreshContacts();
	}, [refreshContacts]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const openCreate = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setEditingId(null);
		setName("");
		setRelationship("");
		setPhone("");
		setEmail("");
		setError(null);
		setIsModalVisible(true);
	}, []);

	const openEdit = useCallback((contact) => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setEditingId(contact?.id ? String(contact.id) : null);
		setName(typeof contact?.name === "string" ? contact.name : "");
		setRelationship(
			typeof contact?.relationship === "string" ? contact.relationship : ""
		);
		setPhone(typeof contact?.phone === "string" ? contact.phone : "");
		setEmail(typeof contact?.email === "string" ? contact.email : "");
		setError(null);
		setIsModalVisible(true);
	}, []);

	const closeModal = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setIsModalVisible(false);
	}, []);

	const shake = useCallback(() => {
		Animated.sequence([
			Animated.timing(shakeAnim, {
				toValue: 10,
				duration: 60,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: -10,
				duration: 60,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 8,
				duration: 60,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: -8,
				duration: 60,
				useNativeDriver: true,
			}),
			Animated.timing(shakeAnim, {
				toValue: 0,
				duration: 60,
				useNativeDriver: true,
			}),
		]).start();
	}, [shakeAnim]);

	const canSave = useMemo(() => {
		const nameValid = name.trim().length >= 2;
		const phoneValid = phone.trim().length === 0 || /^\+?[\d\s\-\(\)]+$/.test(phone.trim());
		const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
		const hasContact = phone.trim().length > 0 || email.trim().length > 0;
		
		return nameValid && phoneValid && emailValid && hasContact;
	}, [email, name, phone]);

	const handleSave = useCallback(async () => {
		if (!canSave || isSaving) {
			if (!canSave) {
				const nameValid = name.trim().length >= 2;
				const phoneValid = phone.trim().length === 0 || /^\+?[\d\s\-\(\)]+$/.test(phone.trim());
				const emailValid = email.trim().length === 0 || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
				const hasContact = phone.trim().length > 0 || email.trim().length > 0;
				
				if (!nameValid) {
					setError("Name must be at least 2 characters");
				} else if (!hasContact) {
					setError("Phone or email required");
				} else if (!phoneValid) {
					setError("Invalid phone number format");
				} else if (!emailValid) {
					setError("Invalid email format");
				} else {
					setError("Please check all fields");
				}
				shake();
			}
			return;
		}
		setIsSaving(true);
		setError(null);
		try {
			const payload = {
				name,
				relationship,
				phone,
				email,
			};
			if (editingId) {
				await updateContact(editingId, payload);
				showToast("Contact updated successfully", "success");
			} else {
				await addContact(payload);
				showToast("Contact added successfully", "success");
			}
			setIsModalVisible(false);
		} catch (e) {
			const msg =
				e?.message?.split("|")?.[1] || e?.message || "Unable to save contact";
			setError(msg);
			showToast(msg, "error");
			shake();
		} finally {
			setIsSaving(false);
		}
	}, [
		canSave,
		editingId,
		email,
		isSaving,
		name,
		phone,
		relationship,
		shake,
		addContact,
		updateContact,
		showToast,
	]);

	const handleDelete = useCallback(
		async (id) => {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
			try {
				await removeContact(id);
				showToast("Contact deleted successfully", "success");
			} catch (error) {
				showToast("Failed to delete contact", "error");
			}
		},
		[removeContact, showToast]
	);

	const emptyState = !isLoading && (!contacts || contacts.length === 0);

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<Animated.ScrollView
				contentContainerStyle={[
					styles.content,
					{ paddingTop: topPadding, paddingBottom: bottomPadding },
				]}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
				style={{
					opacity: fadeAnim,
					transform: [{ translateY: slideAnim }],
				}}
			>
				<View style={[styles.card, { backgroundColor: colors.card }]}>
					<Text style={[styles.title, { color: colors.text }]}>
						People we can reach fast
					</Text>
					<Text style={[styles.subtitle, { color: colors.textMuted }]}>
						Add family members, caregivers, and key contacts. This will power
						quick share + emergency workflows later.
					</Text>
				</View>

				<Pressable
					onPress={openCreate}
					style={({ pressed }) => [
						styles.addCard,
						{
							backgroundColor: COLORS.brandPrimary,
							opacity: pressed ? 0.92 : 1,
						},
					]}
				>
					<Ionicons name="add" size={18} color="#FFFFFF" />
					<Text style={styles.addText}>Add Contact</Text>
				</Pressable>

				{isLoading ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 10 }}
						>
							<ActivityIndicator color={COLORS.brandPrimary} />
							<Text style={{ color: colors.textMuted, fontWeight: "500" }}>
								Loading contacts...
							</Text>
						</View>
					</View>
				) : null}

				{emptyState ? (
					<View style={[styles.card, { backgroundColor: colors.card }]}>
						<Text style={[styles.title, { color: colors.text }]}>
							No contacts yet
						</Text>
						<Text style={[styles.subtitle, { color: colors.textMuted }]}>
							Add at least one trusted contact for faster emergency
							coordination.
						</Text>
					</View>
				) : null}

				{contacts.map((c) => (
					<View
						key={String(c?.id)}
						style={[styles.contactCard, { backgroundColor: colors.card }]}
					>
						<View style={{ flex: 1 }}>
							<Text style={[styles.contactName, { color: colors.text }]}>
								{c?.name ?? "--"}
							</Text>
							<Text style={[styles.contactMeta, { color: colors.textMuted }]}>
								{[c?.relationship, c?.phone, c?.email]
									.filter(Boolean)
									.join(" • ")}
							</Text>
						</View>
						<Pressable
							onPress={() => openEdit(c)}
							style={({ pressed }) => [
								{ opacity: pressed ? 0.7 : 1, padding: 10 },
							]}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Ionicons
								name="create-outline"
								size={20}
								color={colors.textMuted}
							/>
						</Pressable>
						<Pressable
							onPress={() => handleDelete(c?.id)}
							style={({ pressed }) => [
								{ opacity: pressed ? 0.7 : 1, padding: 10 },
							]}
							hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
						>
							<Ionicons name="trash-outline" size={20} color={COLORS.error} />
						</Pressable>
					</View>
				))}
			</Animated.ScrollView>

			<Modal
				transparent
				visible={isModalVisible}
				animationType="fade"
				onRequestClose={closeModal}
			>
				<KeyboardAvoidingView 
					behavior={Platform.OS === "ios" ? "padding" : "height"}
					style={styles.modalBackdrop}
				>
					<Pressable
						style={styles.modalBackdropPressable}
						onPress={closeModal}
					/>
					<View style={[styles.modalCard, { backgroundColor: colors.card }]}>
						<View style={styles.modalHeader}>
							<Text style={[styles.modalTitle, { color: colors.text }]}>
								{editingId ? "Edit Contact" : "Add Contact"}
							</Text>
							<Pressable
								onPress={closeModal}
								style={({ pressed }) => [
									{ opacity: pressed ? 0.7 : 1, padding: 6 },
								]}
							>
								<Ionicons name="close" size={22} color={colors.textMuted} />
							</Pressable>
						</View>

						{error ? (
							<View style={styles.errorRow}>
								<Ionicons name="alert-circle" size={18} color={COLORS.error} />
								<Text style={[styles.errorText, { color: COLORS.error }]}>
									{error}
								</Text>
							</View>
						) : null}

						<Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
							<Text style={[styles.inputLabel, { color: colors.textMuted }]}>Name</Text>
							<View
								style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
							>
								<Ionicons name="person" size={18} color={COLORS.textMuted} />
								<TextInput
									value={name}
									onChangeText={(t) => {
										setName(t);
										if (error) setError(null);
									}}
									placeholder="Full name"
									placeholderTextColor={COLORS.textMuted}
									style={[styles.input, { color: colors.text }]}
									selectionColor={COLORS.brandPrimary}
								/>
							</View>
							<Text style={[styles.inputLabel, { color: colors.textMuted }]}>Relationship</Text>
							<View
								style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
							>
								<Ionicons name="heart" size={18} color={COLORS.textMuted} />
								<TextInput
									value={relationship}
									onChangeText={(t) => {
										setRelationship(t);
										if (error) setError(null);
									}}
									placeholder="Relationship (optional)"
									placeholderTextColor={COLORS.textMuted}
									style={[styles.input, { color: colors.text }]}
									selectionColor={COLORS.brandPrimary}
								/>
							</View>
							<Text style={[styles.inputLabel, { color: colors.textMuted }]}>Phone</Text>
							<View
								style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
							>
								<Ionicons name="call" size={18} color={COLORS.textMuted} />
								<TextInput
									value={phone}
									onChangeText={(t) => {
										setPhone(t);
										if (error) setError(null);
									}}
									placeholder="Phone"
									placeholderTextColor={COLORS.textMuted}
									style={[styles.input, { color: colors.text }]}
									selectionColor={COLORS.brandPrimary}
									keyboardType="phone-pad"
								/>
							</View>
							<Text style={[styles.inputLabel, { color: colors.textMuted }]}>Email</Text>
							<View
								style={[styles.inputRow, { backgroundColor: colors.inputBg }]}
							>
								<Ionicons name="mail" size={18} color={COLORS.textMuted} />
								<TextInput
									value={email}
									onChangeText={(t) => {
										setEmail(t);
										if (error) setError(null);
									}}
									placeholder="Email"
									placeholderTextColor={COLORS.textMuted}
									style={[styles.input, { color: colors.text }]}
									selectionColor={COLORS.brandPrimary}
									keyboardType="email-address"
									autoCapitalize="none"
								/>
							</View>
						</Animated.View>

						<Pressable
							onPress={handleSave}
							disabled={!canSave || isSaving}
							style={({ pressed }) => [
								styles.saveButton,
								{
									backgroundColor:
										canSave && !isSaving ? COLORS.brandPrimary : colors.inputBg,
									opacity: pressed ? 0.92 : 1,
								},
							]}
						>
							{isSaving ? (
								<ActivityIndicator color="#FFFFFF" />
							) : (
								<Ionicons name="checkmark" size={18} color="#FFFFFF" />
							)}
							<Text style={styles.saveButtonText}>
								{editingId ? "Save" : "Add"}
							</Text>
						</Pressable>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
	content: { flexGrow: 1, padding: 20, gap: 12 },
	card: {
		borderRadius: 36,
		padding: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.03,
		shadowRadius: 10,
	},
	title: {
		fontSize: 22,
		fontWeight: "900",
		letterSpacing: -1.0,
	},
	subtitle: {
		marginTop: 8,
		fontSize: 14,
		lineHeight: 20,
		fontWeight: "500",
	},
	addCard: {
		height: 56,
		borderRadius: 24,
		paddingHorizontal: 12,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 10,
	},
	addText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 16,
		letterSpacing: -0.5,
	},
	contactCard: {
		borderRadius: 36,
		padding: 20,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
	},
	contactName: { fontSize: 19, fontWeight: "900", letterSpacing: -1.0 },
	contactMeta: { marginTop: 4, fontSize: 13, fontWeight: "500" },
	modalBackdrop: {
		flex: 1,
		justifyContent: "flex-end",
		backgroundColor: "rgba(0,0,0,0.55)",
	},
	modalBackdropPressable: { ...StyleSheet.absoluteFillObject },
	modalCard: { 
		borderTopLeftRadius: 48,
		borderTopRightRadius: 48, 
		padding: 24,
		maxHeight: '90%',
	},
	modalHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		marginBottom: 20,
	},
	modalTitle: { fontSize: 24, fontWeight: "900", letterSpacing: -1.0 },
	errorRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		marginBottom: 10,
	},
	errorText: { fontSize: 13, fontWeight: "700", flex: 1 },
	inputRow: {
		height: 60,
		borderRadius: 24,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		marginBottom: 10,
	},
	input: { flex: 1, fontSize: 16, fontWeight: "900", letterSpacing: -0.5 },
	saveButton: {
		height: 60,
		borderRadius: 24,
		alignItems: "center",
		justifyContent: "center",
		flexDirection: "row",
		gap: 10,
		marginTop: 10,
	},
	saveButtonText: {
		color: "#FFFFFF",
		fontWeight: "900",
		fontSize: 16,
		letterSpacing: -0.5,
	},
});
