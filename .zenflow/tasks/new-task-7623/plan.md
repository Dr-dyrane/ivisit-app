# Full SDD workflow

## Configuration
- **Artifacts Path**: {@artifacts_path} → `.zenflow/tasks/{task_id}`

---

## Workflow Steps

### [x] Step: Requirements
<!-- chat-id: 971fa56d-4277-48d9-a743-b5bcbd4acc7a -->

Create a Product Requirements Document (PRD) based on the feature description.

1. Review existing codebase to understand current architecture and patterns
2. Analyze the feature definition and identify unclear aspects
3. Ask the user for clarifications on aspects that significantly impact scope or user experience
4. Make reasonable decisions for minor details based on context and conventions
5. If user can't clarify, make a decision, state the assumption, and continue

Save the PRD to `{@artifacts_path}/requirements.md`.

### [x] Step: Technical Specification
<!-- chat-id: 4355fdf8-0a88-4e2a-9f89-3cf035b848af -->

Create a technical specification based on the PRD in `{@artifacts_path}/requirements.md`.

1. Review existing codebase architecture and identify reusable components
2. Define the implementation approach

Save to `{@artifacts_path}/spec.md` with:
- Technical context (language, dependencies)
- Implementation approach referencing existing code patterns
- Source code structure changes
- Data model / API / interface changes
- Delivery phases (incremental, testable milestones)
- Verification approach using project lint/test commands

### [x] Step: Planning
<!-- chat-id: 01e98df0-2d14-4348-b522-58f7219db618 -->

Create a detailed implementation plan based on `{@artifacts_path}/spec.md`.

1. Break down the work into concrete tasks
2. Each task should reference relevant contracts and include verification steps
3. Replace the Implementation step below with the planned tasks

Rule of thumb for step size: each step should represent a coherent unit of work (e.g., implement a component, add an API endpoint, write tests for a module). Avoid steps that are too granular (single function) or too broad (entire feature).

If the feature is trivial and doesn't warrant full specification, update this workflow to remove unnecessary steps and explain the reasoning to the user.

Save to `{@artifacts_path}/plan.md`.

---

## Implementation Tasks

### [ ] Phase 1: Infrastructure Setup
**Goal**: Install dependencies and create haptic/sound service utilities

#### [ ] Task 1.1: Install expo-av dependency
- Run `npm install expo-av@~15.0.8 --legacy-peer-deps`
- Verify no installation errors
- **Verification**: Check package.json contains expo-av

#### [ ] Task 1.2: Create hapticService.js
- Create `services/hapticService.js`
- Implement `triggerForPriority(priority)` method
- Add URGENT (3 pulses), HIGH (1 warning), NORMAL (1 success), LOW (none) patterns
- Wrap all calls in try-catch for graceful fallback
- **Verification**: Import and call with each priority, verify no errors

#### [ ] Task 1.3: Create soundService.js
- Create `services/soundService.js`
- Implement `init()`, `loadSounds()`, `playForPriority()`, `setSoundEnabled()` methods
- Add sound playback for URGENT and HIGH priorities
- **Verification**: Import and test sound playback (manual)

#### [ ] Task 1.4: Add placeholder sound files
- Create `assets/sounds/` directory
- Add `notification-urgent.mp3`, `notification-high.mp3`, `notification-normal.mp3`
- Use free/system sounds initially (< 50KB each)
- **Verification**: Verify files exist and load in soundService

#### [ ] Task 1.5: Update constants/notifications.js
- Read existing `constants/notifications.js`
- Add `HAPTIC_PATTERNS` constant mapping priorities to patterns
- Add `SOUND_CONFIG` constant with sound file paths and settings
- **Verification**: Import constants in hapticService/soundService, verify usage

---

### [ ] Phase 2: Notification Dispatcher Enhancement
**Goal**: Expand notificationDispatcher from emergency-only to universal

#### [ ] Task 2.1: Read and analyze existing notificationDispatcher.js
- Read `services/notificationDispatcher.js`
- Understand current emergency-only implementation
- Identify reusable patterns
- **Verification**: Document current structure

#### [ ] Task 2.2: Refactor notificationDispatcher.js to universal
- Add `dispatchNotification(params)` universal method
- Method should create notification via notificationsService.create()
- Note: Haptic/sound will be triggered by useNotificationsData subscription (not here)
- **Verification**: Import and call with mock data, verify notification created in DB

