# iVisit Dashboard CRUD Plan

## Overview
Comprehensive dashboard plan for full CRUD operations on all Supabase tables. This dashboard will provide administrative control over the entire iVisit ecosystem.

## 🗄️ Database Schema Analysis

### Core Tables Identified:
1. **profiles** - User management with roles (patient, provider, admin)
2. **medical_profiles** - Patient medical information
3. **hospitals** - Hospital network management
4. **ambulances** - Ambulance fleet management
5. **emergency_requests** - Emergency service requests
6. **visits** - Patient visit history
7. **notifications** - System notifications
8. **insurance_policies** - Insurance management

## 🎯 Dashboard Architecture

### Authentication & Authorization
```javascript
// Role-based access control
const ROLES = {
  ADMIN: 'admin',        // Full access to all tables
  SPONSOR: 'sponsor',    // Hospital/Provider sponsor access
  HOSPITAL: 'hospital',   // Hospital-specific data
  PROVIDER: 'provider',   // Provider-specific data
  PATIENT: 'patient'     // Limited to own data
};

// Permission matrix
const PERMISSIONS = {
  admin: ['*'], // Full CRUD on all tables
  sponsor: [
    'hospitals:read:own', 'hospitals:update:own', 
    'ambulances:read:own', 'ambulances:update:own',
    'emergency_requests:read:own', 'emergency_requests:update:own',
    'visits:read:own', 'visits:update:own',
    'profiles:read:sponsored', 'medical_profiles:read:sponsored',
    'insurance_policies:read:own', 'notifications:manage:own'
  ],
  hospital: ['hospitals:read:own', 'emergency_requests:read', 'visits:read:own'],
  provider: ['ambulances:read:own', 'emergency_requests:read:own'],
  patient: ['profiles:read:own', 'medical_profiles:crud:own', 'visits:read:own']
};

// Sponsor relationship mapping
const SPONSOR_RELATIONSHIPS = {
  hospital_sponsor: {
    can_manage: ['hospitals', 'ambulances', 'emergency_requests', 'visits'],
    scope: 'owned_facilities'
  },
  provider_sponsor: {
    can_manage: ['ambulances', 'emergency_requests'],
    scope: 'owned_vehicles'
  }
};
```

## � RBAC System Design

### Database Schema for RBAC
```sql
-- Sponsor relationships table
CREATE TABLE IF NOT EXISTS public.sponsor_relationships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    sponsor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    sponsored_entity_type text NOT NULL CHECK (sponsored_entity_type IN ('hospital', 'ambulance_service', 'provider')),
    sponsored_entity_id uuid NOT NULL,
    relationship_type text NOT NULL CHECK (relationship_type IN ('owner', 'manager', 'operator')),
    permissions jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'terminated')),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(sponsor_id, sponsored_entity_type, sponsored_entity_id)
);

-- Role permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    role text NOT NULL,
    resource text NOT NULL,
    action text NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),
    scope text DEFAULT 'all' CHECK (scope IN ('all', 'own', 'sponsored')),
    constraints jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Insert default permissions
INSERT INTO public.role_permissions (role, resource, action, scope) VALUES
-- Admin permissions
('admin', '*', '*', 'all'),

-- Sponsor permissions
('sponsor', 'hospitals', 'read', 'sponsored'),
('sponsor', 'hospitals', 'update', 'sponsored'),
('sponsor', 'ambulances', 'read', 'sponsored'),
('sponsor', 'ambulances', 'update', 'sponsored'),
('sponsor', 'emergency_requests', 'read', 'sponsored'),
('sponsor', 'emergency_requests', 'update', 'sponsored'),
('sponsor', 'visits', 'read', 'sponsored'),
('sponsor', 'visits', 'update', 'sponsored'),
('sponsor', 'profiles', 'read', 'sponsored'),
('sponsor', 'medical_profiles', 'read', 'sponsored'),
('sponsor', 'insurance_policies', 'read', 'sponsored'),
('sponsor', 'notifications', 'create', 'sponsored'),

-- Hospital permissions
('hospital', 'hospitals', 'read', 'own'),
('hospital', 'emergency_requests', 'read', 'own'),
('hospital', 'visits', 'read', 'own'),

-- Provider permissions
('provider', 'ambulances', 'read', 'own'),
('provider', 'emergency_requests', 'read', 'own'),

-- Patient permissions
('patient', 'profiles', 'read', 'own'),
('patient', 'medical_profiles', 'create', 'own'),
('patient', 'medical_profiles', 'read', 'own'),
('patient', 'medical_profiles', 'update', 'own'),
('patient', 'visits', 'read', 'own');
```

