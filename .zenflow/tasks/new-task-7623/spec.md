# Technical Specification: Real-Time Notification System with Haptic Feedback

**Version:** 1.0  
**Date:** January 10, 2026  
**Status:** Draft  
**PRD Reference:** `.zenflow/tasks/new-task-7623/requirements.md`

---

## 1. Technical Context

### 1.1 Technology Stack
- **Framework**: React Native (Expo ~54.0.30)
- **State Management**: React Context API
- **Backend**: Supabase (PostgreSQL + Real-time subscriptions)
- **Real-time**: Supabase Realtime WebSocket channels
- **Haptics**: expo-haptics v15.0.8
- **Notifications**: expo-notifications v0.32.16
- **Audio**: expo-av (needs to be installed)

### 1.2 Current Architecture

#### Existing Files
```
contexts/
  NotificationsContext.jsx         - Notifications state & filtering
  VisitsContext.jsx                - Visits state management
  AuthContext.jsx                  - Authentication state

services/
  notificationsService.js          - Notification CRUD operations
  visitsService.js                 - Visit CRUD operations (partial notification support)
  authService.js                   - Auth operations (no notification support)
  notificationDispatcher.js        - Emergency-only notification dispatcher
  pushNotificationService.js       - Local notification scheduling

hooks/
  notifications/useNotificationsData.js - Supabase subscription (refetch pattern)
  visits/useVisitsData.js               - Supabase subscription (refetch pattern)

constants/
  notifications.js                 - NOTIFICATION_TYPES, NOTIFICATION_PRIORITY, helpers
```

#### Current Supabase Subscription Pattern (Problem)
Both `useNotificationsData.js` and `useVisitsData.js` use a **refetch-on-change** pattern:

```javascript
subscription = supabase
  .channel('notifications_updates')
  .on('postgres_changes', { event: '*', table: 'notifications' }, (payload) => {
    console.log('[useNotificationsData] Real-time update:', payload.eventType);
    fetchNotifications(); // ❌ REFETCHES ALL DATA
  })
  .subscribe();
```

**Issue**: This refetches entire dataset on every change, causing:
- Network overhead
- UI flicker/re-renders
- Delayed updates (round-trip to DB)
- No haptic/sound feedback

---

## 2. Implementation Approach

### 2.1 Core Strategy: Optimistic Real-Time Updates

Replace the refetch pattern with **optimistic payload-based updates**:

```javascript
.on('postgres_changes', { event: '*', table: 'notifications' }, (payload) => {
  if (payload.eventType === 'INSERT') {
    const newNotification = normalizeNotification(mapFromDb(payload.new));
    setNotifications(prev => [newNotification, ...prev]);
    triggerHapticFeedback(newNotification.priority);
    playNotificationSound(newNotification.priority);
  }
  // Handle UPDATE, DELETE similarly
})
```

**Benefits**:
- Instant UI updates (no network round-trip)
- Can trigger haptic/sound immediately
- Reduced network traffic
- Better perceived performance

### 2.2 Notification Lifecycle Enhancement

#### Step 1: Service Layer - Create Notifications for All Actions

**visitsService.js** - Add notifications to `update()`, `cancel()`, `complete()`:
- Currently only `create()` has notification support
- Need to add notification creation to all state-changing methods

**authService.js** - Add notifications to:
- `login()` - LOW priority
- `signUp()` - NORMAL priority
- `updateProfile()` - NORMAL priority
- `changePassword()` - HIGH priority
- `logout()` - LOW priority

#### Step 2: Hook Layer - Optimistic Real-Time Updates

**useNotificationsData.js**:
- Replace `fetchNotifications()` call in subscription with direct state update
- Add haptic/sound triggers in subscription handler
- Keep `fetchNotifications()` for initial load and manual refresh

**useVisitsData.js**:
- Replace `fetchVisits()` call in subscription with direct state update
- Visits updates should also check for associated notifications

#### Step 3: Presentation Layer - Unified Notification Dispatcher

**notificationDispatcher.js** (expand from emergency-only):
- Move from emergency-specific to universal notification handler
- Consolidate haptic patterns
- Add sound playback logic
- Export `dispatchNotification(event, data, options)` function

---

## 3. Source Code Structure Changes

### 3.1 New Files

