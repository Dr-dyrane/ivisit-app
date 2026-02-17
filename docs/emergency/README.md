# Emergency Flow Documentation

**Last Updated**: February 17, 2026  
**Status**: Production Ready

## 📋 Overview

This directory contains comprehensive documentation for the emergency medical service flow, from initial request through payment processing to dispatch and completion.

## 📁 Document Structure

### 🚨 Core Implementation
- **`EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md`** - Complete audit and implementation of emergency payment flow
- **`POST_PAYMENT_DISPATCH_FLOW.md`** - Post-payment automation and dispatch planning

### 🔄 Flow Documentation
- **`flows/`** - Detailed user flow diagrams and process documentation
- **`ux/`** - Emergency flow UI/UX specifications and design guidelines
- **`checklists/`** - Testing and validation checklists
- **`refactor/`** - Emergency flow refactoring documentation

## 🎯 Key Features Implemented

### ✅ Payment Processing
- **Card Payments**: Immediate processing and dispatch
- **Cash Payments**: 3-phase approval system with admin oversight
- **Organization Fees**: Automatic calculation and deduction
- **Payment Records**: Complete audit trails and history

### ✅ Status Management
- **Real-time Updates**: Live status tracking via Supabase subscriptions
- **Cross-User Notifications**: Org admin and patient notifications
- **Status Transitions**: Proper state management and validation
- **UI Synchronization**: Consistent status display across components

### ✅ User Experience
- **Waiting Screens**: Proper UI for approval waiting states
- **Status Indicators**: Clear visual feedback for all states
- **Modal Transitions**: Smooth transitions between payment states
- **Error Handling**: Comprehensive error states and recovery

## 📊 Emergency Flow States

### Card Payment Flow
```
User Confirm → Payment Processed → Emergency In Progress → Ambulance Dispatched → Visit Created
```

### Cash Payment Flow
```
User Confirm → Payment Pending → Org Admin Approval → Payment Processed → Emergency In Progress → Ambulance Dispatched → Visit Created
```

### Status Mapping
| Emergency Status | Visit Status | Payment Status | Meaning |
|---|---|---|---|
| `pending_approval` | `pending` | `pending` | Cash payment awaiting org admin approval |
| `in_progress` | `upcoming` | `completed` | Approved / Card payment — ambulance dispatched |
| `accepted` | `upcoming` | `completed` | Ambulance accepted request |
| `arrived` | `in-progress` | `completed` | Ambulance arrived |
| `completed` | `completed` | `completed` | Trip finished |
| `cancelled` | `cancelled` | varies | Cancelled by user or system |
| `payment_declined` | `cancelled` | `declined` | Org admin declined cash payment |

## 🔧 Technical Implementation

### Database Changes
- **Migrations**: Cash approval gate and status management
- **RPC Functions**: `approve_cash_payment`, `decline_cash_payment`
- **Triggers**: Enhanced emergency-to-visit synchronization
- **RLS Policies**: Cross-user notification permissions

### Frontend Services
- **emergencyRequestsService.js**: Status management and request creation
- **paymentService.js**: Payment processing and approval methods
- **notificationDispatcher.js**: Cross-user notification system

### React Components
- **EmergencyRequestModal.jsx**: Payment UI with approval waiting states
- **TripSummaryCard.jsx**: Status display and progress tracking
- **BedBookingSummaryCard.jsx**: Booking status and updates

## 🚀 Next Phase Planning

### Immediate Priorities
1. **Post-Payment Automation**: Automated dispatch and provider assignment
2. **Wait Time Calculation**: ETA predictions and traffic analysis
3. **Advanced Monitoring**: Real-time dashboard and analytics
4. **Edge Case Handling**: Provider unavailability, hospital overflow

### Long-term Enhancements
1. **Machine Learning**: Predictive dispatch and route optimization
2. **Advanced Analytics**: Performance metrics and insights
3. **Provider Management**: Availability monitoring and scheduling
4. **User Experience**: Enhanced notifications and tracking

## 📋 Testing & Validation

### Automated Tests
- Payment processing workflows
- Status transition validation
- Cross-user notification delivery
- UI state synchronization

### Manual Testing
- End-to-end emergency flow
- Payment approval/decline scenarios
- Error handling and recovery
- Multi-user coordination

---

**Navigation**: For complete emergency flow understanding, start with `EMERGENCY_PAYMENT_FLOW_AUDIT_COMPLETE.md` and reference specific flow documentation in subdirectories.