#### [ ] Task 2.3: Add dispatchVisitUpdate method
- Add `dispatchVisitUpdate(visit, action)` method
- Support actions: 'created', 'updated', 'cancelled', 'completed'
- Map actions to notification types and priorities per spec
- **Verification**: Call with mock visit data, verify correct notification created

#### [ ] Task 2.4: Add dispatchAuthEvent method
- Add `dispatchAuthEvent(event, userData)` method
- Support events: 'login', 'signup', 'password_change', 'profile_update', 'logout'
- Map events to notification types and priorities per spec
- **Verification**: Call with mock user data, verify correct notification created

#### [ ] Task 2.5: Migrate existing emergency dispatch
- Add `dispatchEmergencyEvent(event, data)` method
- Migrate existing emergency notification logic to new pattern
- Ensure backward compatibility with existing emergency flows
- **Verification**: Test emergency notification creation still works

---

### [ ] Phase 3: Visit Service Notifications
**Goal**: All visit actions (update, cancel, complete) create notifications

#### [ ] Task 3.1: Read existing visitsService.js
- Read `services/visitsService.js`
- Identify update(), cancel(), complete() methods
- Check if create() already has notification support
- **Verification**: Document current implementation

#### [ ] Task 3.2: Add notification to visitsService.update()
- Modify `update(id, updates)` method
- After successful update, call `notificationDispatcher.dispatchVisitUpdate(result, 'updated')`
- Title: "[Visit Type] Updated", Priority: NORMAL
- **Verification**: Update a visit, verify notification created in DB

#### [ ] Task 3.3: Add notification to visitsService.cancel()
- Modify `cancel(id)` method
- After successful cancel, call `notificationDispatcher.dispatchVisitUpdate(result, 'cancelled')`
- Title: "[Visit Type] Cancelled", Priority: HIGH
- **Verification**: Cancel a visit, verify notification created in DB

#### [ ] Task 3.4: Add notification to visitsService.complete()
- Modify `complete(id)` method
- After successful complete, call `notificationDispatcher.dispatchVisitUpdate(result, 'completed')`
- Title: "[Visit Type] Completed", Priority: NORMAL
- **Verification**: Complete a visit, verify notification created in DB

#### [ ] Task 3.5: Ensure visitsService.create() has notification
- Check if create() already creates notification
- If not, add notification dispatch
- Title: "[Visit Type] Scheduled", Priority: HIGH
- **Verification**: Create a visit, verify notification created in DB

---

### [ ] Phase 4: Auth Service Notifications
**Goal**: All auth actions create notifications

#### [ ] Task 4.1: Read existing authService.js
- Read `services/authService.js` (or `api/auth.js` based on project structure)
- Identify login(), signUp(), updateProfile() methods
- Check if changePassword() exists
- **Verification**: Document current implementation

#### [ ] Task 4.2: Add notification to login()
- Modify `login({ email, password })` method
- After successful login, call `notificationDispatcher.dispatchAuthEvent('login', user)`
- Title: "Welcome back!", Priority: LOW
- **Verification**: Login, verify notification created in DB

#### [ ] Task 4.3: Add notification to signUp()
- Modify `signUp(credentials)` method
- After successful signup, call `notificationDispatcher.dispatchAuthEvent('signup', user)`
- Title: "Welcome to iVisit!", Priority: NORMAL
- **Verification**: Signup, verify notification created in DB

#### [ ] Task 4.4: Add/modify changePassword() with notification
- Find or create `changePassword({ oldPassword, newPassword })` method
- After successful change, call `notificationDispatcher.dispatchAuthEvent('password_change', {})`
- Title: "Password Changed", Priority: HIGH
- **Verification**: Change password, verify notification created in DB

#### [ ] Task 4.5: Add notification to updateProfile()
- Modify `updateProfile(userId, updates)` method
- After successful update, call `notificationDispatcher.dispatchAuthEvent('profile_update', profile)`
- Title: "Profile Updated", Priority: NORMAL
- **Verification**: Update profile, verify notification created in DB

#### [ ] Task 4.6: Add notification to logout()
- Modify `logout()` method
- Before signing out, call `notificationDispatcher.dispatchAuthEvent('logout', {})`
- Title: "Signed Out", Priority: LOW
- **Verification**: Logout, verify notification created in DB

---

### [ ] Phase 5: Real-Time Optimistic Updates
**Goal**: Replace refetch pattern with direct state updates + haptic/sound

