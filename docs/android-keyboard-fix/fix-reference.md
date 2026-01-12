# Android Keyboard Modal Fix

## Problem
On Android devices, modal inputs disappear into the safe area zone when the keyboard appears. This happens because:

1. Modals use fixed height (e.g., `SCREEN_HEIGHT * 0.85`)
2. `KeyboardAvoidingView` with `behavior="height"` pushes content up but doesn't resize the modal
3. Inputs get hidden behind the keyboard or pushed into the safe area

## Solution
Use dynamic modal height adjustment based on keyboard visibility:

1. Track keyboard height using keyboard event listeners
2. Adjust modal height when keyboard appears on Android
3. Use different keyboard events for Android (`keyboardDidShow/Hide`) vs iOS (`keyboardWillShow/Hide`)
4. Update ScrollView padding to maximize content space

## Implementation

### Option 1: Use the Reusable Hook (Recommended)

```javascript
import { useAndroidKeyboardAwareModal } from '../../hooks/ui/useAndroidKeyboardAwareModal';

export default function YourModal({ visible, onClose }) {
  const { modalHeight, getKeyboardAvoidingViewProps, getScrollViewProps } = 
    useAndroidKeyboardAwareModal({ defaultHeight: SCREEN_HEIGHT * 0.85 });

  return (
    <Modal visible={visible} transparent animationType="none">
      <Animated.View style={{ height: modalHeight }}>
        <KeyboardAvoidingView {...getKeyboardAvoidingViewProps()}>
          <ScrollView {...getScrollViewProps()}>
            {/* Your modal content */}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}
```

### Option 2: Manual Implementation

```javascript
const [keyboardHeight, setKeyboardHeight] = useState(0);
const [modalHeight, setModalHeight] = useState(SCREEN_HEIGHT * 0.85);

useEffect(() => {
  const keyboardDidShowListener = Keyboard.addListener(
    Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
    (e) => {
      setKeyboardHeight(e.endCoordinates.height);
      if (Platform.OS === 'android') {
        const availableHeight = SCREEN_HEIGHT - keyboardHeight - insets.top;
        const newModalHeight = Math.min(availableHeight * 0.9, SCREEN_HEIGHT * 0.85);
        setModalHeight(newModalHeight);
      }
    }
  );

  const keyboardDidHideListener = Keyboard.addListener(
    Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
    () => {
      setKeyboardHeight(0);
      if (Platform.OS === 'android') {
        setModalHeight(SCREEN_HEIGHT * 0.85);
      }
    }
  );

  return () => {
    keyboardDidShowListener.remove();
    keyboardDidHideListener.remove();
  };
}, [insets.top]);
```

## Files Fixed

1. **LoginInputModal.jsx** - Login modal with email/phone/password inputs
2. **AuthInputModal.jsx** - Registration modal with multiple input steps
3. **ServiceRatingModal.jsx** - Service rating with comment input (NEEDS FIX)
4. **CountryPickerModal.jsx** - Country search with text input (NEEDS FIX)

## Key Configuration Details

### KeyboardAvoidingView
```javascript
<KeyboardAvoidingView
  behavior={Platform.OS === "ios" ? "padding" : "height"}
  keyboardVerticalOffset={Platform.OS === "ios" ? insets.bottom + 90 : 0}
  style={{ flex: 1 }}
>
```

### ScrollView
```javascript
<ScrollView
  contentContainerStyle={{
    flexGrow: 1,
    paddingBottom: Platform.OS === "android" 
      ? keyboardHeight > 0 ? 20 : insets.bottom + 120
      : insets.bottom + 120,
  }}
  keyboardShouldPersistTaps="handled"
  showsVerticalScrollIndicator={false}
>
```

### Modal Height
```javascript
<Animated.View style={{ height: modalHeight }}>
```

## Testing

Test on Android device/emulator:
1. Open modal with input fields
2. Tap on input field to focus
3. Verify keyboard appears and input remains visible
4. Verify modal resizes appropriately
5. Test dismissing keyboard and modal returning to original size

## Related Issues

- React Native GitHub: #2543, #2975, #3120
- Common in apps with bottom sheet modals and form inputs
- Affects Android more than iOS due to different keyboard handling
