# EMERGENCY INTEGRATION AUDIT - ARCHIVAL NOTICE

## ⚠️ **ARCHIVED DOCUMENT - LEGACY INTEGRATION ANALYSIS**

### **Archival Date**: April 23, 2026  
### **Reason**: Document reflects legacy auth-first emergency access patterns that conflict with current intent-first, Map-first orchestration

---

## **Historical Context**

This audit was conducted when the iVisit app used an **auth-first emergency access pattern** where users had to authenticate before accessing emergency services. The system has since evolved to **intent-first access** with authentication only when required.

### **Legacy Integration Pattern (No Longer Active)**
- **Auth-First Flow**: Users must authenticate before emergency access
- **Separate Emergency Surface**: EmergencyScreen.jsx as distinct component
- **Manual State Sync**: Legacy state management patterns
- **Tab-Based Navigation**: Emergency tab as primary entry point

### **Current Integration Pattern (Active)**
- **Intent-First Flow**: Emergency access available without authentication
- **Map-First Orchestration**: Unified 15-phase state machine
- **Real-time Subscriptions**: Supabase-driven state management
- **Domain-Centric Design**: Emergency lifecycle domain

---

## **Migration Path**

### **Where to Find Current Information**

#### **Emergency Lifecycle Domain**
📖 **New Location**: `/docs/domains/EMERGENCY_LIFECYCLE.md`
- **Content**: 15-phase state machine with intent-first access
- **Implementation**: MapSheetOrchestrator patterns
- **Real-time**: Supabase subscription architecture

#### **Identity and Auth Domain**
📖 **New Location**: `/docs/domains/IDENTITY_AND_AUTH.md`
- **Content**: Intent-first authentication with emergency override
- **Implementation**: Emergency access without full authentication
- **Security**: Temporary session management for emergencies

#### **System Architecture**
📖 **New Location**: `/docs/system/ARCHITECTURE_OVERVIEW.md`
- **Content**: Tripartite system with cross-repository communication
- **Data Flow**: Real-time Supabase integration
- **Service Layer**: 36 domain services architecture

---

## **Legacy Integration Issues Resolved**

### **Auth-First Emergency Access** ❌ **RESOLVED**
**Legacy Problem**: Users had to authenticate before accessing emergency services
**Current Solution**: Intent-first access with authentication only when required

### **Separate Emergency Surface** ❌ **RESOLVED**
**Legacy Problem**: EmergencyScreen.jsx as separate component from map
**Current Solution**: Unified MapSheetOrchestrator with emergency phases

### **Manual State Management** ❌ **RESOLVED**
**Legacy Problem**: Manual state synchronization between components
**Current Solution**: Real-time Supabase subscriptions with automatic sync

### **Tab-Based Navigation** ❌ **RESOLVED**
**Legacy Problem**: Emergency tab as primary navigation entry point
**Current Solution**: Map-first orchestration with phase-based navigation

---

## **Current Integration Architecture**

### **Intent-First Emergency Access**
```javascript
// Current implementation allows emergency access without authentication
const handleIntentPress = (intent) => {
  if (intent === "emergency") {
    // Direct emergency access - no authentication required
    router.replace("/(auth)/map");
    return;
  }
  
  // Other intents may require authentication
  router.push({
    pathname: "/(auth)/onboarding",
    params: { intent },
  });
};
```

### **Real-time State Management**
```javascript
// Current implementation uses Supabase subscriptions
const subscribeToEmergencyRequest = (requestId) => {
  return supabase
    .channel(`emergency-request-${requestId}`)
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'emergency_requests' },
      (payload) => updateEmergencyState(payload.new)
    )
    .subscribe();
};
```

### **Cross-Repository Communication**
```javascript
// Current implementation uses shadow table pattern
// emergency_requests (provider-facing) ↔ visits (patient app)
const createEmergencyRequest = async (requestData) => {
  // Create provider-facing request
  const emergencyRequest = await supabase
    .from('emergency_requests')
    .insert(requestData)
    .select()
    .single();
  
  // Create patient app shadow record
  const visit = await supabase
    .from('visits')
    .insert({
      emergency_request_id: emergencyRequest.id,
      user_id: requestData.userId,
      lifecycle_state: 'intent'
    })
    .select()
    .single();
  
  return { emergencyRequest, visit };
};
```

---

## **Preservation Note**

This document is preserved for:
- **Historical Reference**: Understanding integration evolution
- **Technical Debt Tracking**: Legacy integration patterns
- **Migration Context**: Why integration changes were made
- **Audit Trail**: Decision documentation for architectural changes

---

## **Access Instructions**

### **For Historical Research**
This document can be referenced for understanding the evolution from auth-first to intent-first emergency access.

### **For Current Integration**
**DO NOT** use this document for current development. Refer to:
- `/docs/domains/EMERGENCY_LIFECYCLE.md` for emergency flow integration
- `/docs/domains/IDENTITY_AND_AUTH.md` for authentication patterns
- `/docs/system/ARCHITECTURE_OVERVIEW.md` for cross-repository communication

### **For New Development**
Follow the current domain-driven integration patterns:
- Intent-first emergency access
- Real-time Supabase subscriptions
- Shadow table pattern for cross-repository communication

---

## **Key Architectural Changes**

### **Emergency Access Pattern**
| Legacy | Current |
|--------|----------|
| Auth-first emergency access | Intent-first emergency access |
| Authentication required before emergency | Authentication only when required |
| Separate emergency surface | Unified map-first orchestration |
| Manual state management | Real-time Supabase subscriptions |

### **Integration Architecture**
| Legacy | Current |
|--------|----------|
| Direct database access | Supabase service layer |
| Manual state synchronization | Real-time subscriptions |
| Single repository approach | Tripartite system architecture |
| Screen-centric integration | Domain-centric integration |

---

## **Contact Information**

For questions about this archival or current integration:
- **Architecture Team**: Cross-repository communication patterns
- **Domain Team**: Emergency lifecycle integration
- **Auth Team**: Intent-first authentication implementation

---

**This document is archived and should not be used for current integration decisions or development.**
