import React from "react";
import { Modal, View, Animated, KeyboardAvoidingView, ScrollView, Platform, StyleSheet } from "react-native";
import { useServiceRatingLogic } from "../../hooks/emergency/useServiceRatingLogic";
import {
    RatingModalBackdrop,
    RatingHeader,
    ServiceDetailsCard,
    StarRating,
    CommentInput,
    RatingActions
} from "./ServiceRatingUI";

export function ServiceRatingModal(props) {
    const { state, actions } = useServiceRatingLogic(props);

    if (!props.visible && state.fadeAnim._value === 0) return null;

    return (
        <Modal visible={props.visible} transparent animationType="none" onRequestClose={actions.close}>
            <View style={[styles.container, { paddingBottom: Platform.OS === 'android' ? state.keyboardHeight : 0 }]}>
                <RatingModalBackdrop
                    fadeAnim={state.fadeAnim}
                    isDarkMode={state.isDarkMode}
                    onClose={actions.close}
                    keyboardHeight={state.keyboardHeight}
                />

                <Animated.View
                    style={[
                        styles.modalContent,
                        {
                            transform: [{ translateY: state.slideAnim }],
                            backgroundColor: state.colors.bg,
                            height: state.modalHeight,
                        }
                    ]}
                >
                    {/* Handle */}
                    <View style={styles.handle} />

                    <KeyboardAvoidingView {...actions.getKeyboardAvoidingViewProps()}>
                        <ScrollView
                            {...actions.getScrollViewProps()}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.scrollContent}
                            keyboardShouldPersistTaps="handled"
                        >
                            <RatingHeader
                                title={props.title}
                                subtitle={props.subtitle}
                                icon={actions.getServiceIcon()}
                                colors={state.colors}
                            />

                            <ServiceDetailsCard
                                details={props.serviceDetails}
                                colors={state.colors}
                            />

                            <StarRating
                                rating={state.rating}
                                stars={state.stars}
                                onRate={actions.setRating}
                                serviceTypeLabel={actions.getServiceTypeLabel()}
                                ratingText={actions.getRatingText()}
                                colors={state.colors}
                            />

                            <CommentInput
                                value={state.comment}
                                onChange={actions.setComment}
                                colors={state.colors}
                            />

                            <RatingActions
                                onSubmit={actions.handleSubmit}
                                onClose={actions.close}
                                rating={state.rating}
                                keyboardHeight={state.keyboardHeight}
                                colors={state.colors}
                            />
                        </ScrollView>
                    </KeyboardAvoidingView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: "flex-end" },
    modalContent: {
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        paddingHorizontal: 24,
        paddingTop: 16,
    },
    handle: {
        width: 48,
        height: 6,
        backgroundColor: 'rgba(128,128,128,0.2)',
        borderRadius: 999,
        alignSelf: 'center',
        marginBottom: 32,
    },
    scrollContent: { paddingBottom: 40 },
});