### RBAC Middleware Implementation
```javascript
// Permission checking middleware
const checkPermission = (resource, action, scope = 'all') => {
  return async (req, res, next) => {
    const { user } = req;
    const userRole = user?.role;
    
    // Admin bypass
    if (userRole === 'admin') {
      return next();
    }
    
    // Check role permissions
    const hasPermission = await checkRolePermission(userRole, resource, action, scope);
    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // For sponsor scope, verify relationship
    if (scope === 'sponsored' && userRole === 'sponsor') {
      const hasRelationship = await verifySponsorRelationship(user.id, resource, req.params.id);
      if (!hasRelationship) {
        return res.status(403).json({ error: 'No sponsor relationship' });
      }
    }
    
    next();
  };
};

// Database functions for permission checking
async function checkRolePermission(role, resource, action, scope) {
  const { data } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role)
    .eq('resource', '*')
    .eq('action', '*')
    .single();
    
  if (data) return true; // Wildcard permission found
  
  const { data: specificPermission } = await supabase
    .from('role_permissions')
    .select('*')
    .eq('role', role)
    .eq('resource', resource)
    .eq('action', action)
    .eq('scope', scope)
    .single();
    
  return !!specificPermission;
}

async function verifySponsorRelationship(sponsorId, resource, entityId) {
  const entityType = resource.slice(0, -1); // Remove 's' from plural
  
  const { data } = await supabase
    .from('sponsor_relationships')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .eq('sponsored_entity_type', entityType)
    .eq('sponsored_entity_id', entityId)
    .eq('status', 'active')
    .single();
    
  return !!data;
}
```

### Sponsor Dashboard Features
```javascript
// Sponsor-specific dashboard components
const SponsorDashboard = () => {
  const { user } = useAuth();
  const [sponsoredEntities, setSponsoredEntities] = useState([]);
  
  useEffect(() => {
    fetchSponsoredEntities();
  }, [user.id]);
  
  const fetchSponsoredEntities = async () => {
    const { data } = await supabase
      .from('sponsor_relationships')
      .select(`
        *,
        sponsored_entity:hospitals(id, name, type, status),
        sponsored_ambulance:ambulances(id, call_sign, status)
      `)
      .eq('sponsor_id', user.id)
      .eq('status', 'active');
      
    setSponsoredEntities(data);
  };
  
  return (
    <div className="sponsor-dashboard">
      <SponsorOverview entities={sponsoredEntities} />
      <EntityManagement entities={sponsoredEntities} />
      <PerformanceMetrics sponsorId={user.id} />
    </div>
  );
};

// Sponsor entity management component
const EntityManagement = ({ entities }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {entities.map(entity => (
        <EntityCard 
          key={entity.id}
          entity={entity}
          onEdit={handleEditEntity}
          onViewDetails={handleViewDetails}
        />
      ))}
    </div>
  );
};
```

### Frontend Permission Hooks
```javascript
// React hooks for permission checking
const usePermissions = () => {
  const { user } = useAuth();
  
  const hasPermission = useCallback((resource, action, scope = 'all') => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    
    return user.permissions?.some(permission => 
      permission.resource === resource &&
      permission.action === action &&
      (permission.scope === scope || permission.scope === 'all')
    );
  }, [user]);
  
  const canAccess = useCallback((resource, action, entityId = null) => {
    if (!hasPermission(resource, action)) return false;
    
    // For sponsor scope, check relationship
    if (user?.role === 'sponsor' && entityId) {
      return checkSponsorRelationship(user.id, resource, entityId);
    }
    
    return true;
  }, [user, hasPermission]);
  
  return { hasPermission, canAccess };
};

// Usage in components
const HospitalManagement = () => {
  const { canAccess } = usePermissions();
  
  return (
    <div>
      {canAccess('hospitals', 'create') && (
        <Button onClick={handleCreateHospital}>Add Hospital</Button>
      )}
      
      <DataTable
        data={hospitals}
        actions={[
          canAccess('hospitals', 'update') && 'edit',
          canAccess('hospitals', 'delete') && 'delete'
        ].filter(Boolean)}
      />
    </div>
  );
};
```

