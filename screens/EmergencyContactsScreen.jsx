"use client";

import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useEmergencyContactsScreenLogic } from "../hooks/emergency/useEmergencyContactsScreenLogic";
import EmergencyContactsList from "../components/emergency/EmergencyContactsList";
import SelectionToolbar from "../components/emergency/SelectionToolbar";
import EmergencyContactWizard from "../components/emergency/EmergencyContactWizard";

export default function EmergencyContactsScreen() {
    const { state, actions } = useEmergencyContactsScreenLogic();

    return (
        <LinearGradient colors={state.backgroundColors} style={styles.container}>
            {/* Selection Toolbar */}
            <SelectionToolbar
                selectedCount={state.selectedContacts.size}
                onClear={state.clearSelection}
                onDelete={state.handleBulkDelete}
                isDarkMode={state.isDarkMode}
            />

            {/* Main Contact List */}
            <EmergencyContactsList
                contacts={state.contacts}
                isContactsLoading={state.isContactsLoading}
                selectedContacts={state.selectedContacts}
                onEdit={state.openEdit}
                onDelete={state.handleDelete}
                onToggleSelect={state.handleToggleSelect}
                onScroll={actions.handleScroll}
                topPadding={state.topPadding}
                bottomPadding={state.bottomPadding}
                fadeAnim={state.fadeAnim}
                slideAnim={state.slideAnim}
                colors={state.colors}
                isDarkMode={state.isDarkMode}
            />

            {/* Add/Edit Wizard Modal */}
            <EmergencyContactWizard
                visible={state.isModalVisible}
                onClose={state.closeModal}
                editingId={state.editingId}
                step={state.step}
                formData={state.formData}
                setFormData={state.setFormData}
                phoneValid={state.formData.phone} // Pass the phone value validation state if needed, or check logic
                setPhoneValid={state.setPhoneValid}
                isSaving={state.isSaving}
                shakeAnim={state.shakeAnim}
                swipeHandlers={state.swipeHandlers}
                getInputValidation={state.getInputValidation}
                handleSave={state.handleSave}
                attemptNextStep={state.attemptNextStep}
                transitionStep={state.transitionStep}
                colors={state.colors}
                isDarkMode={state.isDarkMode}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
});
