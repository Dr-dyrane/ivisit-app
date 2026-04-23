# WELCOME_SCREEN_DOSSIER - ARCHIVAL NOTICE

## ⚠️ **ARCHIVED DOCUMENT - SCREEN-SPECIFIC DOCUMENTATION**

### **Archival Date**: April 23, 2026  
### **Reason**: Screen-scoped drift - Document reflects screen-specific documentation patterns that conflict with domain-driven architecture

---

## **Historical Context**

This document was created when the iVisit app used a **screen-centric documentation pattern** with detailed specifications for individual screens. The architecture has since evolved to a **domain-driven documentation pattern** that focuses on business logic and architectural boundaries.

### **Legacy Documentation Pattern (No Longer Active)**
- **Screen-Centric**: Individual screen specifications
- **Component-Focused**: Detailed component documentation
- **UI-First**: User interface specifications
- **Feature-Scoped**: Documentation aligned with features

### **Current Documentation Pattern (Active)**
- **Domain-Centric**: Business logic domains
- **Architecture-Focused**: System boundaries and data flow
- **Service-First**: Service layer patterns
- **Intent-Driven**: Intent-first authentication and access

---

## **Migration Path**

### **Where to Find Current Information**

#### **Identity & Auth Domain**
📖 **New Location**: `/docs/domains/IDENTITY_AND_AUTH.md`
- **Content**: Intent-first authentication with emergency override
- **Implementation**: AuthContext and authService patterns
- **Welcome Flow**: WelcomeScreen.jsx intent orchestration

#### **System Architecture**
📖 **New Location**: `/docs/system/ARCHITECTURE_OVERVIEW.md`
- **Content**: Tripartite system boundaries
- **Data Flow**: Cross-repository communication
- **Welcome Integration**: Auth flow and user onboarding

#### **Engineering Standards**
📖 **New Location**: `/docs/standards/CONTEXT_MANAGEMENT.md`
- **Content**: React Context patterns for state management
- **Implementation**: AuthContext and GlobalLocationContext
- **Best Practices**: Context composition and optimization

---

## **Current Implementation**

### **Welcome Screen Integration**
```javascript
// screens/WelcomeScreen.jsx - Current implementation
export default function WelcomeScreen() {
  const { user } = useAuthContext();
  const { getCurrentLocation } = useGlobalLocation();
  
  // Intent-first emergency access
  const handleIntentPress = (intent) => {
    if (intent === "emergency") {
      router.replace("/(auth)/map");
      return;
    }
    
    router.push({
      pathname: "/(auth)/onboarding",
      params: { intent },
    });
  };
  
  // Location sync for hospital discovery
  useEffect(() => {
    syncUserLocation();
  }, []);
  
  return (
    <WelcomeScreenOrchestrator
      deviceVariant={deviceVariant}
      onIntentPress={handleIntentPress}
    />
  );
}
```

### **Domain-Driven Documentation**
The current documentation structure focuses on:
- **Identity & Auth Domain**: Authentication flows and user management
- **Emergency Lifecycle Domain**: 15-phase state machine
- **Location Services Domain**: GPS and geospatial services
- **System Architecture**: Tripartite system boundaries

---

## **Key Differences**

### **Documentation Pattern**
| Legacy | Current |
|--------|----------|
| Screen-specific specifications | Domain-driven documentation |
| Component-focused | Architecture-focused |
| UI-first documentation | Service-first documentation |
| Feature-scoped | Intent-driven |

### **Welcome Flow Documentation**
| Legacy | Current |
|--------|----------|
| WelcomeScreen.jsx specification | Identity & Auth domain |
| Component state management | Context management patterns |
| UI layout documentation | System architecture boundaries |
| Feature description | Intent-first access patterns |

---

## **Preservation Note**

This document is preserved for:
- **Historical Reference**: Understanding documentation evolution
- **Technical Debt Tracking**: Legacy screen documentation patterns
- **Migration Context**: Why documentation patterns changed
- **Audit Trail**: Decision documentation for documentation reorganization

---

## **Access Instructions**

### **For Historical Research**
This document can be referenced for understanding the evolution from screen-centric to domain-driven documentation.

### **For Current Implementation**
**DO NOT** use this document for current development. Refer to:
- `/docs/domains/IDENTITY_AND_AUTH.md` for authentication and welcome flows
- `/docs/system/ARCHITECTURE_OVERVIEW.md` for system boundaries
- `/docs/standards/CONTEXT_MANAGEMENT.md` for context patterns

### **For New Development**
Follow the current domain-driven documentation structure:
- Domain-centric documentation
- Service-first patterns
- Intent-driven architecture
- System boundary clarity

---

**This document is archived and should not be used for current development or architectural decisions.**
