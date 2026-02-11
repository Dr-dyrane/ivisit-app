// screens/VisitsScreen.jsx - Your medical visits
"use client";

import React from "react";
import { StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVisitsScreenLogic } from "../hooks/visits/useVisitsScreenLogic";
import VisitsList from "../components/visits/VisitsList";

const VisitsScreen = () => {
    const { state, actions } = useVisitsScreenLogic();

    return (
        <LinearGradient colors={state.backgroundColors} style={styles.container}>
            <VisitsList
                // Data
                filteredVisits={state.filteredVisits}
                selectedVisitId={state.selectedVisitId}
                filter={state.filter}
                filters={state.filters}
                visitCounts={state.visitCounts}
                isLoading={state.isLoading}
                
                // Style/Layout
                colors={state.colors}
                isDarkMode={state.isDarkMode}
                topPadding={state.topPadding}
                bottomPadding={state.bottomPadding}
                fadeAnim={state.fadeAnim}
                
                // Actions
                onScroll={actions.handleScroll}
                onRefresh={actions.refreshVisits}
                onSelectFilter={actions.setFilterType}
                onSelectVisit={actions.handleVisitSelect}
                onViewDetails={actions.handleViewDetails}
                onDeleteVisit={actions.handleDeleteVisit}
            />
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default VisitsScreen;