```
services/
  soundService.js                  - Sound playback utilities
  hapticService.js                 - Haptic feedback patterns

assets/
  sounds/
    notification-urgent.mp3        - URGENT priority sound
    notification-high.mp3          - HIGH priority sound
    notification-normal.mp3        - NORMAL priority sound
```

### 3.2 Modified Files

```
services/
  visitsService.js                 - Add notifications to update/cancel/complete
  authService.js                   - Add notifications to all auth actions
  notificationDispatcher.js        - Expand to universal dispatcher

hooks/
  notifications/useNotificationsData.js - Optimistic updates + haptic/sound
  visits/useVisitsData.js               - Optimistic updates

constants/
  notifications.js                 - Add HAPTIC_PATTERNS, SOUND_CONFIG
```

### 3.3 No Changes Required

```
contexts/NotificationsContext.jsx - Already properly structured
contexts/VisitsContext.jsx        - Already properly structured
contexts/AuthContext.jsx          - Already properly structured
services/notificationsService.js  - CRUD methods already complete
```

---

## 4. Data Model / API / Interface Changes

### 4.1 Database Schema (No Changes)
The existing `notifications` table schema is sufficient:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  type TEXT,
  priority TEXT,
  title TEXT,
  message TEXT,
  read BOOLEAN DEFAULT FALSE,
  action_type TEXT,
  action_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Service Method Signatures

#### visitsService.js
```javascript
// Current
async update(id, updates)
async cancel(id)
async complete(id)

// Enhanced (same signature, add notification dispatch internally)
async update(id, updates) {
  const result = await supabase.update(...);
  await notificationDispatcher.dispatchVisitUpdate(result);
  return result;
}
```

#### authService.js
```javascript
// Enhanced (add notification dispatch to existing methods)
async login({ email, password }) {
  const user = await supabase.auth.signInWithPassword(...);
  await notificationDispatcher.dispatchAuthEvent('login', user);
  return { data: user };
}

async signUp(credentials) {
  const user = await supabase.auth.signUp(...);
  await notificationDispatcher.dispatchAuthEvent('signup', user);
  return { data: user };
}

async updateProfile(userId, updates) {
  const profile = await supabase.update(...);
  await notificationDispatcher.dispatchAuthEvent('profile_update', profile);
  return profile;
}

async changePassword({ oldPassword, newPassword }) {
  await supabase.auth.updateUser({ password: newPassword });
  await notificationDispatcher.dispatchAuthEvent('password_change', {});
  return { success: true };
}

async logout() {
  await supabase.auth.signOut();
  await notificationDispatcher.dispatchAuthEvent('logout', {});
}
```

### 4.3 notificationDispatcher API

```javascript
// Current (emergency-only)
export const notificationDispatcher = {
  dispatch(event, data, addNotification) { ... }
};

// Enhanced (universal)
export const notificationDispatcher = {
  // New unified method
  async dispatchNotification(params) {
    const { type, priority, title, message, actionType, actionData } = params;
    
    // 1. Create notification in DB (Supabase will broadcast via real-time)
    await notificationsService.create({
      id: generateId(),
      type,
      priority,
      title,
      message,
      actionType,
      actionData,
      timestamp: new Date().toISOString(),
      read: false
    });
    
    // Note: Haptic/sound will be triggered by useNotificationsData subscription
  },
  
  // Convenience methods for specific events
  async dispatchVisitUpdate(visit, action) { ... },
  async dispatchAuthEvent(event, userData) { ... },
  async dispatchEmergencyEvent(event, data) { ... }
};
```

### 4.4 Haptic & Sound Service APIs

#### hapticService.js
```javascript
export const hapticService = {
  async triggerForPriority(priority) {
    switch (priority) {
      case NOTIFICATION_PRIORITY.URGENT:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
      case NOTIFICATION_PRIORITY.HIGH:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case NOTIFICATION_PRIORITY.NORMAL:
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case NOTIFICATION_PRIORITY.LOW:
        // No haptic
        break;
    }
  }
};
```

