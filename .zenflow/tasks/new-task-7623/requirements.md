# Product Requirements Document (PRD)
## Real-Time Notification System with Haptic Feedback

**Version:** 1.0  
**Date:** January 10, 2026  
**Status:** Draft

---

## 1. Executive Summary

The iVisit app currently has a notification system that requires manual app refresh to display new notifications. This PRD outlines the requirements for implementing a true real-time notification system with haptic feedback that updates the UI instantly when events occur across the application.

---

## 2. Problem Statement

### Current Issues
1. **Manual Refresh Required**: Users must manually refresh the app to see new notifications
2. **Limited Haptic Feedback**: Only emergency notifications trigger haptic feedback
3. **Incomplete Coverage**: Not all user actions generate notifications
   - Visit updates, cancellations, and completions don't create notifications
   - Auth actions (login, signup, password changes, profile updates) don't create notifications
4. **Inconsistent Real-Time Updates**: While Supabase subscriptions exist, they refetch all data instead of handling real-time updates efficiently

### Impact
- Poor user experience with delayed notification awareness
- Missed critical updates about visits and account activities
- Lack of tactile feedback reduces engagement and urgency perception

---

## 3. Goals & Objectives

### Primary Goals
1. Implement true real-time notifications that update UI instantly without manual refresh
2. Add haptic feedback to all notifications based on priority level
3. Add sound notifications (configurable, enabled by default)
4. Create notifications for all visit lifecycle events
5. Create notifications for all authentication and profile events

### Success Metrics
- Notifications appear in UI within 1 second of event occurrence
- Zero manual refreshes required to see new notifications
- 100% coverage of visit and auth actions with appropriate notifications
- Haptic feedback triggered for all high/urgent priority notifications

---

## 4. User Stories

### User Story 1: Real-Time Visit Notifications
**As a** patient  
**I want to** receive instant notifications when my visit status changes  
**So that** I stay informed about my healthcare appointments without manually checking

**Acceptance Criteria:**
- Notification appears instantly when visit is created, updated, cancelled, or completed
- UI updates automatically without page refresh
- Haptic feedback triggers based on notification priority
- Sound plays for important updates (if enabled)

### User Story 2: Real-Time Auth Notifications
**As a** user  
**I want to** receive notifications for account-related activities  
**So that** I'm aware of security and profile changes

**Acceptance Criteria:**
- Notification appears for: login, signup, password changes, profile updates, logout
- Security-related notifications (password changes) have higher priority
- UI updates automatically without page refresh

### User Story 3: Haptic Feedback
**As a** user  
**I want to** feel haptic feedback when receiving notifications  
**So that** I'm alerted to important updates even when not looking at the screen

**Acceptance Criteria:**
- Urgent notifications: Strong haptic (3 pulses)
- High priority: Medium haptic (2 pulses)
- Normal priority: Light haptic (1 pulse)
- Low priority: No haptic

### User Story 4: Sound Notifications
**As a** user  
**I want to** hear a sound when receiving important notifications  
**So that** I'm alerted even when the app is in the background

**Acceptance Criteria:**
- Sound plays for urgent and high priority notifications
- Sound is configurable in settings (on by default)
- Different sounds for different notification types (optional enhancement)

---

## 5. Functional Requirements

### 5.1 Real-Time Notification Delivery

**FR-1.1**: System shall deliver notifications to UI within 1 second of event occurrence  
**FR-1.2**: System shall update notification badge count in real-time  
**FR-1.3**: System shall maintain persistent WebSocket/subscription connection for real-time updates  
**FR-1.4**: System shall handle real-time updates optimistically (update local state immediately)

### 5.2 Visit Lifecycle Notifications

**FR-2.1**: System shall create notification when visit is created with details:
- Title: "[Visit Type] Scheduled"
- Message: "Your [visit type] at [hospital] is [status]"
- Priority: HIGH
- Type: VISIT

**FR-2.2**: System shall create notification when visit is updated with details:
- Title: "[Visit Type] Updated"
- Message: "Your [visit type] details have been updated"
- Priority: NORMAL
- Type: VISIT