## � Dashboard Modules

### 1. User Management Module

#### Profiles Table CRUD
```sql
-- Table: profiles
-- Columns: id, username, email, avatar_url, address, gender, date_of_birth, role, provider_type, bvn_verified

CREATE VIEW admin_profiles_view AS
SELECT 
  p.id,
  p.username,
  p.email,
  p.avatar_url,
  p.address,
  p.gender,
  p.date_of_birth,
  p.role,
  p.provider_type,
  p.bvn_verified,
  p.created_at,
  p.updated_at,
  COUNT(DISTINCT mp.user_id) as medical_profiles_count,
  COUNT(DISTINCT v.user_id) as visits_count,
  COUNT(DISTINCT er.user_id) as emergency_requests_count
FROM public.profiles p
LEFT JOIN public.medical_profiles mp ON p.id = mp.user_id
LEFT JOIN public.visits v ON p.id = v.user_id
LEFT JOIN public.emergency_requests er ON p.id = er.user_id
GROUP BY p.id;
```

**CRUD Operations:**
- **Create**: New user registration, role assignment
- **Read**: User listing with filters, search, pagination
- **Update**: Profile editing, role changes, BVN verification
- **Delete**: User deactivation (soft delete)

**Dashboard Features:**
- User search by email/username
- Role-based filtering
- BVN verification status
- User activity metrics
- Bulk operations (role changes, deactivation)

#### Medical Profiles CRUD
```sql
-- Table: medical_profiles
-- Columns: user_id, blood_type, allergies, conditions, medications, organ_donor, insurance_provider, insurance_policy_number, emergency_contact_*

CREATE VIEW admin_medical_profiles_view AS
SELECT 
  mp.*,
  p.username,
  p.email,
  p.avatar_url
FROM public.medical_profiles mp
JOIN public.profiles p ON mp.user_id = p.id;
```

**CRUD Operations:**
- **Create**: Auto-create on user registration
- **Read**: Medical information access (with consent)
- **Update**: Medical information updates
- **Delete**: Medical data removal (GDPR compliance)

### 2. Hospital Management Module

#### Hospitals Table CRUD
```sql
-- Table: hospitals
-- Columns: id, name, address, phone, rating, type, image, specialties, service_types, features, emergency_level, available_beds, ambulances_count, wait_time, price_range, latitude, longitude, verified, status

CREATE VIEW admin_hospitals_view AS
SELECT 
  h.*,
  COUNT(DISTINCT er.id) as emergency_requests_count,
  COUNT(DISTINCT v.id) as visits_count,
  AVG(CASE WHEN h.rating > 0 THEN h.rating END) as avg_rating
FROM public.hospitals h
LEFT JOIN public.emergency_requests er ON h.id::text = er.hospital_id
LEFT JOIN public.visits v ON h.id::text = v.hospital_id
GROUP BY h.id;
```

**CRUD Operations:**
- **Create**: Add new hospitals to network
- **Read**: Hospital listing with real-time data
- **Update**: Hospital information, bed counts, services
- **Delete**: Hospital removal (with data migration)

**Dashboard Features:**
- Hospital search and filtering
- Real-time bed availability
- Rating management
- Service type management
- Geographic location management
- Verification status control

### 3. Ambulance Fleet Management

#### Ambulances Table CRUD
```sql
-- Table: ambulances
-- Columns: id, type, call_sign, status, location, eta, crew, hospital, vehicle_number, last_maintenance, rating, current_call

CREATE VIEW admin_ambulances_view AS
SELECT 
  a.*,
  ST_X(a.location::geometry) as longitude,
  ST_Y(a.location::geometry) as latitude,
  h.name as hospital_name,
  COUNT(DISTINCT er.id) as active_requests_count
FROM public.ambulances a
LEFT JOIN public.hospitals h ON a.hospital = h.name
LEFT JOIN public.emergency_requests er ON a.id = er.ambulance_id
GROUP BY a.id, h.name;
```