#### soundService.js
```javascript
import { Audio } from 'expo-av';

export const soundService = {
  soundEnabled: true,
  soundObjects: {},

  async init() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true
    });
  },

  async loadSounds() {
    this.soundObjects = {
      urgent: await Audio.Sound.createAsync(require('../assets/sounds/notification-urgent.mp3')),
      high: await Audio.Sound.createAsync(require('../assets/sounds/notification-high.mp3')),
      normal: await Audio.Sound.createAsync(require('../assets/sounds/notification-normal.mp3'))
    };
  },

  async playForPriority(priority) {
    if (!this.soundEnabled) return;
    
    let soundKey = null;
    if (priority === NOTIFICATION_PRIORITY.URGENT) soundKey = 'urgent';
    if (priority === NOTIFICATION_PRIORITY.HIGH) soundKey = 'high';
    
    if (soundKey && this.soundObjects[soundKey]) {
      const { sound } = this.soundObjects[soundKey];
      await sound.replayAsync();
    }
  },

  setSoundEnabled(enabled) {
    this.soundEnabled = enabled;
  }
};
```

---

## 5. Delivery Phases

### Phase 1: Infrastructure Setup
**Goal**: Install dependencies, create service utilities

**Tasks**:
1. Install `expo-av` for sound playback
2. Create `services/hapticService.js` with priority-based patterns
3. Create `services/soundService.js` with audio playback
4. Add placeholder sound files (can use system sounds initially)
5. Update `constants/notifications.js` with haptic/sound config

**Verification**: Run `npm install`, verify no errors

---

### Phase 2: Notification Dispatcher Enhancement
**Goal**: Make notificationDispatcher universal

**Tasks**:
1. Refactor `notificationDispatcher.js` to support all event types
2. Add `dispatchVisitUpdate(visit, action)` method
3. Add `dispatchAuthEvent(event, userData)` method
4. Add `dispatchEmergencyEvent(event, data)` method (migrate existing)
5. Remove direct haptic calls, delegate to services

**Verification**: Import dispatcher, call methods with mock data, verify no errors

---

### Phase 3: Visit Service Notifications
**Goal**: All visit actions create notifications

**Tasks**:
1. Modify `visitsService.update()` to create "Visit Updated" notification
2. Modify `visitsService.cancel()` to create "Visit Cancelled" notification
3. Modify `visitsService.complete()` to create "Visit Completed" notification
4. Ensure notification types/priorities match PRD requirements
5. Test each method creates correct notification

**Verification**: Create/update/cancel/complete a visit, verify notification created in DB

---

### Phase 4: Auth Service Notifications
**Goal**: All auth actions create notifications

**Tasks**:
1. Modify `authService.login()` to create "Welcome back" notification
2. Modify `authService.signUp()` to create "Welcome to iVisit" notification
3. Add `authService.changePassword()` notification (if not exists)
4. Modify `authService.updateProfile()` to create "Profile Updated" notification
5. Modify `authService.logout()` to create "Signed Out" notification

**Verification**: Perform each auth action, verify notification created

---

### Phase 5: Real-Time Optimistic Updates
**Goal**: Replace refetch pattern with direct state updates

**Tasks**:
1. Modify `useNotificationsData.js` subscription handler:
   - INSERT: Add to state, trigger haptic/sound
   - UPDATE: Update in state
   - DELETE: Remove from state
2. Modify `useVisitsData.js` subscription handler:
   - INSERT/UPDATE/DELETE: Optimistic state updates
3. Add haptic/sound triggers in `useNotificationsData` subscription
4. Test real-time updates work without manual refresh

**Verification**: 
- Create notification in another browser tab, verify appears instantly
- Verify haptic feedback triggers
- Verify sound plays (if enabled)

---

### Phase 6: Sound Configuration & Settings
**Goal**: Allow users to enable/disable sounds

**Tasks**:
1. Add sound preference to PreferencesContext/Service
2. Add toggle in SettingsScreen.jsx
3. Initialize soundService in app startup
4. Respect sound setting in notification handler

**Verification**: Toggle sound setting, verify notifications respect preference

---

### Phase 7: Edge Cases & Cleanup
**Goal**: Handle offline, cleanup old notifications

**Tasks**:
1. Add notification limit (50 max) with auto-cleanup in `useNotificationsData`
2. Test offline behavior (queue notifications)
3. Test rapid notification bursts (ensure no UI lag)
4. Add error boundaries for haptic/sound failures
5. Remove debug console.logs

**Verification**: 
- Create 60+ notifications, verify only 50 stored
- Disconnect network, create notification, reconnect, verify appears
- Create 10 notifications rapidly, verify all appear

---

## 6. Verification Approach

### 6.1 Unit Testing Strategy
Since the project uses Expo and doesn't have a test framework configured, verification will be **manual testing**:

