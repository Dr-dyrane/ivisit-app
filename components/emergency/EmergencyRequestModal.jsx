import React from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import { AMBULANCE_TYPES } from "../../constants/emergency";

import { useEmergencyRequestLogic } from "../../hooks/emergency/useEmergencyRequestLogic";

import AmbulanceTypeCard from "./requestModal/AmbulanceTypeCard";
import EmergencyRequestModalDispatched from "./requestModal/EmergencyRequestModalDispatched";
import InfoTile from "./requestModal/InfoTile";
import BedBookingOptions from "./requestModal/BedBookingOptions";

/**
 * 💡 STABILITY NOTE:
 * This component is wrapped in React.memo and uses `useFABActions()` instead of `useFAB()`.
 * 
 * WHY: This component is at the epicenter of the FAB registration cycle. Using useFABActions 
 * ensures it doesn't re-render when the FAB state changes, breaking the infinite update cycle.
 */
const EmergencyRequestModal = React.memo((props) => {
    const {
        mode = "emergency",
        showClose = true,
        onScroll,
        scrollContentStyle,
    } = props;

    const { state, actions } = useEmergencyRequestLogic(props);
    const {
        requestStep,
        selectedAmbulanceType,
        bedType,
        bedCount,
        requestData,
        errorMessage,
        hasAmbulances,
        requestColors,
        isDarkMode,
        hospitalName,
        availableBeds,
        waitTime
    } = state;

    return (
        <View style={styles.container}>
            {showClose ? (
                <Pressable
                    onPress={actions.handleRequestDone}
                    style={[
                        styles.closeButton,
                        {
                            backgroundColor: isDarkMode
                                ? "rgba(255,255,255,0.1)"
                                : "rgba(0,0,0,0.05)",
                        },
                    ]}
                    hitSlop={16}
                >
                    <Ionicons
                        name="close"
                        size={24}
                        color={isDarkMode ? COLORS.textLight : COLORS.textPrimary}
                    />
                </Pressable>
            ) : null}

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.requestScrollContent, scrollContentStyle]}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onScroll={onScroll}
                scrollEventThrottle={16}
            >
                {requestStep === "select" ? (
                    <>
                        {errorMessage ? (
                            <View
                                style={[
                                    styles.banner,
                                    {
                                        backgroundColor: isDarkMode
                                            ? "rgba(239, 68, 68, 0.16)"
                                            : "rgba(239, 68, 68, 0.10)",
                                        borderColor: isDarkMode
                                            ? "rgba(239, 68, 68, 0.35)"
                                            : "rgba(239, 68, 68, 0.25)",
                                    },
                                ]}
                            >
                                <Text style={{ color: requestColors.text, fontWeight: "700" }}>
                                    {errorMessage}
                                </Text>
                            </View>
                        ) : null}
                        <Text
                            style={{
                                fontSize: 12,
                                fontWeight: "900",
                                letterSpacing: 1.6,
                                color: requestColors.text,
                                marginTop: 18,
                                marginBottom: 14,
                                textTransform: "uppercase",
                            }}
                        >
                            {mode === "booking"
                                ? "Reservation details"
                                : "Select ambulance type"}
                        </Text>

                        {mode === "booking" ? (
                            <>
                                <View style={styles.infoGrid}>
                                    <InfoTile
                                        label="Hospital"
                                        value={hospitalName}
                                        textColor={requestColors.text}
                                        mutedColor={requestColors.textMuted}
                                        cardColor={requestColors.card}
                                        icon="business-outline"
                                    />
                                    <InfoTile
                                        label="Specialty"
                                        value={props.selectedSpecialty ?? "Any"}
                                        textColor={requestColors.text}
                                        mutedColor={requestColors.textMuted}
                                        cardColor={requestColors.card}
                                        icon="medical-outline"
                                    />
                                    <InfoTile
                                        label="Available"
                                        value={
                                            Number.isFinite(availableBeds)
                                                ? `${availableBeds} beds`
                                                : "--"
                                        }
                                        textColor={requestColors.text}
                                        mutedColor={requestColors.textMuted}
                                        cardColor={requestColors.card}
                                        icon="bed-outline"
                                    />
                                    <InfoTile
                                        label="Est. wait"
                                        value={waitTime ?? "--"}
                                        textColor={requestColors.text}
                                        mutedColor={requestColors.textMuted}
                                        cardColor={requestColors.card}
                                        valueColor={COLORS.brandPrimary}
                                        icon="time-outline"
                                    />
                                </View>

                                <BedBookingOptions
                                    bedType={bedType}
                                    bedCount={bedCount}
                                    onBedTypeChange={actions.setBedType}
                                    onBedCountChange={actions.setBedCount}
                                    textColor={requestColors.text}
                                    mutedColor={requestColors.textMuted}
                                    cardColor={requestColors.card}
                                />
                            </>
                        ) : !hasAmbulances ? (
                            <View style={styles.fallbackContainer}>
                                <View style={[styles.banner, {
                                    borderColor: COLORS.warning,
                                    backgroundColor: isDarkMode ? 'rgba(245, 158, 11, 0.1)' : 'rgba(245, 158, 11, 0.05)',
                                    alignItems: 'center',
                                    paddingVertical: 16
                                }]}>
                                    <Ionicons name="alert-circle" size={32} color={COLORS.warning} style={{ marginBottom: 8 }} />
                                    <Text style={{
                                        fontSize: 16,
                                        fontWeight: "700",
                                        color: requestColors.text,
                                        textAlign: 'center',
                                        marginBottom: 4
                                    }}>
                                        No Ambulances Available
                                    </Text>
                                    <Text style={{
                                        fontSize: 14,
                                        color: requestColors.textMuted,
                                        textAlign: 'center',
                                        lineHeight: 20
                                    }}>
                                        This hospital has no ambulances stationed.{'\n'}Please call directly for assistance.
                                    </Text>
                                </View>

                                <Pressable
                                    style={({ pressed }) => ({
                                        backgroundColor: COLORS.success,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        paddingVertical: 16,
                                        borderRadius: 12,
                                        marginTop: 16,
                                        gap: 8,
                                        opacity: pressed ? 0.9 : 1,
                                        transform: [{ scale: pressed ? 0.98 : 1 }]
                                    })}
                                    onPress={actions.handleCallHospital}
                                >
                                    <Ionicons name="call" size={20} color="#FFF" />
                                    <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Call Hospital</Text>
                                </Pressable>
                            </View>
                        ) : (
                            <View style={styles.ambulanceSelectionContainer}>
                                {AMBULANCE_TYPES.map((type) => (
                                    <AmbulanceTypeCard
                                        key={type.id}
                                        type={type}
                                        selected={selectedAmbulanceType?.id === type.id}
                                        onPress={() => actions.setSelectedAmbulanceType(type)}
                                        textColor={requestColors.text}
                                        mutedColor={requestColors.textMuted}
                                        cardColor={requestColors.card}
                                        style={styles.ambulanceCard}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                ) : (
                    <>
                        <EmergencyRequestModalDispatched
                            requestData={requestData}
                            textColor={requestColors.text}
                            mutedColor={requestColors.textMuted}
                            cardColor={requestColors.card}
                        />
                    </>
                )}
            </ScrollView>
        </View>
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    closeButton: {
        position: "absolute",
        top: 10,
        right: 12,
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
    },
    requestScrollContent: {
        paddingHorizontal: 8,
        paddingTop: 12,
        paddingBottom: 120,
    },
    infoGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 8,
    },
    ambulanceSelectionContainer: {
        width: "100%",
        gap: 12,
        marginTop: 8,
    },
    ambulanceCard: {
        marginBottom: 8,
    },
    banner: {
        width: "100%",
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginTop: 12,
        marginBottom: 6,
    },
    fallbackContainer: {
        width: '100%',
        paddingVertical: 20,
        paddingHorizontal: 4,
    },
});

EmergencyRequestModal.displayName = "EmergencyRequestModal";

export default EmergencyRequestModal;