**CRUD Operations:**
- **Create**: Add new ambulances to fleet
- **Read**: Real-time fleet status
- **Update**: Location updates, status changes, crew assignments
- **Delete**: Vehicle decommissioning

**Dashboard Features:**
- Real-time GPS tracking
- Fleet status overview
- Crew management
- Maintenance scheduling
- Performance metrics
- Dispatch management

### 4. Emergency Services Management

#### Emergency Requests CRUD
```sql
-- Table: emergency_requests
-- Columns: id, request_id, user_id, service_type, hospital_id, hospital_name, specialty, ambulance_type, ambulance_id, bed_number, bed_type, bed_count, status, estimated_arrival, pickup_location, destination_location, patient_snapshot, shared_data_snapshot

CREATE VIEW admin_emergency_requests_view AS
SELECT 
  er.*,
  p.username as patient_name,
  p.email as patient_email,
  p.phone as patient_phone,
  ST_X(er.pickup_location::geometry) as pickup_longitude,
  ST_Y(er.pickup_location::geometry) as pickup_latitude,
  ST_X(er.destination_location::geometry) as dest_longitude,
  ST_Y(er.destination_location::geometry) as dest_latitude,
  a.call_sign as ambulance_call_sign,
  h.name as hospital_name
FROM public.emergency_requests er
JOIN public.profiles p ON er.user_id = p.id
LEFT JOIN public.ambulances a ON er.ambulance_id = a.id
LEFT JOIN public.hospitals h ON er.hospital_id = h.id::text;
```

**CRUD Operations:**
- **Create**: Manual emergency request creation
- **Read**: Request monitoring with real-time updates
- **Update**: Status changes, ambulance assignment, hospital changes
- **Delete**: Request cancellation

**Dashboard Features:**
- Live request monitoring
- Geographic request mapping
- Status workflow management
- Ambulance dispatch interface
- Hospital capacity integration
- Response time analytics

### 5. Visit Management Module

#### Visits Table CRUD
```sql
-- Table: visits
-- Columns: id, user_id, hospital, hospital_id, doctor, doctor_image, specialty, date, time, type, status, image, address, phone, notes, estimated_duration, preparation, cost, insurance_covered, room_number, summary, prescriptions, next_visit, request_id

CREATE VIEW admin_visits_view AS
SELECT 
  v.*,
  p.username as patient_name,
  p.email as patient_email,
  h.name as hospital_name,
  h.phone as hospital_phone,
  h.address as hospital_address
FROM public.visits v
JOIN public.profiles p ON v.user_id = p.id
LEFT JOIN public.hospitals h ON v.hospital_id = h.id::text;
```

**CRUD Operations:**
- **Create**: Manual visit scheduling
- **Read**: Visit history and upcoming appointments
- **Update**: Visit details, status changes, medical records
- **Delete**: Visit cancellation

**Dashboard Features:**
- Appointment scheduling
- Visit history tracking
- Medical record management
- Prescription management
- Insurance integration
- Follow-up scheduling

### 6. Insurance Management Module

#### Insurance Policies CRUD
```sql
-- Table: insurance_policies
-- Columns: id, user_id, provider_name, policy_number, plan_type, status, coverage_details, starts_at, expires_at

CREATE VIEW admin_insurance_policies_view AS
SELECT 
  ip.*,
  p.username as patient_name,
  p.email as patient_email,
  CASE 
    WHEN ip.expires_at < now() THEN 'expired'
    WHEN ip.expires_at < now() + interval '30 days' THEN 'expiring_soon'
    ELSE ip.status
  END as computed_status
FROM public.insurance_policies ip
JOIN public.profiles p ON ip.user_id = p.id;
```

**CRUD Operations:**
- **Create**: New policy registration
- **Read**: Policy management and verification
- **Update**: Policy details, coverage changes
- **Delete**: Policy cancellation

**Dashboard Features:**
- Policy verification
- Coverage management
- Expiration tracking
- Claims integration
- Provider network management

