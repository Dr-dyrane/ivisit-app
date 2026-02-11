import { useRef, useEffect } from "react";
import { Animated, Dimensions } from "react-native";

export const useMoreAnimations = (loveNoteVisible) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const profileScale = useRef(new Animated.Value(0.9)).current;
    const loveModalSlide = useRef(new Animated.Value(Dimensions.get('window').height)).current;

    // Initial Animation
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 50,
                useNativeDriver: true,
            }),
            Animated.spring(profileScale, {
                toValue: 1,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    // Love Note Animation
    useEffect(() => {
        if (loveNoteVisible) {
            Animated.spring(loveModalSlide, {
                toValue: 0,
                useNativeDriver: true,
                friction: 10,
                tension: 45
            }).start();
        } else {
            Animated.timing(loveModalSlide, {
                toValue: Dimensions.get('window').height,
                duration: 300,
                useNativeDriver: true
            }).start();
        }
    }, [loveNoteVisible]);

    return {
        fadeAnim,
        slideAnim,
        profileScale,
        loveModalSlide
    };
};
