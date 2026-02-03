// hooks/ui/useAndroidKeyboardAwareModal.js
/**
 * Android Keyboard Aware Modal Hook
 * 
 * Fixes the issue where modal inputs disappear into safe area on Android
 * when keyboard is focused. This is a common React Native Android issue.
 * 
 * PROBLEM:
 * - Modals with fixed height (SCREEN_HEIGHT * percentage) don't adjust when keyboard appears
 * - Android's KeyboardAvoidingView behavior="height" pushes content up but modal stays same size
 * - Inputs get hidden behind keyboard or disappear into safe area
 * 
 * SOLUTION:
 * - Dynamically track keyboard height using keyboard listeners
 * - Adjust modal height when keyboard appears/disappears
 * - Use different keyboard events for Android vs iOS
 * - Update ScrollView padding to maximize content space
 * 
 * USAGE:
 * const { keyboardHeight, modalHeight, getScrollViewProps, getKeyboardAvoidingViewProps } 
 *   = useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });
 * 
 * [MODAL-KEYBOARD-FIX]
 */

import { useEffect, useState } from 'react';
import { Platform, Dimensions, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function useAndroidKeyboardAwareModal({
  defaultHeight = SCREEN_HEIGHT * 0.85,
  maxHeightPercentage = 0.85
} = {}) {
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [modalHeight, setModalHeight] = useState(defaultHeight);

  useEffect(() => {
    const showEvent = Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow';
    const hideEvent = Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide';

    const keyboardDidShowListener = Keyboard.addListener(
      showEvent,
      (e) => {
        const height = e.endCoordinates.height;
        setKeyboardHeight(height);

        if (Platform.OS === 'android') {
          // Calculate available space above keyboard
          // We subtract insets.top to respect the status bar
          const availableHeight = SCREEN_HEIGHT - height - insets.top;

          // Shrink modal if it would exceed available height
          // We add a small buffer (20px)
          const adjustedHeight = Math.min(
            availableHeight - 20,
            defaultHeight
          );

          setModalHeight(adjustedHeight);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      hideEvent,
      () => {
        setKeyboardHeight(0);
        if (Platform.OS === 'android') {
          setModalHeight(defaultHeight);
        }
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [defaultHeight, maxHeightPercentage, insets.top]);

  // Helper function to get KeyboardAvoidingView props
  const getKeyboardAvoidingViewProps = (additionalProps = {}) => ({
    // On Android, we manage height manually or via padding, 
    // "padding" behavior is often more reliable than "height" for Modals
    behavior: Platform.OS === "ios" ? "padding" : "padding",
    keyboardVerticalOffset: Platform.OS === "ios" ? insets.bottom + 60 : 0,
    style: { flex: 1 },
    ...additionalProps
  });

  // Helper function to get ScrollView props
  const getScrollViewProps = (additionalProps = {}) => ({
    contentContainerStyle: {
      flexGrow: 1,
      // On Android, when keyboard is open, we add padding to bottom 
      // to allow the user to scroll fields above the keyboard.
      paddingBottom: keyboardHeight > 0
        ? 40 // Add some breathing room when keyboard is up
        : insets.bottom + 60,
      ...additionalProps.contentContainerStyle
    },
    keyboardShouldPersistTaps: "handled",
    showsVerticalScrollIndicator: false,
    ...additionalProps
  });

  return {
    keyboardHeight,
    modalHeight,
    getKeyboardAvoidingViewProps,
    getScrollViewProps
  };
}
