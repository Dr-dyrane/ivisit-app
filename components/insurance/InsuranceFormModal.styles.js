import { StyleSheet } from "react-native";
import { COLORS } from "../../constants/colors";

export const styles = StyleSheet.create({
    vitalTrack: {
        height: 4,
        backgroundColor: "rgba(0,0,0,0.05)",
        borderRadius: 2,
        marginBottom: 24,
        position: "relative",
    },
    vitalFill: {
        height: "100%",
        backgroundColor: COLORS.brandPrimary,
        borderRadius: 2,
    },
    vitalPlow: {
        position: "absolute",
        top: -4,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.brandPrimary,
        borderWidth: 3,
        borderColor: "#FFF",
        shadowColor: COLORS.brandPrimary,
        shadowOpacity: 0.5,
        shadowRadius: 5,
    },
    stepContainer: {
        justifyContent: "center",
    },
    validationText: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 4,
        marginLeft: 16
    },
    scanButton: {
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderWidth: 1,
        borderColor: COLORS.brandPrimary + '30',
    },
    scanButtonContent: {
        flex: 1
    },
    scanButtonTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2
    },
    scanButtonSubtitle: {
        fontSize: 12,
        lineHeight: 16
    },
    scanContainer: {
        marginTop: 24
    },
    stepGap: {
        gap: 16
    },
    stepGapLarge: {
        gap: 24
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center'
    },
    uploadRow: {
        flexDirection: 'row',
        gap: 16
    },
    uploadCard: {
        flex: 1,
        aspectRatio: 1,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        overflow: 'hidden',
        borderWidth: 1,
    },
    uploadImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover'
    },
    uploadPlaceholder: {
        alignItems: 'center',
        gap: 8
    },
    uploadLabel: {
        fontSize: 12,
        fontWeight: '700'
    }
});
