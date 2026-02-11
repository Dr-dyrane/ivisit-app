import { Platform } from 'react-native';

export const VISUAL_TAB_HEIGHT = Platform.OS === 'ios' ? 70 : 65;
export const HEADER_HEIGHT = 140;
export const ANIMATION_DURATION = 400; // Longer for smoother feel
export const SCROLL_THRESHOLD = 50;
export const DEBOUNCE_DELAY = 16; // ~60fps
export const MIN_SCROLL_DIFF = 8; // Higher threshold to reduce jitter

// Apple-style bezier easing curves
export const EASING_BEZIER = {
  // Smooth ease-out for showing elements (like iOS navigation bar)
  SHOW: Platform.OS === 'ios'
    ? [0.25, 0.46, 0.45, 0.94]  // iOS-style ease-out
    : [0.25, 0.46, 0.45, 0.94], // Same for Android

  // Smooth ease-in for hiding elements (like iOS control center)
  HIDE: Platform.OS === 'ios'
    ? [0.55, 0.085, 0.68, 0.53] // iOS-style ease-in
    : [0.55, 0.085, 0.68, 0.53], // Same for Android

  // Gentle spring-like ease for natural movement
  SPRING: [0.175, 0.885, 0.32, 1.275],
};
