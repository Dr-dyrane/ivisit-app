import React, { Component } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../constants/colors";

class MapErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[MapErrorBoundary] caught error:', error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        if (this.props.onReset) this.props.onReset();
    };

    render() {
        if (this.state.hasError) {
            return (
                <View style={[styles.container, this.props.style]}>
                    <View style={styles.errorCard}>
                        <Ionicons name="map-outline" size={48} color={COLORS.brandPrimary} />
                        <Text style={styles.title}>Map Loading Error</Text>
                        <Text style={styles.message}>
                            We encountered an issue while loading the map layers.
                        </Text>
                        <Pressable
                            onPress={this.handleReset}
                            style={styles.button}
                        >
                            <Text style={styles.buttonText}>Try Reloading Map</Text>
                        </Pressable>
                    </View>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
    },
    errorCard: {
        backgroundColor: '#FFFFFF',
        padding: 32,
        borderRadius: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
        width: '80%',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A',
        marginTop: 16,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    button: {
        backgroundColor: COLORS.brandPrimary,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    buttonText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14,
    },
});

export default MapErrorBoundary;