1. **Notification Creation Test**:
   - Create visit → Check DB for notification
   - Update visit → Check DB for notification
   - Cancel visit → Check DB for notification
   - Complete visit → Check DB for notification
   - Login → Check DB for notification
   - Signup → Check DB for notification
   - Change password → Check DB for notification
   - Update profile → Check DB for notification

2. **Real-Time Update Test**:
   - Open app on two devices/emulators
   - Create notification on device A
   - Verify appears on device B within 1 second
   - Check haptic feedback triggers
   - Check sound plays (if enabled)

3. **Haptic Feedback Test**:
   - Create URGENT notification → Feel 3 pulses
   - Create HIGH notification → Feel 1 warning pulse
   - Create NORMAL notification → Feel 1 success pulse
   - Create LOW notification → No haptic

4. **Sound Test**:
   - Enable sounds in settings
   - Create URGENT notification → Hear urgent sound
   - Create HIGH notification → Hear high sound
   - Create NORMAL notification → No sound
   - Disable sounds → No sounds play

5. **Performance Test**:
   - Create 100 notifications
   - Verify only 50 stored
   - Verify UI remains responsive
   - Verify no memory leaks (check React DevTools)

### 6.2 Lint & Build Commands
Per project configuration:
```bash
# Start dev server
npm start

# Build for Android
npx expo build:android

# Build for iOS  
npx expo build:ios
```

No specific lint commands found in package.json, but should verify:
- No TypeScript errors (project has tsconfig.json)
- No console warnings
- Clean build output

---

## 7. Technical Risks & Mitigations

### 7.1 Supabase Real-Time Connection Stability
**Risk**: WebSocket connection drops frequently on mobile networks  
**Impact**: Notifications delayed or missed  
**Mitigation**:
- Implement exponential backoff reconnection
- Add connection status indicator in UI
- Fallback to polling if subscription fails repeatedly

**Code**:
```javascript
const setupSubscription = async () => {
  let retryCount = 0;
  const maxRetries = 5;
  
  const connect = async () => {
    try {
      subscription = supabase.channel('notifications').subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          retryCount = 0; // Reset on success
        }
        if (status === 'CLOSED' && retryCount < maxRetries) {
          setTimeout(() => {
            retryCount++;
            connect();
          }, Math.pow(2, retryCount) * 1000);
        }
      });
    } catch (error) {
      console.error('Subscription error:', error);
    }
  };
  
  await connect();
};
```

### 7.2 Haptic Feedback Not Available
**Risk**: Some Android devices don't support haptics  
**Impact**: App crashes when calling Haptics API  
**Mitigation**: Wrap all haptic calls in try-catch

```javascript
export const hapticService = {
  async triggerForPriority(priority) {
    try {
      // Haptic code
    } catch (error) {
      console.warn('Haptics not supported:', error);
      // Fail silently
    }
  }
};
```

### 7.3 Sound File Size Impact on Bundle
**Risk**: Adding sound files increases app size  
**Impact**: Slower downloads, larger bundle  
**Mitigation**:
- Use compressed .mp3 files (< 50KB each)
- Consider using system sounds via Expo Notifications API
- Lazy load sounds only if enabled in settings

### 7.4 Notification Overload (100+ rapid notifications)
**Risk**: Creating many notifications quickly crashes app  
**Impact**: Poor UX, app freeze  
**Mitigation**:
- Implement debouncing in notification creation
- Limit to 50 stored notifications with FIFO cleanup
- Add rate limiting (max 10 notifications per minute)

```javascript
// In useNotificationsData.js
useEffect(() => {
  if (notifications.length > 50) {
    const toRemove = notifications.slice(50);
    toRemove.forEach(n => clearNotification(n.id));
  }
}, [notifications]);
```

### 7.5 Audio Playback Conflicts
**Risk**: Notification sounds interrupt music/calls  
**Impact**: Bad user experience  
**Mitigation**:
- Set `playsInSilentModeIOS: true` but respect system volume
- Add logic to skip sound if phone call active
- Provide setting to disable sounds

---

## 8. Dependencies

### 8.1 External Dependencies (New)
```json
{
  "expo-av": "~15.0.8" // For sound playback
}
```

### 8.2 External Dependencies (Existing)
```json
{
  "expo-haptics": "~15.0.8",
  "expo-notifications": "~0.32.16",
  "@supabase/supabase-js": "^2.49.0"
}
```

