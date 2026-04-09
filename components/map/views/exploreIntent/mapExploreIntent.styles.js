import { StyleSheet } from "react-native";

export default StyleSheet.create({
	topRow: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
		marginBottom: 24,
		paddingHorizontal: 18,
	},
	topRowCollapsed: {
		marginBottom: 0,
	},
	topRowWebMobile: {
		paddingHorizontal: 14,
		gap: 10,
		marginBottom: 18,
	},
	topRowWebMobileMd: {
		paddingHorizontal: 18,
		gap: 12,
		marginBottom: 20,
	},
	topRowCentered: {
		width: "100%",
		alignSelf: "center",
	},
	topRowModal: {
		marginBottom: 20,
	},
	topRowPanel: {
		marginBottom: 22,
	},
	searchPill: {
		flex: 1,
		minHeight: 52,
		paddingHorizontal: 16,
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	searchPillCollapsed: {
		minHeight: 44,
		paddingHorizontal: 14,
	},
	searchPillWebMobile: {
		minHeight: 48,
	},
	searchText: {
		fontSize: 18,
		lineHeight: 24,
		fontWeight: "700",
	},
	bodyScrollContent: {
		paddingBottom: 6,
	},
	bodyScrollContentWebMobile: {
		paddingBottom: 12,
	},
	bodyScrollContentModal: {
		paddingBottom: 16,
	},
	bodyScrollContentPanel: {
		paddingBottom: 22,
	},
	contentSectionInset: {
		paddingHorizontal: 18,
	},
	contentSectionInsetWebMobile: {
		paddingHorizontal: 14,
	},
	contentSectionInsetWebMobileMd: {
		paddingHorizontal: 18,
	},
	contentSectionCentered: {
		width: "100%",
		alignSelf: "center",
	},
	screenPanelRow: {
		width: "100%",
		alignSelf: "center",
		flexDirection: "row",
		alignItems: "stretch",
		gap: 14,
		marginBottom: 4,
	},
	screenPanelItem: {
		flex: 1,
		minWidth: 0,
		paddingHorizontal: 0,
	},
	avatarPressable: {
		width: 44,
		height: 44,
		position: "relative",
		alignItems: "center",
		justifyContent: "center",
	},
	avatarPressableCollapsed: {
		width: 40,
		height: 40,
	},
	avatarImageShell: {
		width: 42,
		height: 42,
		borderRadius: 999,
		overflow: "hidden",
	},
	avatarImageShellCollapsed: {
		width: 38,
		height: 38,
		borderRadius: 999,
	},
	avatarImage: {
		width: "100%",
		height: "100%",
		borderRadius: 999,
	},
	avatarImageCollapsed: {
		borderRadius: 999,
	},
	avatarDot: {
		position: "absolute",
		bottom: 2,
		right: 1,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: "#10B981",
		borderWidth: 2,
		borderColor: "#FFFFFF",
	},
	avatarDotCollapsed: {
		bottom: 1,
		right: 0,
		width: 10,
		height: 10,
		borderRadius: 5,
	},
	hospitalCard: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		marginBottom: 28,
	},
	hospitalCardCentered: {
		width: "100%",
		alignSelf: "center",
	},
	intentStatusCard: {
		paddingHorizontal: 14,
		paddingVertical: 14,
		gap: 12,
		marginBottom: 22,
	},
	intentStatusCardWebMobile: {
		alignSelf: "center",
		width: "100%",
		maxWidth: 560,
	},
	intentStatusHeader: {
		flexDirection: "row",
		alignItems: "center",
		gap: 12,
	},
	intentStatusIconWrap: {
		width: 44,
		height: 44,
		alignItems: "center",
		justifyContent: "center",
	},
	intentStatusCopy: {
		flex: 1,
	},
	intentStatusTitle: {
		marginTop: 4,
		fontSize: 17,
		lineHeight: 21,
		fontWeight: "800",
	},
	intentStatusMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "500",
	},
	intentStatusChevron: {
		width: 30,
		height: 30,
		borderRadius: 15,
		alignItems: "center",
		justifyContent: "center",
	},
	intentSignalRow: {
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 8,
	},
	intentSignalPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 999,
	},
	intentSignalText: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
	},
	hospitalIconWrap: {
		width: 42,
		height: 42,
		alignItems: "center",
		justifyContent: "center",
	},
	hospitalCardCopy: {
		flex: 1,
	},
	hospitalEyebrow: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		letterSpacing: 0.8,
		textTransform: "uppercase",
	},
	hospitalTitle: {
		marginTop: 4,
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	hospitalMeta: {
		marginTop: 4,
		fontSize: 14,
		lineHeight: 18,
		fontWeight: "400",
	},
	sectionTrigger: {
		flexDirection: "row",
		alignItems: "center",
		gap: 6,
		alignSelf: "flex-start",
		marginBottom: 24,
	},
	sectionTriggerPressed: {
		opacity: 0.78,
	},
	sectionLabel: {
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
	},
	intentSectionHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		gap: 10,
		marginBottom: 16,
	},
	intentSectionMeta: {
		fontSize: 11,
		lineHeight: 14,
		fontWeight: "700",
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	careRow: {
		flexDirection: "row",
		alignItems: "flex-start",
		justifyContent: "space-between",
		gap: 10,
	},
	careAction: {
		flex: 1,
		alignItems: "center",
		justifyContent: "flex-start",
		paddingVertical: 2,
		paddingHorizontal: 1,
	},
	careActionPressed: {
		opacity: 0.88,
	},
	careIconWrap: {
		width: 88,
		height: 88,
		borderRadius: 44,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 10,
	},
	careLabel: {
		fontSize: 15,
		lineHeight: 20,
		fontWeight: "800",
		textAlign: "center",
	},
	careSubtext: {
		marginTop: 3,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
	},
	intentActionStack: {
		gap: 10,
	},
	intentActionRow: {
		flexDirection: "row",
		gap: 10,
	},
	intentPanelGrid: {
		flexDirection: "row",
		alignItems: "stretch",
		gap: 12,
	},
	intentPanelPrimary: {
		flex: 1.1,
	},
	intentPanelSecondaryColumn: {
		flex: 0.9,
		gap: 10,
	},
	intentCardPressable: {
		flex: 1,
	},
	intentCardPressed: {
		opacity: 0.92,
		transform: [{ scale: 0.985 }],
	},
	intentCardSurface: {
		borderRadius: 22,
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	intentCardSurfacePrimary: {
		minHeight: 108,
	},
	intentCardSurfaceSecondary: {
		minHeight: 94,
	},
	intentCardHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	intentCardIconWrap: {
		width: 42,
		height: 42,
		borderRadius: 14,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.14)",
	},
	intentCardCheckBadge: {
		width: 22,
		height: 22,
		borderRadius: 11,
		alignItems: "center",
		justifyContent: "center",
		backgroundColor: "rgba(255,255,255,0.18)",
	},
	intentCardLabel: {
		marginTop: 14,
		fontSize: 16,
		lineHeight: 20,
		fontWeight: "800",
		color: "#FFFFFF",
	},
	intentCardSubtext: {
		marginTop: 4,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		color: "rgba(255,255,255,0.84)",
	},
	expandedSection: {
		marginTop: 32,
	},
	featuredRailViewport: {
		marginHorizontal: 0,
		overflow: "hidden",
	},
	featuredScrollContent: {
		paddingLeft: 24,
		paddingRight: 24,
		gap: 10,
	},
	featuredCard: {
		width: 212,
		height: 288,
		borderRadius: 30,
		overflow: "hidden",
	},
	featuredCardImage: {
		flex: 1,
		justifyContent: "flex-end",
	},
	featuredCardImageStyle: {
		borderRadius: 30,
	},
	featuredCardContent: {
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	featuredTitle: {
		fontSize: 18,
		lineHeight: 22,
		fontWeight: "800",
	},
	featuredMeta: {
		marginTop: 4,
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "400",
	},
	placeholderCard: {
		backgroundColor: "rgba(255,255,255,0.03)",
	},
	placeholderCardInner: {
		flex: 1,
		borderRadius: 28,
	},
	placeholderCopy: {
		flex: 1,
		justifyContent: "flex-end",
		paddingHorizontal: 14,
		paddingVertical: 14,
	},
	placeholderTitleBlock: {
		gap: 6,
	},
	placeholderTitleSkeleton: {
		height: 18,
		borderRadius: 999,
		backgroundColor: "rgba(248,250,252,0.22)",
		width: "86%",
	},
	placeholderTitleSkeletonShort: {
		width: "64%",
	},
	placeholderMetaSkeleton: {
		height: 12,
		borderRadius: 999,
		backgroundColor: "rgba(248,250,252,0.14)",
		width: "58%",
		marginTop: 10,
	},
	footerSlot: {
		width: "100%",
		alignItems: "center",
		justifyContent: "center",
		paddingTop: 6,
		paddingBottom: 2,
		paddingHorizontal: 18,
	},
	termsLink: {
		marginTop: 2,
		alignSelf: "center",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 2,
	},
	termsText: {
		fontSize: 12,
		lineHeight: 16,
		fontWeight: "400",
		textAlign: "center",
	},
});
