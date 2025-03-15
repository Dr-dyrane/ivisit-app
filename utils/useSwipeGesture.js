import { useRef } from "react";
import { Animated, PanResponder } from "react-native";

const useSwipeGesture = (onSwipeLeft, onSwipeRight) => {
  const pan = useRef(new Animated.ValueXY()).current;

  // Define the panResponder directly
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: Animated.event(
      [null, { dx: pan.x }],
      { useNativeDriver: false }
    ),
    onPanResponderRelease: (_, gestureState) => {
      if (gestureState.dx > 50) {
        // Swipe right, go to previous feature
        onSwipeRight();
      } else if (gestureState.dx < -50) {
        // Swipe left, go to next feature
        onSwipeLeft();
      }
      // Reset pan position
      Animated.spring(pan, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: false,
      }).start();
    },
  });

  // Return panResponder.panHandlers
  return panResponder.panHandlers;
};

export default useSwipeGesture;