### 7. Notification Management

#### Notifications CRUD
```sql
-- Table: notifications
-- Columns: id, user_id, type, title, message, read, priority, action_type, action_data

CREATE VIEW admin_notifications_view AS
SELECT 
  n.*,
  p.username as patient_name,
  p.email as patient_email
FROM public.notifications n
JOIN public.profiles p ON n.user_id = p.id;
```

**CRUD Operations:**
- **Create**: System notifications, alerts
- **Read**: Notification history and analytics
- **Update**: Read status, priority changes
- **Delete**: Notification cleanup

**Dashboard Features:**
- Bulk notification sending
- Template management
- Delivery analytics
- Priority management
- Campaign tracking

## 🎨 Dashboard UI Components

### Layout Structure
```jsx
// Dashboard Layout
<DashboardLayout>
  <Sidebar>
    <NavigationMenu items={navigationItems} />
    <UserMenu user={currentUser} />
  </Sidebar>
  
  <MainContent>
    <Header>
      <SearchBar />
      <NotificationBell />
      <ThemeToggle />
    </Header>
    
    <Routes>
      <Route path="/users" component={UserManagement} />
      <Route path="/hospitals" component={HospitalManagement} />
      <Route path="/ambulances" component={AmbulanceManagement} />
      <Route path="/emergency" component={EmergencyManagement} />
      <Route path="/visits" component={VisitManagement} />
      <Route path="/insurance" component={InsuranceManagement} />
      <Route path="/notifications" component={NotificationManagement} />
    </Routes>
  </MainContent>
</DashboardLayout>
```

### Reusable Components
```jsx
// Data Table Component
<DataTable
  data={tableData}
  columns={tableColumns}
  filters={filterOptions}
  pagination={paginationConfig}
  actions={rowActions}
  loading={isLoading}
/>

// Form Component
<DynamicForm
  schema={formSchema}
  initialValues={initialData}
  onSubmit={handleSubmit}
  validation={validationRules}
/>

// Map Component
<MapView
  markers={locationData}
  onMarkerClick={handleMarkerClick}
  filters={mapFilters}
  realTime={true}
/>

// Analytics Component
<AnalyticsDashboard
  metrics={analyticsData}
  timeRange={selectedRange}
  charts={chartConfig}
  exportable={true}
/>
```

## 🔧 Technical Implementation

### Frontend Stack
```javascript
// Technology Choices
{
  "framework": "React 18",
  "routing": "React Router v6",
  "state": "Zustand / Redux Toolkit",
  "ui": "Tailwind CSS + Headless UI",
  "charts": "Recharts / Chart.js",
  "maps": "Mapbox / Google Maps",
  "tables": "TanStack Table",
  "forms": "React Hook Form + Zod",
  "realtime": "Supabase Realtime",
  "http": "TanStack Query (React Query)"
}
```

### API Integration
```javascript
// Supabase Client Configuration
const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY,
  {
    realtime: {
      params: {
        eventsPerSecond: 10
      }
    }
  }
);

// Real-time Subscriptions
const subscribeToTable = (tableName, callback) => {
  return supabase
    .channel(`admin_${tableName}`)
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: tableName },
      callback
    )
    .subscribe();
};
```

### Data Fetching Patterns
```javascript
// React Query Hooks
const useUsers = (filters) => {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => fetchUsers(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
};

const useCreateUser = () => {
  return useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast.success('User created successfully');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });
};
```

## 📊 Analytics & Reporting

### Key Metrics
```javascript
const DASHBOARD_METRICS = {
  users: {
    total: 'SELECT COUNT(*) FROM profiles',
    byRole: 'SELECT role, COUNT(*) FROM profiles GROUP BY role',
    newToday: 'SELECT COUNT(*) FROM profiles WHERE created_at >= today()',
    verified: 'SELECT COUNT(*) FROM profiles WHERE bvn_verified = true'
  },
  emergency: {
    activeRequests: 'SELECT COUNT(*) FROM emergency_requests WHERE status = \'in_progress\'',
    avgResponseTime: 'SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) FROM emergency_requests',
    byServiceType: 'SELECT service_type, COUNT(*) FROM emergency_requests GROUP BY service_type'
  },
  hospitals: {
    totalBeds: 'SELECT SUM(available_beds) FROM hospitals',
    avgWaitTime: 'SELECT AVG(wait_time) FROM hospitals',
    byType: 'SELECT type, COUNT(*) FROM hospitals GROUP BY type'
  }
};
```

