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
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      (e) => {
        const keyboardHeightValue = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeightValue);
        
        // Only adjust modal height on Android to prevent inputs from disappearing
        if (Platform.OS === 'android') {
          const availableHeight = SCREEN_HEIGHT - keyboardHeightValue - insets.top;
          const newModalHeight = Math.min(
            availableHeight * 0.9, 
            SCREEN_HEIGHT * maxHeightPercentage
          );
          setModalHeight(newModalHeight);
        }
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
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
    behavior: Platform.OS === "ios" ? "padding" : "height",
    keyboardVerticalOffset: Platform.OS === "ios" ? insets.bottom + 90 : 0,
    style: { flex: 1 },
    ...additionalProps
  });

  // Helper function to get ScrollView props
  const getScrollViewProps = (additionalProps = {}) => ({
    contentContainerStyle: {
      flexGrow: 1,
      paddingBottom: Platform.OS === "android" 
        ? keyboardHeight > 0 ? 20 : insets.bottom + 120
        : insets.bottom + 120,
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