#### [ ] Task 5.1: Read existing useNotificationsData.js
- Read `hooks/notifications/useNotificationsData.js`
- Identify current Supabase subscription pattern
- Note how fetchNotifications() is called
- **Verification**: Document current refetch pattern

#### [ ] Task 5.2: Modify useNotificationsData.js subscription for INSERT
- In subscription handler, add case for `payload.eventType === 'INSERT'`
- Extract new notification from `payload.new`
- Add to state: `setNotifications(prev => [newNotification, ...prev])`
- Trigger `hapticService.triggerForPriority(newNotification.priority)`
- Trigger `soundService.playForPriority(newNotification.priority)`
- **Verification**: Create notification in another tab, verify appears instantly + haptic/sound

#### [ ] Task 5.3: Modify useNotificationsData.js subscription for UPDATE
- In subscription handler, add case for `payload.eventType === 'UPDATE'`
- Extract updated notification from `payload.new`
- Update in state: `setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n))`
- **Verification**: Mark notification as read, verify updates instantly

#### [ ] Task 5.4: Modify useNotificationsData.js subscription for DELETE
- In subscription handler, add case for `payload.eventType === 'DELETE'`
- Extract deleted notification ID from `payload.old`
- Remove from state: `setNotifications(prev => prev.filter(n => n.id !== deletedId))`
- **Verification**: Delete notification in DB, verify removes instantly

#### [ ] Task 5.5: Keep fetchNotifications() for initial load
- Ensure `fetchNotifications()` is still called on mount for initial data load
- Remove `fetchNotifications()` call from subscription handler
- **Verification**: Refresh app, verify notifications load correctly

#### [ ] Task 5.6: Read existing useVisitsData.js
- Read `hooks/visits/useVisitsData.js`
- Identify current Supabase subscription pattern
- **Verification**: Document current refetch pattern

#### [ ] Task 5.7: Modify useVisitsData.js subscription for optimistic updates
- In subscription handler, handle INSERT/UPDATE/DELETE events
- Update state directly instead of refetching
- INSERT: Add to state
- UPDATE: Update in state
- DELETE: Remove from state
- **Verification**: Create/update/delete visit, verify UI updates instantly

---

### [ ] Phase 6: Sound Configuration & Settings
**Goal**: Allow users to enable/disable notification sounds

#### [ ] Task 6.1: Check for existing preferences storage
- Search for PreferencesContext or similar
- Check if settings/preferences are stored in AsyncStorage
- **Verification**: Document findings

#### [ ] Task 6.2: Add sound preference storage
- Add `notificationSoundEnabled` to preferences (default: true)
- Store in AsyncStorage
- Expose via Context or service
- **Verification**: Read/write preference, verify persists

#### [ ] Task 6.3: Find SettingsScreen or create settings UI
- Search for SettingsScreen.jsx or similar
- If exists, identify where to add toggle
- If not, document where settings should be added
- **Verification**: Document settings UI location

#### [ ] Task 6.4: Add sound toggle in settings UI
- Add "Notification Sounds" toggle switch
- Wire to preferences storage
- **Verification**: Toggle switch, verify preference updates

#### [ ] Task 6.5: Initialize soundService on app startup
- Find app entry point (_layout.js or App.js)
- Call `soundService.init()` and `soundService.loadSounds()` on app mount
- Load sound preference and call `soundService.setSoundEnabled()`
- **Verification**: App starts without errors, sounds load

#### [ ] Task 6.6: Respect sound setting in notification handler
- In `useNotificationsData.js`, check sound setting before playing
- Use `soundService.setSoundEnabled()` when preference changes
- **Verification**: Disable sounds, create notification, verify no sound plays

---

### [ ] Phase 7: Edge Cases & Cleanup
**Goal**: Handle edge cases and optimize performance

#### [ ] Task 7.1: Add notification limit (50 max) in useNotificationsData
- In `useNotificationsData.js`, add useEffect to monitor notifications length
- If > 50, remove oldest notifications from DB
- Use FIFO (First In, First Out) cleanup
- **Verification**: Create 60 notifications, verify only 50 stored

#### [ ] Task 7.2: Test offline behavior
- Disconnect network in app
- Create notification in Supabase DB directly
- Reconnect network
- Verify subscription receives update and displays notification
- **Verification**: Manual test with network toggle