**FR-2.3**: System shall create notification when visit is cancelled with details:
- Title: "[Visit Type] Cancelled"
- Message: "Your [visit type] at [hospital] has been cancelled"
- Priority: HIGH
- Type: VISIT

**FR-2.4**: System shall create notification when visit is completed with details:
- Title: "[Visit Type] Completed"
- Message: "Your [visit type] at [hospital] is complete"
- Priority: NORMAL
- Type: VISIT

### 5.3 Authentication & Profile Notifications

**FR-3.1**: System shall create notification on successful login with details:
- Title: "Welcome back!"
- Message: "You've successfully logged in"
- Priority: LOW
- Type: SYSTEM

**FR-3.2**: System shall create notification on successful signup with details:
- Title: "Welcome to iVisit!"
- Message: "Your account has been created successfully"
- Priority: NORMAL
- Type: SYSTEM

**FR-3.3**: System shall create notification on password change with details:
- Title: "Password Changed"
- Message: "Your password has been updated successfully"
- Priority: HIGH
- Type: SYSTEM

**FR-3.4**: System shall create notification on profile update with details:
- Title: "Profile Updated"
- Message: "Your profile information has been updated"
- Priority: NORMAL
- Type: SYSTEM

**FR-3.5**: System shall create notification on logout with details:
- Title: "Signed Out"
- Message: "You've been logged out successfully"
- Priority: LOW
- Type: SYSTEM

### 5.4 Haptic Feedback

