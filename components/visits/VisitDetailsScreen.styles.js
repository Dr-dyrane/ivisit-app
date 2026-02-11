import { StyleSheet } from "react-native";
import { STACK_TOP_PADDING } from "../../constants/layout";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
	content: {
		paddingTop: STACK_TOP_PADDING,
		paddingHorizontal: 20,
        paddingBottom: 120
	},
	heroSection: {
		height: 240,
		width: '100%',
		borderRadius: 36,
		overflow: 'hidden',
		marginBottom: 24,
		position: 'relative',
	},
	heroImage: {
		width: '100%',
		height: '100%'
	},
	floatingBadge: {
		position: 'absolute',
		top: 16,
		right: 16,
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 14,
		shadowColor: "#000",
		shadowOpacity: 0.2,
		shadowRadius: 10,
	},
	statusText: {
		color: '#FFF',
		fontSize: 11,
		fontWeight: '900',
		letterSpacing: 1
	},
	titleSection: {
		marginBottom: 24,
		paddingHorizontal: 4,
	},
	hospitalName: {
		fontSize: 32,
		fontWeight: '900',
		letterSpacing: -1,
		lineHeight: 38,
	},
	typeTag: {
		marginTop: 8,
	},
	typeText: {
		fontSize: 15,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},
	identityWidget: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 20,
		borderRadius: 32,
		marginBottom: 16,
	},
	squircleAvatar: {
		width: 56,
		height: 56,
		borderRadius: 18,
		alignItems: 'center',
		justifyContent: 'center',
	},
	initials: {
		fontSize: 18,
		fontWeight: '900',
	},
	doctorInfo: {
		flex: 1,
		marginLeft: 16,
	},
	label: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
		marginBottom: 4,
	},
	value: {
		fontSize: 17,
		fontWeight: '900',
	},
	roomPill: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
	},
	roomText: {
		fontSize: 12,
		fontWeight: '800',
	},
	gridContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16,
	},
	dataSquare: {
		flex: 1,
		padding: 20,
		borderRadius: 32,
		alignItems: 'flex-start',
	},
	gridLabel: {
		fontSize: 10,
		fontWeight: '800',
		letterSpacing: 1,
		marginTop: 12,
		marginBottom: 4,
	},
	gridValue: {
		fontSize: 16,
		fontWeight: '900',
	},
	actionsContainer: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 24,
	},
	actionBtn: {
		flex: 1,
		height: 60,
		borderRadius: 24, // Manifesto: Card-in-Card
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	actionBtnText: {
		fontSize: 16,
		fontWeight: '900', // Manifesto: Action Text
		letterSpacing: 0.5,
	},
    actionBtnShadow: {
        shadowColor: COLORS.brandPrimary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
	prepSection: {
		padding: 24,
		borderRadius: 36, // Manifesto: Primary Artifact
	},
	widgetTitle: {
		fontSize: 12,
		fontWeight: '900',
		letterSpacing: 1.5,
		marginBottom: 16,
		textTransform: 'uppercase',
	},
	bulletRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
		gap: 12,
	},
	bullet: {
		width: 6,
		height: 6,
		borderRadius: 3,
	},
	bulletText: {
		fontSize: 15,
		fontWeight: '500',
		lineHeight: 22,
	},
	cancelButton: {
		marginTop: 32,
		height: 60,
		borderRadius: 24, // Manifesto: Card-in-Card
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 10,
	},
	cancelButtonText: {
		color: '#EF4444',
		fontSize: 16,
		fontWeight: '900',
		letterSpacing: 0.5,
	}
});