### Report Generation
```javascript
const generateReport = async (type, dateRange, filters) => {
  const reportData = await fetchReportData(type, dateRange, filters);
  
  return {
    csv: generateCSV(reportData),
    pdf: generatePDF(reportData),
    excel: generateExcel(reportData)
  };
};
```

## 🔒 Security Considerations

### Row Level Security (RLS) with Sponsor Support
```sql
-- Admin-specific policies
CREATE POLICY "Admin full access" ON public.profiles
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- Sponsor-specific policies for hospitals
CREATE POLICY "Sponsor hospital access" ON public.hospitals
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND sr.sponsored_entity_id = hospitals.id
    AND sr.status = 'active'
  )
);

-- Sponsor-specific policies for ambulances
CREATE POLICY "Sponsor ambulance access" ON public.ambulances
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    JOIN public.hospitals h ON sr.sponsored_entity_id = h.id
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND h.name = ambulances.hospital
    AND sr.status = 'active'
  )
);

-- Sponsor-specific policies for emergency requests
CREATE POLICY "Sponsor emergency request access" ON public.emergency_requests
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND sr.sponsored_entity_id = emergency_requests.hospital_id::uuid
    AND sr.status = 'active'
  )
);

-- Sponsor-specific policies for visits
CREATE POLICY "Sponsor visit access" ON public.visits
FOR ALL USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND sr.sponsored_entity_id = visits.hospital_id::uuid
    AND sr.status = 'active'
  )
);

-- Sponsor access to sponsored user profiles
CREATE POLICY "Sponsor profile access" ON public.profiles
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    JOIN public.emergency_requests er ON sr.sponsored_entity_id = er.hospital_id::uuid
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND er.user_id = profiles.id
    AND sr.status = 'active'
  )
);

-- Sponsor access to medical profiles of sponsored users
CREATE POLICY "Sponsor medical profile access" ON public.medical_profiles
FOR SELECT USING (
  auth.jwt() ->> 'role' = 'admin' OR
  EXISTS (
    SELECT 1 FROM public.sponsor_relationships sr
    JOIN public.emergency_requests er ON sr.sponsored_entity_id = er.hospital_id::uuid
    WHERE sr.sponsor_id = auth.uid()
    AND sr.sponsored_entity_type = 'hospital'
    AND er.user_id = medical_profiles.user_id
    AND sr.status = 'active'
  )
);
```

### Sponsor Management Functions
```sql
-- Function to create sponsor relationship
CREATE OR REPLACE FUNCTION create_sponsor_relationship(
  sponsor_id uuid,
  entity_type text,
  entity_id uuid,
  relationship_type text DEFAULT 'owner'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  relationship_id uuid;
BEGIN
  -- Validate sponsor role
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = sponsor_id AND role = 'sponsor'
  ) THEN
    RAISE EXCEPTION 'User must be a sponsor';
  END IF;
  
  -- Create relationship
  INSERT INTO public.sponsor_relationships (
    sponsor_id, sponsored_entity_type, sponsored_entity_id, relationship_type
  ) VALUES (
    sponsor_id, entity_type, entity_id, relationship_type
  )
  RETURNING id INTO relationship_id;
  
  RETURN relationship_id;
END;
$$;

-- Function to check sponsor permissions
CREATE OR REPLACE FUNCTION check_sponsor_permission(
  sponsor_id uuid,
  resource text,
  action text,
  entity_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_permission boolean := false;
BEGIN
  -- Check if sponsor has permission for this action
  SELECT EXISTS (
    SELECT 1 FROM public.role_permissions rp
    WHERE rp.role = 'sponsor'
    AND rp.resource = resource
    AND rp.action = action
    AND (rp.scope = 'all' OR rp.scope = 'sponsored')
  ) INTO has_permission;
  
  IF NOT has_permission THEN
    RETURN false;
  END IF;
  
  -- If entity_id is provided, verify relationship
  IF entity_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.sponsor_relationships sr
      WHERE sr.sponsor_id = sponsor_id
      AND sr.sponsored_entity_type = resource
      AND sr.sponsored_entity_id = entity_id
      AND sr.status = 'active'
    ) INTO has_permission;
  END IF;
  
  RETURN has_permission;
END;
$$;
```