**FR-4.1**: System shall trigger haptic feedback based on priority:
- URGENT: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)` + 2 impact vibrations
- HIGH: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)`
- NORMAL: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`
- LOW: No haptic feedback

**FR-4.2**: Haptic feedback shall trigger within 100ms of notification receipt  
**FR-4.3**: Haptic feedback shall only trigger when app is in foreground or background (not terminated)

### 5.5 Sound Notifications

**FR-5.1**: System shall play notification sound for URGENT and HIGH priority notifications  
**FR-5.2**: Sound shall be enabled by default  
**FR-5.3**: User shall be able to disable sound in app settings  
**FR-5.4**: Sound shall play even when app is in background (if permissions allow)

---

## 6. Non-Functional Requirements

### 6.1 Performance
- **NFR-1.1**: Notification delivery latency < 1 second
- **NFR-1.2**: UI update latency < 100ms after notification received
- **NFR-1.3**: Haptic feedback latency < 100ms
- **NFR-1.4**: Maximum 50 notifications stored locally at any time (auto-cleanup older ones)

### 6.2 Reliability
- **NFR-2.1**: 99.9% notification delivery success rate
- **NFR-2.2**: Automatic reconnection on network failure within 5 seconds
- **NFR-2.3**: Offline notifications queued and delivered when online

### 6.3 Security
- **NFR-3.1**: Only user's own notifications delivered via RLS policies
- **NFR-3.2**: No sensitive data in notification messages
- **NFR-3.3**: Notification tokens encrypted in storage

### 6.4 Usability
- **NFR-4.1**: Haptic patterns distinct for each priority level
- **NFR-4.2**: Sound volume respects device settings
- **NFR-4.3**: No duplicate notifications for same event

---

## 7. Technical Constraints

1. **Supabase Real-Time**: Must use Supabase real-time subscriptions for WebSocket connections
2. **Expo Notifications**: Must use `expo-notifications` for local notifications and sounds
3. **Expo Haptics**: Must use `expo-haptics` for vibration feedback
4. **React Native**: All solutions must be compatible with React Native/Expo
5. **Existing Database Schema**: Must work with current `notifications` table structure

---

## 8. Dependencies

### External Dependencies
- Supabase real-time subscriptions (already in use)
- `expo-notifications` package (already installed)
- `expo-haptics` package (already installed)

### Internal Dependencies
- NotificationsContext (existing)
- VisitsContext (existing)
- AuthContext (existing)
- notificationsService (existing)
- visitsService (needs modification)
- authService (needs modification)

---

## 9. Out of Scope

The following items are explicitly **not** included in this feature:
1. Push notifications to device when app is terminated (future enhancement)
2. Notification grouping/threading (future enhancement)
3. Rich media notifications (images, videos) (future enhancement)
4. Custom notification sounds per type (future enhancement)
5. Notification snooze/reminder functionality (future enhancement)
6. Email notifications (future enhancement)
7. SMS notifications (future enhancement)

---

## 10. Assumptions & Decisions

### Assumptions
1. Users have granted notification permissions
2. Users have haptic-capable devices (graceful fallback for devices without)
3. Supabase real-time subscriptions are stable and reliable
4. Network connectivity is generally available (offline queue for edge cases)

### Decisions Made

**Decision 1: Sound Enabled by Default**
- **Rationale**: User said "yes sound please" indicating preference for sound
- **Impact**: Better user engagement, but respects device settings

**Decision 2: Haptic Feedback Priority-Based**
- **Rationale**: Different urgency levels need different tactile responses
- **Impact**: More intuitive user experience, battery impact minimal

**Decision 3: Optimistic UI Updates**
- **Rationale**: Supabase subscriptions already trigger refetch; optimize by updating local state directly
- **Impact**: Faster UI updates, better perceived performance

**Decision 4: No Notifications for Low-Priority Auth Events**
- **Rationale**: Login/logout notifications marked as LOW priority to avoid notification fatigue
- **Assumption**: User prefers to be notified but not overwhelmed
- **Impact**: Cleaner notification list focused on actionable items

**Decision 5: All Visit Actions Generate Notifications**
- **Rationale**: User explicitly requested "update all the visits actions with add notification"
- **Impact**: Complete coverage of visit lifecycle, better user awareness

---

## 11. Open Questions

1. **Q**: Should we batch multiple rapid notifications (e.g., bulk updates)?
   - **Decision**: No, each event gets its own notification for traceability

2. **Q**: What happens if Supabase real-time subscription fails?
   - **Decision**: Implement automatic reconnection with exponential backoff

3. **Q**: Should users be able to customize which events trigger notifications?
   - **Decision**: Out of scope for v1, add to future enhancements

---

## 12. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Supabase real-time connection drops | High | Medium | Implement auto-reconnect with exponential backoff |
| Too many notifications overwhelm user | Medium | High | Limit to 50 stored notifications, implement smart cleanup |
| Haptic feedback not available on device | Low | Low | Graceful fallback, no crash |
| Performance degradation with many notifications | Medium | Medium | Virtual list rendering, pagination |
| Network latency delays real-time updates | Medium | Medium | Optimistic UI updates, show loading states |

---

## 13. Success Criteria

### Minimum Viable Product (MVP)
✅ Notifications appear instantly without manual refresh  
✅ Haptic feedback works for all priority levels  
✅ Sound plays for urgent/high priority notifications  
✅ All visit actions (create, update, cancel, complete) generate notifications  
✅ All auth actions (login, signup, password change, profile update) generate notifications  
✅ Real-time UI updates via Supabase subscriptions  

### Future Enhancements
- Push notifications when app is terminated
- Notification settings page (enable/disable per type)
- Custom sounds per notification type
- Notification history/archive
- Smart notification grouping

---

## 14. Appendix

### Notification Priority Mapping

| Action | Priority | Haptic | Sound |
|--------|----------|--------|-------|
| Visit Created | HIGH | Warning | Yes |
| Visit Updated | NORMAL | Success | No |
| Visit Cancelled | HIGH | Warning | Yes |
| Visit Completed | NORMAL | Success | No |
| Emergency Accepted | URGENT | Error + Impact | Yes |
| Emergency Arriving | URGENT | Error + Impact | Yes |
| Emergency Completed | HIGH | Warning | Yes |
| Emergency Cancelled | NORMAL | Success | No |
| Login | LOW | None | No |
| Signup | NORMAL | Success | No |
| Password Changed | HIGH | Warning | Yes |
| Profile Updated | NORMAL | Success | No |
| Logout | LOW | None | No |

### Haptic Feedback Patterns

```javascript
// URGENT
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

// HIGH
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

// NORMAL
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// LOW
// No haptic
```

---

**Document Prepared By**: AI Assistant  
**Review Status**: Pending User Approval  
**Next Steps**: Technical Specification → Implementation Plan → Development
