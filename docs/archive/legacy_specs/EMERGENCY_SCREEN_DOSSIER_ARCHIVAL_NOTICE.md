# EMERGENCY_SCREEN_DOSSIER - ARCHIVAL NOTICE

## ⚠️ **ARCHIVED DOCUMENT - LEGACY SCREEN SPECIFICATION**

### **Archival Date**: April 23, 2026  
### **Reason**: Feature-scoped drift - Document reflects legacy Tab-based navigation patterns that conflict with active Map-First orchestration system

---

## **Historical Context**

This document was created when the iVisit app used a **Tab-based navigation system** with separate `EmergencyScreen.jsx` components. The architecture has since evolved to a **Map-first orchestration system** with a 15-phase state machine.

### **Legacy Architecture (No Longer Active)**
- **Tab-based Navigation**: Emergency tab as primary entry point
- **Separate EmergencyScreen**: 49KB monolithic component
- **Bottom Sheet Tracking**: Traditional mobile pattern
- **Screen-Centric Design**: Individual screen specifications

### **Current Architecture (Active)**
- **Map-First Orchestration**: 15-phase state machine
- **MapSheetOrchestrator**: Central state management
- **Device Variants**: 13 device-specific implementations
- **Domain-Centric Design**: Emergency lifecycle domain

---

## **Migration Path**

### **Where to Find Current Information**

#### **Emergency Lifecycle Domain**
📖 **New Location**: `/docs/domains/EMERGENCY_LIFECYCLE.md`
- **Content**: 15-phase state machine documentation
- **Implementation**: MapSheetOrchestrator.jsx patterns
- **Real-time**: Supabase subscription architecture

#### **System Architecture**
📖 **New Location**: `/docs/system/ARCHITECTURE_OVERVIEW.md`
- **Content**: Tripartite system boundaries
- **Data Flow**: Cross-repository communication
- **Service Layer**: 36 domain services mapping

#### **Data Model**
📖 **New Location**: `/docs/system/DATA_MODEL_DOCTRINE.md`
- **Content**: Supabase schema with shadow table pattern
- **Real-time**: Subscription architecture
- **Geospatial**: PostGIS integration patterns

---

## **Legacy Components Referenced**

### **Archived Components**
- `EmergencyScreen.jsx` (49KB) - Legacy emergency shell
- `RequestAmbulanceScreen.jsx` (25KB) - Separate request flow
- `BottomSheetController.jsx` - Legacy tracking patterns

### **Current Components**
- `MapSheetOrchestrator.jsx` - 15-phase state machine
- `EmergencyIntakeOrchestrator.jsx` - Device-specific intake
- `Location Search Modal System` - 6 UI states

---

## **Key Differences**

### **Navigation Pattern**
| Legacy | Current |
|--------|----------|
| Tab-based emergency access | Map-first orchestration |
| Separate screens for each action | Unified state machine |
| Bottom sheet tracking | Phase-based transitions |
| Screen-centric documentation | Domain-centric documentation |

### **State Management**
| Legacy | Current |
|--------|----------|
| Screen-level state | Context-driven orchestration |
| Component-based navigation | Phase-based navigation |
| Manual state sync | Real-time Supabase subscriptions |

### **Device Support**
| Legacy | Current |
|--------|----------|
| Mobile-first only | 13 device variants |
| Single implementation | Orchestrator pattern |
| Limited responsive design | Comprehensive device orchestration |

---

## **Preservation Note**

This document is preserved for:
- **Historical Reference**: Understanding architectural evolution
- **Technical Debt Tracking**: Legacy component identification
- **Migration Context**: Why changes were made
- **Audit Trail**: Decision documentation

---

## **Access Instructions**

### **For Historical Research**
This document can be referenced for understanding the evolution from Tab-based to Map-first architecture.

### **For Current Implementation**
**DO NOT** use this document for current development. Refer to:
- `/docs/domains/EMERGENCY_LIFECYCLE.md` for emergency flow
- `/docs/system/ARCHITECTURE_OVERVIEW.md` for system design
- `/docs/system/DATA_MODEL_DOCTRINE.md` for data model

### **For New Development**
Follow the current domain-driven documentation structure in `/docs/domains/` and `/docs/system/`.

---

## **Contact Information**

For questions about this archival or current architecture:
- **Architecture Team**: System architecture documentation
- **Domain Team**: Emergency lifecycle implementation
- **Documentation Team**: Documentation standards and maintenance

---

**This document is archived and should not be used for current development or architectural decisions.**
