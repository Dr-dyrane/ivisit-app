import { StyleSheet, Platform } from "react-native";
import { COLORS } from "../../constants/colors";
import { STACK_TOP_PADDING } from "../../constants/layout";

export const styles = StyleSheet.create({
	container: { flex: 1 },
	
	// Introduction / Passport Header
	headerContainer: {
		marginBottom: 24,
	},
	headerSubtitle: {
		fontSize: 14,
		fontWeight: "700",
		letterSpacing: 1.5,
		marginBottom: 4,
		textTransform: 'uppercase'
	},
	headerTitle: {
		fontSize: 28,
		fontWeight: "900",
		letterSpacing: -1,
		lineHeight: 34,
	},
	
	// Empty State
	emptyStateContainer: {
		padding: 24,
		alignItems: 'center',
		borderRadius: 24,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 10 },
		shadowRadius: 20,
		elevation: 5,
	},
	emptyStateIconContainer: { 
		width: 64, 
		height: 64, 
		borderRadius: 32, 
		alignItems: 'center', 
		justifyContent: 'center',
		marginBottom: 16
	},
	emptyStateTitle: { 
		fontSize: 16, 
		fontWeight: '700', 
		marginBottom: 8 
	},
	emptyStateText: { 
		fontSize: 14, 
		textAlign: 'center', 
		lineHeight: 20, 
		maxWidth: '80%' 
	},
	
	// Ticket List
	ticketsContainer: {
		marginBottom: 32,
	},
	loadingContainer: { 
		padding: 20, 
		alignItems: 'center' 
	},
	loadingText: { 
		fontSize: 13, 
		fontWeight: '600' 
	},
	ticketsGap: { 
		gap: 16 
	},
	
	// Ticket Card
	ticketCard: {
		borderRadius: 24,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 8 },
		shadowRadius: 16,
		elevation: 4,
	},
	ticketHeader: { 
		flexDirection: 'row', 
		justifyContent: 'space-between', 
		marginBottom: 12 
	},
	ticketStatusBadge: { 
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 12,
	},
	ticketStatusText: { 
		fontSize: 11, 
		fontWeight: '800', 
		letterSpacing: 0.5 
	},
	ticketDate: { 
		fontSize: 12, 
		fontWeight: '600' 
	},
	ticketSubject: { 
		fontSize: 17, 
		fontWeight: '800', 
		marginBottom: 6, 
		letterSpacing: -0.3 
	},
	ticketMessage: { 
		fontSize: 15, 
		lineHeight: 22 
	},
	
	// Admin Response
	responseContainer: { 
		marginTop: 16, 
		paddingTop: 16, 
		borderTopWidth: 1, 
	},
	responseHeader: { 
		flexDirection: 'row', 
		alignItems: 'center', 
		marginBottom: 8 
	},
	responseLabel: { 
		marginLeft: 8, 
		fontSize: 12, 
		fontWeight: '800', 
		color: COLORS.brandPrimary, 
		letterSpacing: 1 
	},
	responseText: { 
		fontSize: 15, 
		lineHeight: 22 
	},
	
	// FAQ Section
	faqSectionTitle: {
		fontSize: 20,
		fontWeight: "900",
		letterSpacing: -0.5,
		marginBottom: 20,
		marginLeft: 4,
	},
	faqList: { 
		gap: 12 
	},
	
	// FAQ Item
	faqCard: {
		borderRadius: 24,
		padding: 20,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowRadius: 12,
		elevation: 2,
	},
	faqHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	faqQuestionContainer: { 
		flex: 1, 
		paddingRight: 16 
	},
	faqQuestion: {
		fontSize: 16,
		fontWeight: "700",
		letterSpacing: -0.2,
		lineHeight: 22,
	},
	faqIconContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center'
	},
	faqAnswer: {
		marginTop: 16,
		fontSize: 15,
		lineHeight: 24,
	},
	faqCategoryContainer: { 
		marginTop: 12, 
		alignSelf: 'flex-start' 
	},
	faqCategory: { 
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
	},
	
	// Modal
	modalContentGap: { 
		gap: 20 
	},
	messageInputContainer: {
		borderRadius: 24,
		padding: 16,
	},
	messageInputLabel: {
		fontSize: 11,
		fontWeight: "800",
		letterSpacing: 2,
		marginBottom: 12,
		textTransform: 'uppercase'
	},
	messageInput: {
		minHeight: 120,
		fontSize: 16,
		fontWeight: "500",
		lineHeight: 24,
		textAlignVertical: 'top'
	}
});
