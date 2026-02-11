"use client";

import {
	View,
	Text,
	ScrollView,
	Animated,
	TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useHelpSupportScreenLogic } from "../hooks/support/useHelpSupportScreenLogic";
import { styles } from "../components/support/HelpSupportScreen.styles";
import { COLORS } from "../constants/colors";
import InputModal from "../components/ui/InputModal";
import ProfileField from "../components/form/ProfileField";
import { useCallback } from "react";

import TicketItem from "../components/support/TicketItem";
import FaqItem from "../components/support/FaqItem";

export default function HelpSupportScreen() {
	const { state, actions } = useHelpSupportScreenLogic();
	const {
		faqs,
		tickets,
		loading,
		expandedFaq,
		expandedTicket,
		isModalVisible,
		subject,
		message,
		isSubmitting,
		fadeAnim,
		slideAnim,
		backgroundColors,
		colors,
		topPadding,
		bottomPadding,
		isDarkMode,
	} = state;

	const {
		setSubject,
		setMessage,
		setIsModalVisible,
		handleSubmitTicket,
		openCreateTicket,
		toggleFaq,
		toggleTicket,
		handleScroll,
		resetTabBar,
		resetHeader,
		setHeaderState,
		refresh,
		registerFAB,
		unregisterFAB,
		backButton,
	} = actions;

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
		}, [backButton, resetHeader, resetTabBar, setHeaderState, registerFAB, unregisterFAB, openCreateTicket, refresh])
	);

	return (
		<LinearGradient colors={backgroundColors} style={styles.container}>
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
					style={[
						styles.headerContainer,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					<Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
						Concierge Desk
					</Text>
					<Text style={[styles.headerTitle, { color: colors.text }]}>
						How can we help?
					</Text>
				</Animated.View>

				{/* My Tickets List */}
				<Animated.View
					style={[
						styles.ticketsContainer,
						{
							opacity: fadeAnim,
							transform: [{ translateY: slideAnim }],
						},
					]}
				>
					{loading && !tickets.length ? (
						<View style={styles.loadingContainer}>
							<Text style={[styles.loadingText, { color: colors.textMuted }]}>UPDATING RECORDS...</Text>
						</View>
					) : tickets.length === 0 ? (
						<View
							style={[
								styles.emptyStateContainer,
								{
									backgroundColor: colors.card,
									shadowOpacity: isDarkMode ? 0.2 : 0.05,
								},
							]}
						>
							<View style={[styles.emptyStateIconContainer, { backgroundColor: colors.highlight }]}>
								<Ionicons name="chatbubbles-outline" size={32} color={colors.textMuted} />
							</View>
							<Text style={[styles.emptyStateTitle, { color: colors.text }]}>
								Start a Conversation
							</Text>
							<Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
								Tap the + button below to open a new support ticket. We're here 24/7.
							</Text>
						</View>
					) : (
						<View style={styles.ticketsGap}>
							{tickets.map((ticket) => (
                                <TicketItem 
                                    key={ticket.id}
                                    ticket={ticket}
                                    isExpanded={!!expandedTicket[ticket.id]}
                                    onToggle={toggleTicket}
                                    colors={colors}
                                    isDarkMode={isDarkMode}
                                />
							))}
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
					<Text style={[styles.faqSectionTitle, { color: colors.text }]}>
						Common Questions
					</Text>

					<View style={styles.faqList}>
						{(faqs || []).map((item) => (
                            <FaqItem
                                key={item.id}
                                item={item}
                                isExpanded={!!expandedFaq[item.id]}
                                onToggle={toggleFaq}
                                colors={colors}
                                isDarkMode={isDarkMode}
                            />
						))}
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
				<View style={styles.modalContentGap}>
					<ProfileField
						label="Topic"
						value={subject}
						onChange={setSubject}
						iconName="chatbubbles-outline"
						placeholder="Briefly describe the issue"
					/>
					
					<View
						style={[
							styles.messageInputContainer,
							{ backgroundColor: colors.inputBg }
						]}
					>
						<Text style={[styles.messageInputLabel, { color: colors.textMuted }]}>
							Message
						</Text>
						<TextInput
							value={message}
							onChangeText={setMessage}
							multiline
							placeholder="Tell us more about what you need..."
							placeholderTextColor={isDarkMode ? COLORS.textMutedDark : COLORS.textMuted}
							style={[styles.messageInput, { color: colors.text }]}
							selectionColor={COLORS.brandPrimary}
						/>
					</View>
				</View>
			</InputModal>
		</LinearGradient>
	);
}