#### [ ] Task 7.3: Test rapid notification creation
- Create script or manual test to create 10 notifications in 1 second
- Verify all appear in UI
- Verify no UI lag or freeze
- Verify haptic/sound not spammed (add debouncing if needed)
- **Verification**: All 10 notifications visible, smooth UI

#### [ ] Task 7.4: Add error boundaries for haptic/sound
- Ensure all `hapticService` calls wrapped in try-catch
- Ensure all `soundService` calls wrapped in try-catch
- Log errors but fail silently (don't crash app)
- **Verification**: Simulate haptic unavailable, verify no crash

#### [ ] Task 7.5: Add haptic debouncing to prevent spam
- In `hapticService.js`, add 500ms minimum between haptic triggers
- Track `lastHapticTime` and skip if too soon
- **Verification**: Create 5 notifications rapidly, verify haptic not overwhelming

#### [ ] Task 7.6: Remove debug console.logs
- Search codebase for console.log related to notifications/visits/auth
- Remove or replace with proper logging
- **Verification**: Run app, verify no unnecessary logs

---

### [ ] Phase 8: Testing & Verification
**Goal**: Comprehensive testing of all features

#### [ ] Task 8.1: Test all visit notification actions
- Create visit → Verify notification appears instantly with HIGH priority
- Update visit → Verify notification appears instantly with NORMAL priority
- Cancel visit → Verify notification appears instantly with HIGH priority
- Complete visit → Verify notification appears instantly with NORMAL priority
- **Verification**: All 4 actions create correct notifications

#### [ ] Task 8.2: Test all auth notification actions
- Login → Verify "Welcome back" notification (LOW, no haptic/sound)
- Signup → Verify "Welcome to iVisit" notification (NORMAL, haptic, no sound)
- Change password → Verify "Password Changed" notification (HIGH, haptic + sound)
- Update profile → Verify "Profile Updated" notification (NORMAL, haptic, no sound)
- Logout → Verify "Signed Out" notification (LOW, no haptic/sound)
- **Verification**: All 5 actions create correct notifications

#### [ ] Task 8.3: Test real-time updates across devices
- Open app on 2 devices/emulators
- Create notification on device A
- Verify appears on device B within 1 second
- Verify no manual refresh required
- **Verification**: Real-time sync confirmed

#### [ ] Task 8.4: Test haptic feedback patterns
- Create URGENT notification → Feel 3 heavy pulses
- Create HIGH notification → Feel 1 warning pulse
- Create NORMAL notification → Feel 1 success pulse
- Create LOW notification → No haptic
- **Verification**: Haptic patterns match spec (requires physical device)

#### [ ] Task 8.5: Test sound playback
- Enable sounds in settings
- Create URGENT notification → Hear urgent sound
- Create HIGH notification → Hear high sound
- Create NORMAL notification → No sound
- Disable sounds in settings
- Create URGENT notification → No sound
- **Verification**: Sound behavior matches spec

#### [ ] Task 8.6: Test edge cases
- Create 60 notifications → Verify only 50 stored
- Disconnect network → Create notification → Reconnect → Verify appears
- Create 10 notifications in 1 second → Verify all appear, no lag
- Test on Android device without haptics → Verify no crash
- **Verification**: All edge cases handled gracefully

#### [ ] Task 8.7: Performance verification
- Monitor app startup time (should be < 3 seconds)
- Scroll notification list with 50 items (should be smooth 60fps)
- Check memory usage after 100+ notifications created (should be reasonable)
- Measure network usage for notifications (should be minimal with optimistic updates)
- **Verification**: Performance meets NFRs

#### [ ] Task 8.8: Final build test
- Run `npm start` and test on iOS simulator
- Run `npm start` and test on Android emulator
- Test on physical iOS device (if available)
- Test on physical Android device (if available)
- **Verification**: App works on all platforms

---

## Testing Results

### Lint/Build Commands
```bash
# Start dev server
npm start

# Build for Android (if needed)
npx expo build:android

# Build for iOS (if needed)
npx expo build:ios
```

### Test Results
(To be filled in during Phase 8 testing)

---

## Notes
- All tasks follow the spec in `.zenflow/tasks/new-task-7623/spec.md`
- Each phase builds on previous phases (complete in order)
- Verification steps ensure quality at each stage
- Sound files can use free/system sounds initially (user can customize later)
- Haptic patterns follow iOS HIG and Android Material Design guidelines