### Audit Trail for Sponsor Actions
```sql
-- Enhanced audit table with sponsor tracking
CREATE TABLE admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES profiles(id),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_values jsonb,
  new_values jsonb,
  sponsor_relationship_id uuid REFERENCES sponsor_relationships(id),
  created_at timestamptz DEFAULT now()
);

-- Enhanced trigger for sponsor audit logging
CREATE OR REPLACE FUNCTION sponsor_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO admin_audit_log (
    admin_id, action, table_name, record_id, old_values, new_values, sponsor_relationship_id
  )
  SELECT 
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id)::text,
    row_to_json(OLD),
    row_to_json(NEW),
    sr.id
  FROM public.sponsor_relationships sr
  WHERE sr.sponsor_id = auth.uid()
  AND sr.status = 'active'
  LIMIT 1;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

## 🚀 Implementation Roadmap

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Dashboard layout and navigation
- [ ] Authentication and authorization with RBAC
- [ ] Base components (tables, forms, modals)
- [ ] Supabase integration
- [ ] Real-time subscriptions
- [ ] Sponsor relationship management system
- [ ] Role-based permission middleware

### Phase 2: User & Sponsor Management (Week 3)
- [ ] Profiles CRUD operations
- [ ] Medical profiles management
- [ ] Role-based access control
- [ ] User search and filtering
- [ ] Bulk operations
- [ ] Sponsor onboarding workflow
- [ ] Sponsor-entity relationship management
- [ ] Sponsor dashboard components

### Phase 3: Hospital & Ambulance Management (Week 4)
- [ ] Hospital CRUD with location management
- [ ] Ambulance fleet tracking
- [ ] Real-time status updates
- [ ] Geographic visualization
- [ ] Performance analytics
- [ ] Sponsor-specific hospital/ambulance access
- [ ] Entity ownership verification

### Phase 4: Emergency Services (Week 5)
- [ ] Emergency request monitoring
- [ ] Dispatch interface
- [ ] Real-time tracking
- [ ] Status workflow management
- [ ] Response analytics
- [ ] Sponsor emergency request filtering
- [ ] Hospital-specific request routing

### Phase 5: Visit & Insurance Management (Week 6)
- [ ] Visit scheduling and history
- [ ] Insurance policy management
- [ ] Notification system
- [ ] Report generation
- [ ] Data export functionality
- [ ] Sponsor visit analytics
- [ ] Sponsored user management

### Phase 6: Analytics & Optimization (Week 7-8)
- [ ] Advanced analytics dashboard
- [ ] Custom report builder
- [ ] Performance optimization
- [ ] Mobile responsiveness
- [ ] Testing and deployment
- [ ] Sponsor performance metrics
- [ ] Multi-tenant reporting

## 📱 Responsive Design

### Breakpoints
```css
/* Mobile */
@media (max-width: 768px) {
  .dashboard { grid-template-columns: 1fr; }
  .sidebar { transform: translateX(-100%); }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .dashboard { grid-template-columns: 250px 1fr; }
}

/* Desktop */
@media (min-width: 1025px) {
  .dashboard { grid-template-columns: 280px 1fr; }
}
```

## 🎯 Performance Optimization

### Strategies
- **Virtual Scrolling**: For large data tables
- **Lazy Loading**: For map markers and images
- **Caching**: React Query with smart invalidation
- **Debouncing**: For search inputs
- **Pagination**: Server-side pagination for all tables
- **Compression**: Gzip compression for API responses

### Monitoring
- **Error Tracking**: Sentry integration
- **Performance**: Web Vitals monitoring
- **Analytics**: User interaction tracking
- **Health Checks**: API endpoint monitoring

This comprehensive plan provides a complete CRUD dashboard for all iVisit database tables with proper security, real-time features, and administrative capabilities.
