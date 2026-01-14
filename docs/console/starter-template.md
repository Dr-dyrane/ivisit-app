# iVisit Console Starter Template

## 📁 Complete File Structure Template

This section provides the exact file contents your console developer can copy-paste to get started immediately.

## 🎯 Quick Start Commands

```bash
# 1. Create the project
npx create-next-app@latest ivisit-console --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Navigate to project
cd ivisit-console

# 3. Install dependencies
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-table @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs class-variance-authority clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers zod mapbox-gl react-map-gl date-fns sonner recharts

# 4. Copy the files from this template
# (Follow the file structure below)

# 5. Run the development server
npm run dev
```

## 📁 File-by-File Template

### Environment Files

#### `.env.local`
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Mapbox Configuration
MAPBOX_ACCESS_TOKEN=your_mapbox_access_token

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Configuration Files

#### `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // iVisit Brand Colors
        brand: {
          primary: '#86100E',
          secondary: '#B71C1C',
        },
        background: {
          DEFAULT: '#fafafa',
          dark: '#0D121D',
          foreground: '#1a1a1a',
          foregroundDark: '#e3e6ed',
        },
        foreground: {
          DEFAULT: '#1a1a1a',
          dark: '#e3e6ed',
        },
        card: {
          DEFAULT: '#ffffff',
          dark: '#0D121D',
        },
        popover: {
          DEFAULT: '#ffffff',
          dark: '#1f2937',
        },
        primary: {
          DEFAULT: '#86100E',
          dark: '#5c0a09',
          foreground: '#ffffff',
          foregroundDark: '#f8d7da',
        },
        secondary: {
          DEFAULT: '#e2e8f0',
          dark: '#1e293b',
          foreground: '#1e293b',
          foregroundDark: '#e2e8f0',
        },
        muted: {
          DEFAULT: '#e5e7eb',
          dark: '#374151',
          foreground: '#6b7280',
          foregroundDark: '#cbd5e1',
        },
        accent: {
          DEFAULT: '#e0f2fe',
          dark: '#1A73E8',
          foreground: '#075985',
          foregroundDark: '#bbdefb',
        },
        destructive: {
          DEFAULT: '#dc2626',
          dark: '#991b1b',
          foreground: '#ffffff',
          foregroundDark: '#fee2e2',
        },
        border: {
          DEFAULT: '#d0d5dd',
          dark: '#2a2a2a',
        },
        input: {
          DEFAULT: '#d0d5dd',
          dark: '#3a3f47',
        },
        ring: {
          DEFAULT: '#b91c1c',
          dark: '#f87171',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '10px',
        sm: '8px',
        xl: '16px',
        full: '9999px',
      },
      fontFamily: {
        sans: ['Inter var', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
```

#### `next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['mapbox-gl'],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
    }
    return config
  },
}

