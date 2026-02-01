import React, { memo } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Marker } from './MapComponents';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";
import PulsingMarker from "./PulsingMarker";

const HospitalMarkers = ({
    hospitals,
    selectedHospitalId,
    onHospitalPress,
    shouldShowHospitalLabels,
    isDarkMode
}) => {
    // 🔴 REVERT POINT: Frame-based tracksViewChanges for Android
    // PREVIOUS: Hardcoded to false, which caused missing markers in some frames
    // NEW: Allow a few frames of rendering then freeze for performance
    // REVERT TO: Platform.OS === 'android' ? false : isSelected
    const [tracksViewChanges, setTracksViewChanges] = React.useState(true);

    React.useEffect(() => {
        if (Platform.OS === 'android') {
            const timer = setTimeout(() => {
                setTracksViewChanges(false);
            }, 1000); // 1s is plenty for markers to mount
            return () => clearTimeout(timer);
        }
    }, [hospitals?.length]); // Reset when list changes

    if (!hospitals || hospitals.length === 0) return null;

    // 🔴 REVERT POINT: Focus Mode (Hide other markers)
    // PREVIOUS: Showed all hospitals regardless of selection
    // NEW: Only render the selected hospital if a selection exists
    // REVERT TO: hospitals.filter(...)
    const displayHospitals = selectedHospitalId
        ? hospitals.filter(h => h.id === selectedHospitalId)
        : hospitals;

    return displayHospitals
        .filter((h) => h?.coordinates?.latitude && h?.coordinates?.longitude && h?.id)
        .map((hospital) => {
            const isSelected = selectedHospitalId === hospital.id;

            return (
                <Marker
                    key={hospital.id}
                    coordinate={hospital.coordinates}
                    onPress={() => onHospitalPress(hospital)}
                    anchor={{ x: 0.5, y: 1 }}
                    centerOffset={{ x: 0, y: -16 }}
                    // 🔴 REVERT POINT: Persistent Pulse on Android
                    // PREVIOUS: tracksViewChanges froze for all markers after 1s
                    // NEW: Keep tracksViewChanges=true for selected marker so pulse animation works
                    // REVERT TO: Platform.OS === 'android' ? tracksViewChanges : isSelected
                    tracksViewChanges={Platform.OS === 'android'
                        ? (isSelected ? true : tracksViewChanges)
                        : isSelected
                    }
                    zIndex={isSelected ? 100 : 1}
                >
                    <PulsingMarker isSelected={isSelected}>
                        <View
                            style={[
                                styles.hospitalMarker,
                                isSelected && styles.hospitalMarkerSelected,
                            ]}
                        >
                            <View style={styles.hospitalMarkerRow}>
                                <Ionicons
                                    name="location"
                                    size={isSelected ? 42 : 32}
                                    color={
                                        isSelected ? COLORS.brandPrimary : "#EF4444"
                                    }
                                    style={{
                                        shadowColor: "#000",
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.25,
                                        shadowRadius: 4,
                                    }}
                                />
                            </View>
                            {/* Inner Medical Icon */}
                            <View
                                style={{
                                    position: "absolute",
                                    top: isSelected ? 8 : 6,
                                    width: isSelected ? 16 : 12,
                                    height: isSelected ? 16 : 12,
                                    borderRadius: isSelected ? 8 : 6,
                                    backgroundColor: "#FFFFFF",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    zIndex: 2,
                                }}
                            >
                                <Ionicons
                                    name="medical"
                                    size={isSelected ? 10 : 8}
                                    color={
                                        isSelected
                                            ? COLORS.brandPrimary
                                            : "#EF4444"
                                    }
                                />
                            </View>
                        </View>
                    </PulsingMarker>
                </Marker>
            );
        });
};

const styles = StyleSheet.create({
    hospitalMarker: {
        alignItems: "center",
        justifyContent: "center",
    },
    hospitalMarkerSelected: {
        transform: [{ scale: 1.1 }],
    },
    hospitalMarkerRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    hospitalLabelPill: {
        marginLeft: 6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        maxWidth: 140,
    },
    hospitalLabelText: {
        fontSize: 9,
        fontWeight: "600",
    },
});

export default memo(HospitalMarkers);