### 8.3 Internal Dependencies
- `contexts/NotificationsContext.jsx` - State management
- `contexts/VisitsContext.jsx` - Visit state
- `contexts/AuthContext.jsx` - Auth state
- `services/notificationsService.js` - DB operations
- `services/visitsService.js` - Visit operations
- `services/authService.js` - Auth operations
- `hooks/notifications/useNotificationsData.js` - Real-time subscription
- `hooks/visits/useVisitsData.js` - Real-time subscription

---

## 9. Performance Considerations

### 9.1 Network Optimization
- **Before**: Refetch all notifications on every change (~10-100KB per fetch)
- **After**: Receive only changed notification via WebSocket (~1-5KB per change)
- **Impact**: ~90% reduction in notification-related network traffic

### 9.2 Render Optimization
```javascript
// Memoize notification list to prevent unnecessary re-renders
const MemoizedNotificationList = React.memo(NotificationList, (prev, next) => {
  return prev.notifications.length === next.notifications.length &&
         prev.notifications[0]?.id === next.notifications[0]?.id;
});
```

### 9.3 Haptic/Sound Debouncing
```javascript
// Prevent haptic spam
let lastHapticTime = 0;
export const hapticService = {
  async triggerForPriority(priority) {
    const now = Date.now();
    if (now - lastHapticTime < 500) return; // Min 500ms between haptics
    lastHapticTime = now;
    
    // Trigger haptic...
  }
};
```

---

## 10. Security Considerations

### 10.1 Row Level Security (RLS)
Supabase RLS policies ensure users only receive their own notifications:
```sql
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

**Verification**: Existing RLS policies are sufficient, no changes needed.

### 10.2 Notification Content Sanitization
- Never include sensitive data (passwords, tokens) in notification messages
- Use generic messages for auth events: "Password changed" not "Password changed to XYZ"

### 10.3 Rate Limiting
- Limit notification creation to 10 per minute per user
- Implement in `notificationsService.create()`:

```javascript
const rateLimitCache = new Map(); // userId -> [timestamps]