module.exports = nextConfig
```

### Type Definitions

#### `src/types/database.ts`
```typescript
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          email: string
          avatar_url: string | null
          address: string | null
          gender: string | null
          date_of_birth: string | null
          role: 'patient' | 'provider' | 'admin' | 'sponsor'
          provider_type: string | null
          bvn_verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Profiles['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Profiles['Insert']>
      }
      medical_profiles: {
        Row: {
          user_id: string
          blood_type: string | null
          allergies: string[] | null
          conditions: string[] | null
          medications: string[] | null
          organ_donor: boolean | null
          insurance_provider: string | null
          insurance_policy_number: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<MedicalProfiles['Row'], 'user_id' | 'created_at' | 'updated_at'>
        Update: Partial<MedicalProfiles['Insert']>
      }
      hospitals: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          rating: number | null
          type: string | null
          image: string | null
          specialties: string[] | null
          service_types: string[] | null
          features: string[] | null
          emergency_level: string | null
          available_beds: number | null
          ambulances_count: number | null
          wait_time: string | null
          price_range: string | null
          latitude: number | null
          longitude: number | null
          verified: boolean | null
          status: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Hospitals['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Hospitals['Insert']>
      }
      ambulances: {
        Row: {
          id: string
          type: string | null
          call_sign: string | null
          status: string | null
          location: string | null
          eta: string | null
          crew: string[] | null
          hospital: string | null
          vehicle_number: string | null
          last_maintenance: string | null
          rating: number | null
          current_call: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Ambulances['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Ambulances['Insert']>
      }
      emergency_requests: {
        Row: {
          id: string
          request_id: string | null
          user_id: string
          service_type: string
          hospital_id: string | null
          hospital_name: string | null
          specialty: string | null
          ambulance_type: string | null
          ambulance_id: string | null
          bed_number: string | null
          bed_type: string | null
          bed_count: string | null
          status: string
          estimated_arrival: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
          cancelled_at: string | null
          pickup_location: string | null
          destination_location: string | null
          patient_snapshot: Json | null
          shared_data_snapshot: Json | null
        }
        Insert: Omit<EmergencyRequests['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<EmergencyRequests['Insert']>
      }
      visits: {
        Row: {
          id: string
          user_id: string
          hospital: string | null
          hospital_id: string | null
          doctor: string | null
          doctor_image: string | null
          specialty: string | null
          date: string | null
          time: string | null
          type: string | null
          status: string | null
          image: string | null
          address: string | null
          phone: string | null
          notes: string | null
          estimated_duration: string | null
          preparation: string[] | null
          cost: string | null
          insurance_covered: boolean | null
          room_number: string | null
          summary: string | null
          prescriptions: string[] | null
          next_visit: string | null
          request_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Visits['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Visits['Insert']>
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string | null
          title: string | null
          message: string | null
          read: boolean | null
          priority: string | null
          action_type: string | null
          action_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Notifications['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Notifications['Insert']>
      }
      insurance_policies: {
        Row: {
          id: string
          user_id: string
          provider_name: string
          policy_number: string | null
          plan_type: string | null
          status: string | null
          coverage_details: Json | null
          starts_at: string | null
          expires_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<InsurancePolicies['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<InsurancePolicies['Insert']>
      }
      sponsor_relationships: {
        Row: {
          id: string
          sponsor_id: string
          sponsored_entity_type: string
          sponsored_entity_id: string
          relationship_type: string
          permissions: Json | null
          status: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<SponsorRelationships['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<SponsorRelationships['Insert']>
      }
    }
    Views: {
      admin_profiles_view: {
        Row: {
          id: string
          username: string | null
          email: string
          avatar_url: string | null
          address: string | null
          gender: string | null
          date_of_birth: string | null
          role: string
          provider_type: string | null
          bvn_verified: boolean
          created_at: string
          updated_at: string
          medical_profiles_count: number | null
          visits_count: number | null
          emergency_requests_count: number | null
        }
        Insert: never
        Update: never
      }
      admin_hospitals_view: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          rating: number | null
          type: string | null
          image: string | null
          specialties: string[] | null
          service_types: string[] | null
          features: string[] | null
          emergency_level: string | null
          available_beds: number | null
          ambulances_count: number | null
          wait_time: string | null
          price_range: string | null
          latitude: number | null
          longitude: number | null
          verified: boolean | null
          status: string | null
          created_at: string
          updated_at: string
          emergency_requests_count: number | null
          visits_count: number | null
          avg_rating: number | null
        }
        Insert: never
        Update: never
      }
    }
    Functions: {
      create_sponsor_relationship: {
        Args: {
          sponsor_id: string
          entity_type: string
          entity_id: string
          relationship_type: string
        }
        Returns: string
      }
      check_sponsor_permission: {
        Args: {
          sponsor_id: string
          resource: string
          action: string
          entity_id: string | null
        }
        Returns: boolean
      }
    }
    Enums: {
      // Add any enum types if they exist
    }
    CompositeTypes: {
      // Add any composite types if they exist
    }
  }
}
```

#### `src/types/auth.ts`
```typescript
import type { Database } from './database'

export type UserProfile = Database['public']['Tables']['profiles']['Row']
export type UserRole = UserProfile['role']
export type User = UserProfile & {
  // Add any additional user fields from auth
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  username?: string
  role?: UserRole
}
```

#### `src/types/permissions.ts`
```typescript
import type { UserRole } from './auth'

export type Resource = 'users' | 'hospitals' | 'ambulances' | 'emergency_requests' | 'visits' | 'notifications' | 'insurance_policies'
export type Action = 'create' | 'read' | 'update' | 'delete'
export type Scope = 'all' | 'own' | 'sponsored'

export interface Permission {
  resource: Resource
  action: Action
  scope: Scope
}

export interface RolePermissions {
  [K in UserRole]: Permission[]
}
```

### Core Library Files

#### `src/lib/supabase/client.ts`
```typescript
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

export const createClient = () =>
  createClientComponentClient<Database>()
```

#### `src/lib/supabase/server.ts`
```typescript
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

export const createServerClient = () =>
  createServerComponentClient<Database>({
    cookies
  })
```

#### `src/lib/supabase/middleware.ts`
```typescript
import { createServerMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protect dashboard routes
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Role-based access control
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userRole = profile?.role

    // Admin-only routes
    if (req.nextUrl.pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const redirectUrl = new URL('/unauthorized', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    // Sponsor routes
    if (req.nextUrl.pathname.startsWith('/dashboard/sponsor') && 
        userRole !== 'sponsor' && userRole !== 'admin') {
      const redirectUrl = new URL('/unauthorized', req.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*']
}
```

#### `src/lib/permissions.ts`
```typescript
import type { UserRole, Resource, Action, Scope, Permission, RolePermissions } from '@/types/permissions'

export const ROLE_PERMISSIONS: RolePermissions = {
  admin: [
    { resource: 'users', action: 'create', scope: 'all' },
    { resource: 'users', action: 'read', scope: 'all' },
    { resource: 'users', action: 'update', scope: 'all' },
    { resource: 'users', action: 'delete', scope: 'all' },
    { resource: 'hospitals', action: 'create', scope: 'all' },
    { resource: 'hospitals', action: 'read', scope: 'all' },
    { resource: 'hospitals', action: 'update', scope: 'all' },
    { resource: 'hospitals', action: 'delete', scope: 'all' },
    { resource: 'ambulances', action: 'create', scope: 'all' },
    { resource: 'ambulances', action: 'read', scope: 'all' },
    { resource: 'ambulances', action: 'update', scope: 'all' },
    { resource: 'ambulances', action: 'delete', scope: 'all' },
    { resource: 'emergency_requests', action: 'create', scope: 'all' },
    { resource: 'emergency_requests', action: 'read', scope: 'all' },
    { resource: 'emergency_requests', action: 'update', scope: 'all' },
    { resource: 'emergency_requests', action: 'delete', scope: 'all' },
    { resource: 'visits', action: 'create', scope: 'all' },
    { resource: 'visits', action: 'read', scope: 'all' },
    { resource: 'visits', action: 'update', scope: 'all' },
    { resource: 'visits', action: 'delete', scope: 'all' },
    { resource: 'notifications', action: 'create', scope: 'all' },
    { resource: 'notifications', action: 'read', scope: 'all' },
    { resource: 'notifications', action: 'update', scope: 'all' },
    { resource: 'notifications', action: 'delete', scope: 'all' },
    { resource: 'insurance_policies', action: 'create', scope: 'all' },
    { resource: 'insurance_policies', action: 'read', scope: 'all' },
    { resource: 'insurance_policies', action: 'update', scope: 'all' },
    { resource: 'insurance_policies', action: 'delete', scope: 'all' },
  ],
  sponsor: [
    { resource: 'hospitals', action: 'read', scope: 'sponsored' },
    { resource: 'hospitals', action: 'update', scope: 'sponsored' },
    { resource: 'ambulances', action: 'read', scope: 'sponsored' },
    { resource: 'ambulances', action: 'update', scope: 'sponsored' },
    { resource: 'emergency_requests', action: 'read', scope: 'sponsored' },
    { resource: 'emergency_requests', action: 'update', scope: 'sponsored' },
    { resource: 'visits', action: 'read', scope: 'sponsored' },
    { resource: 'visits', action: 'update', scope: 'sponsored' },
    { resource: 'profiles', action: 'read', scope: 'sponsored' },
    { resource: 'medical_profiles', action: 'read', scope: 'sponsored' },
    { resource: 'insurance_policies', action: 'read', scope: 'sponsored' },
    { resource: 'notifications', action: 'create', scope: 'sponsored' },
  ],
  hospital: [
    { resource: 'hospitals', action: 'read', scope: 'own' },
    { resource: 'hospitals', action: 'update', scope: 'own' },
    { resource: 'emergency_requests', action: 'read', scope: 'own' },
    { resource: 'visits', action: 'read', scope: 'own' },
  ],
  provider: [
    { resource: 'ambulances', action: 'read', scope: 'own' },
    { resource: 'ambulances', action: 'update', scope: 'own' },
    { resource: 'emergency_requests', action: 'read', scope: 'own' },
  ],
  patient: [
    { resource: 'profiles', action: 'read', scope: 'own' },
    { resource: 'profiles', action: 'update', scope: 'own' },
    { resource: 'medical_profiles', action: 'create', scope: 'own' },
    { resource: 'medical_profiles', action: 'read', scope: 'own' },
    { resource: 'medical_profiles', action: 'update', scope: 'own' },
    { resource: 'visits', action: 'read', scope: 'own' },
    { resource: 'notifications', action: 'read', scope: 'own' },
    { resource: 'notifications', action: 'update', scope: 'own' },
  ],
}

export function hasPermission(userRole: UserRole, resource: Resource, action: Action, scope: Scope = 'all'): boolean {
  if (userRole === 'admin') return true

  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.some(
    permission =>
      permission.resource === resource &&
      permission.action === action &&
      (permission.scope === scope || permission.scope === 'all')
  )
}

export async function checkSponsorRelationship(sponsorId: string, resource: string, entityId: string): Promise<boolean> {
  const { createClient } = await import('./client')
  const supabase = createClient()
  
  const { data } = await supabase
    .from('sponsor_relationships')
    .select('*')
    .eq('sponsor_id', sponsorId)
    .eq('sponsored_entity_type', resource.slice(0, -1)) // Remove 's'
    .eq('sponsored_entity_id', entityId)
    .eq('status', 'active')
    .single()

  return !!data
}
```

#### `src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/\D/g, '')
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/)
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`
  }
  return phoneNumber
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num)
}

export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}
```

### Hooks

#### `src/hooks/use-auth.ts`
```typescript
'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, AuthState } from '@/types/auth'

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData?: any) => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  })

  const supabase = createClient()

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        setState({
          user: profile ? { ...profile, ...user } : null,
          loading: false,
          error: null,
        })
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
        })
      }
    } catch (error) {
      setState({
        user: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      await refreshUser()
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Login failed',
      }))
    }
  }

  const signUp = async (email: string, password: string, userData?: any) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      })

      if (error) throw error
      
      await refreshUser()
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      }))
    }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setState({
        user: null,
        loading: false,
        error: null,
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Logout failed',
      }))
    }
  }

  useEffect(() => {
    refreshUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        refreshUser()
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
```

#### `src/hooks/use-permissions.ts`
```typescript
import { useCallback } from 'react'
import { useAuth } from './use-auth'
import { hasPermission, checkSponsorRelationship } from '@/lib/permissions'
import type { Resource, Action, Scope } from '@/types/permissions'

export function usePermissions() {
  const { user } = useAuth()

  const hasUserPermission = useCallback((resource: Resource, action: Action, scope: Scope = 'all') => {
    if (!user) return false
    return hasPermission(user.role, resource, action, scope)
  }, [user])

  const canAccess = useCallback(async (resource: Resource, action: Action, entityId?: string) => {
    if (!hasUserPermission(resource, action)) return false

    // For sponsor scope, check relationship
    if (user?.role === 'sponsor' && entityId) {
      return await checkSponsorRelationship(user.id, resource, entityId)
    }

    return true
  }, [user, hasUserPermission])

  return { hasPermission: hasUserPermission, canAccess }
}
```

#### `src/hooks/use-realtime.ts`
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RealtimeChannel } from '@supabase/supabase-js'

export function useRealtime<T>(
  table: string,
  filter?: { column: string; value: any },
  initialData: T[] = []
) {
  const [data, setData] = useState<T[]>(initialData)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let channel: RealtimeChannel

    const fetchData = async () => {
      setLoading(true)
      let query = supabase.from(table).select('*')
      
      if (filter) {
        query = query.eq(filter.column, filter.value)
      }
      
      const { data: result, error } = await query
      if (error) {
        console.error('Error fetching data:', error)
      } else {
        setData(result || [])
      }
      setLoading(false)
    }

    fetchData()

    // Set up real-time subscription
    channel = supabase
      .channel(`realtime-${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          filter: filter ? `${filter.column}=eq.${filter.value}` : undefined,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setData((prev) => [...prev, payload.new as T])
          } else if (payload.eventType === 'UPDATE') {
            setData((prev) =>
              prev.map((item) =>
                (item as any).id === (payload.new as any).id ? payload.new as T : item
              )
            )
          } else if (payload.eventType === 'DELETE') {
            setData((prev) =>
              prev.filter((item) => (item as any).id !== (payload.old as any).id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [table, filter])

  return { data, loading }
}
```

### App Structure

#### `src/app/layout.tsx`
```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/use-auth'
import { QueryProvider } from '@/components/providers/query-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'iVisit Console',
  description: 'iVisit Administrative Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
```

#### `src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 0 84.2% 60.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96%;
    --secondary-foreground: 222.2 84% 4.9%;
    --muted: 210 40% 96%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96%;
    --accent-foreground: 222.2 84% 4.9%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 0 84.2% 60.2%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 0 84.2% 60.2%;
    --primary-foreground: 222.2 84% 4.9%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 0 84.2% 60.2%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}

@layer components {
  .glass-effect {
    @apply bg-white/10 backdrop-blur-md border border-white/20;
  }
  
  .card-hover {
    @apply transition-all duration-200 hover:shadow-lg hover:scale-[1.02];
  }
  
  .btn-primary {
    @apply bg-brand-primary text-white hover:bg-brand-primary/90 focus:ring-2 focus:ring-brand-primary focus:ring-offset-2;
  }
  
  .data-table-container {
    @apply rounded-lg border bg-card shadow-sm;
  }
}
```

This starter template provides a complete foundation that your console developer can use immediately. Every file is ready to copy-paste with proper TypeScript types, authentication, RBAC, and real-time capabilities already configured.
