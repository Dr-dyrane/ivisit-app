import React from "react";
import { ScrollView, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMoreLogic } from "../hooks/more/useMoreLogic";

// Components
import MoreProfileCard from "../components/more/MoreProfileCard";
import MoreMenuSection from "../components/more/MoreMenuSection";
import AboutSection from "../components/more/AboutSection";
import PreferencesSection from "../components/more/PreferencesSection";
import DeveloperSection from "../components/more/DeveloperSection";
import VersionFooter from "../components/more/VersionFooter";
import LoveNoteModal from "../components/more/LoveNoteModal";

const MoreScreen = () => {
    const { state, animations, actions, data } = useMoreLogic();
    const { user, isDarkMode, devModeVisible, loveNoteVisible } = state;
    const { fadeAnim, slideAnim, profileScale, loveModalSlide } = animations;
    const { healthItems, settingsItems, layout } = data;
    const { colors } = layout;

    return (
        <LinearGradient colors={layout.colors.backgrounds} style={{ flex: 1 }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: layout.topPadding,
                    paddingBottom: layout.bottomPadding,
                }}
                scrollEventThrottle={16}
                onScroll={actions.handleScroll}
            >
                {/* Profile Card */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }, { scale: profileScale }],
                        paddingHorizontal: 12,
                        paddingBottom: 24,
                    }}
                >
                    <MoreProfileCard 
                        user={user} 
                        colors={colors} 
                        isDarkMode={isDarkMode} 
                        onPress={actions.navigateToProfile} 
                    />
                </Animated.View>

                {/* Health & Emergency */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 12,
                        marginBottom: 24,
                    }}
                >
                    <MoreMenuSection 
                        title="HEALTH & EMERGENCY" 
                        items={healthItems} 
                        colors={colors} 
                        isDarkMode={isDarkMode} 
                    />
                </Animated.View>

                {/* Settings */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 12,
                        marginBottom: 24,
                    }}
                >
                    <MoreMenuSection 
                        title="SETTINGS" 
                        items={settingsItems} 
                        colors={colors} 
                        isDarkMode={isDarkMode} 
                    />
                </Animated.View>

                {/* About */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 12,
                        marginBottom: 24,
                    }}
                >
                    <AboutSection 
                        openLink={actions.openLink} 
                        colors={colors} 
                        isDarkMode={isDarkMode} 
                    />
                </Animated.View>

                {/* Preferences */}
                <Animated.View
                    style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                        paddingHorizontal: 12,
                        marginBottom: 24,
                    }}
                >
                    <PreferencesSection 
                        isDarkMode={isDarkMode} 
                        toggleTheme={actions.toggleTheme} 
                        handleLogout={actions.handleLogout} 
                        colors={colors} 
                    />
                </Animated.View>

                {/* Developer Mode */}
                <Animated.View
                    style={{
                        paddingHorizontal: 12,
                    }}
                >
                    <DeveloperSection 
                        visible={devModeVisible} 
                        onSeedData={actions.handleSeedData} 
                        fadeAnim={fadeAnim} 
                        slideAnim={slideAnim} 
                        colors={colors} 
                        isDarkMode={isDarkMode} 
                    />
                </Animated.View>

                {/* Version Footer */}
                <VersionFooter 
                    onVersionTap={actions.handleVersionTap} 
                    onHeartTap={actions.handleHeartTap} 
                    colors={colors} 
                />
            </ScrollView>

            {/* Modals */}
            <LoveNoteModal 
                visible={loveNoteVisible} 
                onClose={() => actions.setLoveNoteVisible(false)} 
                slideAnim={loveModalSlide} 
            />
        </LinearGradient>
    );
};

export default MoreScreen;