async create(notification) {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  const now = Date.now();
  const userTimestamps = rateLimitCache.get(userId) || [];
  
  // Remove timestamps older than 1 minute
  const recentTimestamps = userTimestamps.filter(t => now - t < 60000);
  
  if (recentTimestamps.length >= 10) {
    throw new Error('Rate limit exceeded');
  }
  
  recentTimestamps.push(now);
  rateLimitCache.set(userId, recentTimestamps);
  
  // Create notification...
}
```

---

## 11. Open Questions & Decisions

### Q1: Should we batch notifications created in quick succession?
**Decision**: No. Each event gets its own notification for audit trail purposes.

### Q2: What happens if Supabase subscription fails to establish?
**Decision**: Implement automatic reconnection with exponential backoff (max 5 retries). If all retries fail, show connection warning in UI.

### Q3: Should haptic feedback respect device "Haptics" system setting?
**Decision**: Yes. Check `Haptics.isAvailableAsync()` before triggering. Fail silently if unavailable.

### Q4: What sound format should we use?
**Decision**: Use .mp3 files (< 50KB each) for maximum compatibility. Consider system sounds as fallback.

### Q5: Should we use expo-notifications for local notifications or just in-app?
**Decision**: Phase 1 is in-app only (toast/banner). Local notifications (when app in background) is a future enhancement.

---

## 12. Future Enhancements (Out of Scope)

1. **Push Notifications**: When app is terminated, use APNS/FCM
2. **Notification Grouping**: Group similar notifications (e.g., "3 new visits")
3. **Rich Notifications**: Images, videos, action buttons
4. **Custom Sounds**: Per-notification-type sounds
5. **Notification History**: Archive view for old notifications
6. **Smart Batching**: AI-powered notification prioritization
7. **Notification Preferences**: Per-type enable/disable toggles

---

## 13. Success Metrics

### 13.1 Functional Metrics
- ✅ 100% of visit actions (create/update/cancel/complete) create notifications
- ✅ 100% of auth actions (login/signup/password/profile/logout) create notifications
- ✅ Notifications appear in UI within 1 second (measured via timestamp diff)
- ✅ Haptic feedback triggers for URGENT/HIGH/NORMAL priorities
- ✅ Sound plays for URGENT/HIGH priorities (when enabled)

### 13.2 Performance Metrics
- Network traffic reduction: > 80% vs refetch pattern
- UI update latency: < 100ms from notification receipt to UI render
- Haptic latency: < 100ms from notification receipt to haptic trigger
- Memory usage: < 50MB for 50 notifications
- App size increase: < 500KB (sound files)

### 13.3 User Experience Metrics
- Zero manual refreshes required to see new notifications
- No UI freezes with 10+ rapid notifications
- No app crashes from haptic/sound playback
- Sound respects user settings (enabled/disabled)

---

## 14. Rollout Plan

### 14.1 Development Environment
1. Complete Phases 1-7 in development
2. Test on iOS simulator + Android emulator
3. Test on physical devices (iOS + Android)

### 14.2 Staging Environment
1. Deploy to Expo preview build
2. Test with 3-5 beta users
3. Collect feedback on haptic patterns and sound preferences

### 14.3 Production Release
1. OTA update via EAS Update
2. Monitor Supabase real-time connection metrics
3. Monitor app crash rates (haptic/sound errors)
4. Gather user feedback via in-app survey

---

## Appendix A: File Change Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `package.json` | Modify | Add `expo-av` dependency |
| `services/hapticService.js` | Create | Priority-based haptic patterns |
| `services/soundService.js` | Create | Sound playback utilities |
| `services/notificationDispatcher.js` | Modify | Expand to universal dispatcher |
| `services/visitsService.js` | Modify | Add notifications to update/cancel/complete |
| `services/authService.js` | Modify | Add notifications to all auth actions |
| `hooks/notifications/useNotificationsData.js` | Modify | Optimistic updates + haptic/sound triggers |
| `hooks/visits/useVisitsData.js` | Modify | Optimistic updates for visits |
| `constants/notifications.js` | Modify | Add HAPTIC_PATTERNS, SOUND_CONFIG |
| `assets/sounds/notification-urgent.mp3` | Create | Sound file for URGENT priority |
| `assets/sounds/notification-high.mp3` | Create | Sound file for HIGH priority |
| `assets/sounds/notification-normal.mp3` | Create | Sound file for NORMAL priority |

**Total**: 7 modified files, 5 new files

---

## Appendix B: Testing Checklist

### Visit Notifications
- [ ] Create visit → Notification appears instantly
- [ ] Update visit → Notification appears instantly
- [ ] Cancel visit → Notification appears instantly with HIGH priority
- [ ] Complete visit → Notification appears instantly

### Auth Notifications
- [ ] Login → "Welcome back" notification (LOW priority, no haptic/sound)
- [ ] Signup → "Welcome to iVisit" notification (NORMAL priority)
- [ ] Change password → "Password Changed" notification (HIGH priority, haptic + sound)
- [ ] Update profile → "Profile Updated" notification (NORMAL priority)
- [ ] Logout → "Signed Out" notification (LOW priority)

### Real-Time Updates
- [ ] Open app on 2 devices
- [ ] Create notification on device A
- [ ] Notification appears on device B within 1 second
- [ ] No manual refresh required

### Haptic Feedback
- [ ] URGENT notification → 3 heavy pulses
- [ ] HIGH notification → 1 warning pulse
- [ ] NORMAL notification → 1 success pulse
- [ ] LOW notification → No haptic

### Sound Playback
- [ ] Enable sounds in settings
- [ ] URGENT notification → Urgent sound plays
- [ ] HIGH notification → High sound plays
- [ ] NORMAL notification → No sound
- [ ] Disable sounds → No sounds play
- [ ] Sound respects device volume

### Edge Cases
- [ ] Create 60 notifications → Only 50 stored
- [ ] Disconnect network → Create notification → Reconnect → Notification appears
- [ ] Create 10 notifications in 1 second → All appear, no UI lag
- [ ] Haptics unavailable (Android) → No crash, silent failure
- [ ] Sound playback fails → No crash, silent failure

### Performance
- [ ] App starts in < 3 seconds
- [ ] Notification list scrolls smoothly (60fps)
- [ ] No memory leaks after 100+ notifications
- [ ] Network usage < 1MB for 50 notifications

---

**Document Prepared By**: AI Assistant  
**Review Status**: Ready for Planning Phase  
**Next Step**: Create detailed implementation plan in `plan.md`
