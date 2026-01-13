"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
	View,
	Text,
	ScrollView,
	StyleSheet,
	Platform,
	Animated,
	Pressable,
	TextInput,
	TouchableOpacity,
	Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../contexts/ThemeContext";
import { useHeaderState } from "../contexts/HeaderStateContext";
import { useTabBarVisibility } from "../contexts/TabBarVisibilityContext";
import { useScrollAwareHeader } from "../contexts/ScrollAwareHeaderContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../constants/colors";
import { STACK_TOP_PADDING } from "../constants/layout";
import HeaderBackButton from "../components/navigation/HeaderBackButton";
import { useHelpSupport } from "../contexts/HelpSupportContext";
import { useFAB } from "../contexts/FABContext";
import * as Haptics from "expo-haptics";
import InputModal from "../components/ui/InputModal";
import ProfileField from "../components/form/ProfileField";
import { format } from "date-fns";

export default function HelpSupportScreen() {
	const { isDarkMode } = useTheme();
	const insets = useSafeAreaInsets();
	const { ticketId } = useLocalSearchParams();
	const { setHeaderState } = useHeaderState();
	const { registerFAB, unregisterFAB } = useFAB();
	const { handleScroll: handleTabBarScroll, resetTabBar } =
		useTabBarVisibility();
	const { handleScroll: handleHeaderScroll, resetHeader } =
		useScrollAwareHeader();
	const { faqs, tickets, loading, submitTicket, refresh } = useHelpSupport();
	
	const [expandedFaq, setExpandedFaq] = useState({});
	const [expandedTicket, setExpandedTicket] = useState({});
	const [isModalVisible, setIsModalVisible] = useState(false);
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);

	const backButton = useCallback(() => <HeaderBackButton />, []);

	const openCreateTicket = useCallback(() => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		setIsModalVisible(true);
	}, []);

	useFocusEffect(
		useCallback(() => {
			resetTabBar();
			resetHeader();
			setHeaderState({
				title: "Help & Support",
				subtitle: "CONCIERGE",
				icon: <Ionicons name="help-buoy" size={26} color="#FFFFFF" />,
				backgroundColor: COLORS.brandPrimary,
				leftComponent: backButton(),
				rightComponent: null,
			});
			refresh();

			// Register Global FAB for creating tickets
			registerFAB('support-add-ticket', {
				icon: 'add',
				label: 'New Ticket',
				subText: 'Start a support request',
				visible: true,
				onPress: openCreateTicket,
				style: 'primary',
				haptic: 'medium',
				priority: 10,
				animation: 'prominent',
				allowInStack: true,
			});

			return () => {
				unregisterFAB('support-add-ticket');
			};
		}, [backButton, resetHeader, resetTabBar, setHeaderState, registerFAB, unregisterFAB, openCreateTicket])
	);

	const fadeAnim = useRef(new Animated.Value(0)).current;
	const slideAnim = useRef(new Animated.Value(30)).current;

	// Auto-expand ticket from notification
	useEffect(() => {
		if (ticketId && tickets.length > 0) {
			// Small delay to allow render
			const timer = setTimeout(() => {
				setExpandedTicket(prev => ({ ...prev, [ticketId]: true }));
			}, 300);
			return () => clearTimeout(timer);
		}
	}, [ticketId, tickets]);

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

	const handleSubmitTicket = async () => {
		if (!subject.trim() || !message.trim()) return;
		
		setIsSubmitting(true);
		try {
			await submitTicket({ subject: subject.trim(), message: message.trim() });
			setSubject("");
			setMessage("");
			setIsModalVisible(false);
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (error) {
			Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
		} finally {
			setIsSubmitting(false);
		}
	};

	const backgroundColors = isDarkMode
		? ["#121826", "#0B0F1A", "#121826"]
		: ["#FFFFFF", "#F8FAFC", "#FFFFFF"];

	const colors = {
		text: isDarkMode ? "#FFFFFF" : "#0F172A",
		textMuted: isDarkMode ? "#94A3B8" : "#64748B",
		card: isDarkMode ? "#1E293B" : "#FFFFFF",
		inputBg: isDarkMode ? "#0F172A" : "#F1F5F9",
		accent: COLORS.brandPrimary,
		highlight: isDarkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
	};

	const tabBarHeight = Platform.OS === "ios" ? 85 + insets.bottom : 70;
	const bottomPadding = tabBarHeight + 80; // Extra padding for FAB
	const topPadding = STACK_TOP_PADDING;

	const getStatusColor = (status) => {
		switch (status?.toLowerCase()) {
			case 'open': return COLORS.brandPrimary;
			case 'resolved': return '#10B981'; // green
			case 'closed': return '#64748B'; // slate
			default: return '#F59E0B'; // amber
		}
	};

	return (
		<LinearGradient colors={backgroundColors} style={{ flex: 1 }}>
			<ScrollView
				contentContainerStyle={{
					paddingTop: topPadding,
					paddingBottom: bottomPadding,
					paddingHorizontal: 16,
				}}
				showsVerticalScrollIndicator={false}
				scrollEventThrottle={16}
				onScroll={handleScroll}
			>
				{/* Introduction / Passport Header */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						marginBottom: 24,
					}}
				>
					<Text
						style={{
							fontSize: 14,
							fontWeight: "700",
							letterSpacing: 1.5,
							color: colors.textMuted,
							marginBottom: 4,
							textTransform: 'uppercase'
						}}
					>
						Concierge Desk
					</Text>
					<Text
						style={{
							fontSize: 28,
							fontWeight: "900",
							color: colors.text,
							letterSpacing: -1,
							lineHeight: 34,
						}}
					>
						How can we help?
					</Text>
				</Animated.View>

				{/* My Tickets List */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
						marginBottom: 32,
					}}
				>
					{loading && !tickets.length ? (
						<View style={{ padding: 20, alignItems: 'center' }}>
							<Text style={{ color: colors.textMuted, fontSize: 13, fontWeight: '600' }}>UPDATING RECORDS...</Text>
						</View>
					) : tickets.length === 0 ? (
						<View
							style={{
								padding: 24,
								alignItems: 'center',
								backgroundColor: colors.card,
								borderRadius: 24,
								shadowColor: "#000",
								shadowOffset: { width: 0, height: 10 },
								shadowOpacity: isDarkMode ? 0.2 : 0.05,
								shadowRadius: 20,
								elevation: 5,
							}}
						>
							<View style={{ 
								width: 64, 
								height: 64, 
								borderRadius: 32, 
								backgroundColor: colors.highlight,
								alignItems: 'center', 
								justifyContent: 'center',
								marginBottom: 16
							}}>
								<Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
							</View>
							<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 }}>
								Start a Conversation
							</Text>
							<Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', lineHeight: 20, maxWidth: '80%' }}>
								Tap the + button below to open a new support ticket. We're here 24/7.
							</Text>
						</View>
					) : (
						<View style={{ gap: 16 }}>
							{tickets.map((ticket) => {
								const isOpen = !!expandedTicket[ticket.id];
								return (
									<Pressable
										key={ticket.id}
										onPress={() => {
											Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
											setExpandedTicket(prev => ({ ...prev, [ticket.id]: !prev[ticket.id] }));
										}}
										style={({ pressed }) => ({
											transform: [{ scale: pressed ? 0.99 : 1 }],
										})}
									>
										<View
											style={{
												backgroundColor: colors.card,
												borderRadius: 24,
												padding: 20,
												shadowColor: "#000",
												shadowOffset: { width: 0, height: 8 },
												shadowOpacity: isDarkMode ? 0.2 : 0.04,
												shadowRadius: 16,
												elevation: 4,
											}}
										>
											<View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
												<View 
													style={{ 
														backgroundColor: getStatusColor(ticket.status) + '15',
														paddingHorizontal: 10,
														paddingVertical: 5,
														borderRadius: 12,
													}}
												>
													<Text style={{ color: getStatusColor(ticket.status), fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>
														{ticket.status?.toUpperCase() || 'OPEN'}
													</Text>
												</View>
												<Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
													{ticket.created_at ? format(new Date(ticket.created_at), 'MMM d') : 'Now'}
												</Text>
											</View>
											
											<Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: 6, letterSpacing: -0.3 }}>
												{ticket.subject}
											</Text>
											
											<Text 
												numberOfLines={isOpen ? undefined : 2} 
												style={{ fontSize: 15, color: colors.textMuted, lineHeight: 22 }}
											>
												{ticket.message}
											</Text>

											{isOpen && ticket.admin_response && (
												<View style={{ marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.highlight }}>
													<View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
														<Ionicons name="return-down-forward" size={16} color={COLORS.brandPrimary} />
														<Text style={{ marginLeft: 8, fontSize: 12, fontWeight: '800', color: COLORS.brandPrimary, letterSpacing: 1 }}>
															RESPONSE
														</Text>
													</View>
													<Text style={{ fontSize: 15, color: colors.text, lineHeight: 22 }}>
														{ticket.admin_response}
													</Text>
												</View>
											)}
										</View>
									</Pressable>
								);
							})}
						</View>
					)}
				</Animated.View>

				{/* FAQs Section */}
				<Animated.View
					style={{
						opacity: fadeAnim,
						transform: [{ translateY: slideAnim }],
					}}
				>
					<Text
						style={{
							fontSize: 20,
							fontWeight: "900",
							letterSpacing: -0.5,
							color: colors.text,
							marginBottom: 20,
							marginLeft: 4,
						}}
					>
						Common Questions
					</Text>

					<View style={{ gap: 12 }}>
						{(faqs || []).map((item) => {
							const isOpen = !!expandedFaq[item.id];
							return (
								<Pressable
									key={item.id}
									onPress={() => {
										Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
										setExpandedFaq((prev) => ({
											...prev,
											[item.id]: !prev[item.id],
										}));
									}}
									style={({ pressed }) => ({
										transform: [{ scale: pressed ? 0.99 : 1 }],
									})}
								>
									<View
										style={{
											backgroundColor: colors.card,
											borderRadius: 24,
											padding: 20,
											shadowColor: "#000",
											shadowOffset: { width: 0, height: 4 },
											shadowOpacity: isDarkMode ? 0.1 : 0.03,
											shadowRadius: 12,
											elevation: 2,
										}}
									>
										<View
											style={{
												flexDirection: "row",
												alignItems: "center",
												justifyContent: "space-between",
											}}
										>
											<View style={{ flex: 1, paddingRight: 16 }}>
												<Text
													style={{
														fontSize: 16,
														fontWeight: "700",
														letterSpacing: -0.2,
														color: colors.text,
														lineHeight: 22,
													}}
												>
													{item.question}
												</Text>
											</View>
											<View style={{
												width: 32,
												height: 32,
												borderRadius: 16,
												backgroundColor: isOpen ? COLORS.brandPrimary : colors.highlight,
												alignItems: 'center',
												justifyContent: 'center'
											}}>
												<Ionicons
													name={isOpen ? "remove" : "add"}
													size={20}
													color={isOpen ? "#FFFFFF" : colors.textMuted}
												/>
											</View>
										</View>
										{isOpen ? (
											<Animated.View>
												<Text
													style={{
														marginTop: 16,
														fontSize: 15,
														lineHeight: 24,
														color: colors.textMuted,
													}}
												>
													{item.answer}
												</Text>
												{item.category && (
													<View style={{ marginTop: 12, alignSelf: 'flex-start' }}>
														<Text style={{ 
															fontSize: 10, 
															fontWeight: '800', 
															color: COLORS.brandPrimary, 
															letterSpacing: 1.5,
															textTransform: 'uppercase',
															backgroundColor: COLORS.brandPrimary + '15',
															paddingHorizontal: 8,
															paddingVertical: 4,
															borderRadius: 8,
															overflow: 'hidden'
														}}>
															{item.category}
														</Text>
													</View>
												)}
											</Animated.View>
										) : null}
									</View>
								</Pressable>
							);
						})}
					</View>
				</Animated.View>
			</ScrollView>

			{/* Create Ticket Modal */}
			<InputModal
				visible={isModalVisible}
				onClose={() => setIsModalVisible(false)}
				title="New Ticket"
				primaryAction={handleSubmitTicket}
				primaryActionLabel={isSubmitting ? "Sending..." : "Submit Request"}
				secondaryAction={() => setIsModalVisible(false)}
				loading={isSubmitting}
				disabled={!subject.trim() || !message.trim()}
			>
				<View style={{ gap: 20 }}>
					<ProfileField
						label="Topic"
						value={subject}
						onChange={setSubject}
						iconName="chatbubbles-outline"
						placeholder="Briefly describe the issue"
					/>
					
					<View
						style={{
							backgroundColor: colors.inputBg,
							borderRadius: 24,
							padding: 16,
						}}
					>
						<Text
							style={{
								fontSize: 11,
								fontWeight: "800",
								letterSpacing: 2,
								color: colors.textMuted,
								marginBottom: 12,
								textTransform: 'uppercase'
							}}
						>
							Message
						</Text>
						<TextInput
							value={message}
							onChangeText={setMessage}
							multiline
							placeholder="Tell us more about what you need..."
							placeholderTextColor={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
							style={{
								minHeight: 120,
								color: colors.text,
								fontSize: 16,
								fontWeight: "500",
								lineHeight: 24,
								textAlignVertical: 'top'
							}}
							selectionColor={COLORS.brandPrimary}
						/>
					</View>
				</View>
			</InputModal>
		</LinearGradient>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1 },
});
