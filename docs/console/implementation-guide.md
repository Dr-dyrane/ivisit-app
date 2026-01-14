# iVisit Console Implementation Guide

## 🚀 Quick Start for Console Developer

### Prerequisites
- Node.js 18+
- Supabase account with access to iVisit project
- Basic knowledge of React/Next.js
- Understanding of the mobile app architecture

### Step 1: Project Setup
```bash
# Create Next.js project
npx create-next-app@latest ivisit-console --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install required dependencies
cd ivisit-console
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query @tanstack/react-table
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
npm install @radix-ui/react-select @radix-ui/react-tabs
npm install class-variance-authority clsx tailwind-merge
npm install lucide-react react-hook-form @hookform/resolvers zod
npm install mapbox-gl react-map-gl date-fns
npm install sonner recharts

# Install dev dependencies
npm install -D @types/node
```

### Step 2: Environment Configuration
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token
```

### Step 3: Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/
│   │   ├── admin/
│   │   ├── sponsor/
│   │   ├── hospital/
│   │   └── provider/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                    # Shadcn/ui components
│   ├── auth/                  # Authentication components
│   ├── dashboard/             # Dashboard components
│   ├── tables/                # Data tables
│   ├── forms/                 # Form components
│   └── maps/                  # Map components
├── lib/
│   ├── supabase/
│   │   ├── client.ts
│   │   ├── server.ts
│   │   └── middleware.ts
│   ├── permissions.ts         # RBAC helpers
│   ├── utils.ts
│   └── validations.ts         # Zod schemas
├── hooks/
│   ├── use-auth.ts
│   ├── use-permissions.ts
│   └── use-realtime.ts
├── types/
│   ├── auth.ts
│   ├── database.ts
│   └── permissions.ts
└── constants/
    ├── roles.ts
    ├── colors.ts
    └── routes.ts
```

## 🔐 Authentication Setup

### Supabase Client Configuration
```typescript
// lib/supabase/client.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export const createClient = () =>
  createClientComponentClient<Database>()

// lib/supabase/server.ts
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const createServerClient = () =>
  createServerComponentClient<Database>({
    cookies
  })
```

### Database Types
```typescript
// types/database.ts
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
      hospitals: {
        Row: {
          id: string
          name: string
          address: string
          phone: string | null
          rating: number
          type: string
          image: string | null
          specialties: string[]
          service_types: string[]
          features: string[]
          emergency_level: string | null
          available_beds: number
          ambulances_count: number
          wait_time: string | null
          price_range: string | null
          latitude: number | null
          longitude: number | null
          verified: boolean
          status: string
          created_at: string
          updated_at: string
        }
        // ... Insert and Update types
      }
      // ... Add all other tables
    }
    Views: {
      admin_profiles_view: {
        Row: {
          id: string
          username: string | null
          email: string
          // ... all view columns
        }
      }
      // ... Add all other views
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
      // ... Add all other functions
    }
  }
}
```

### Authentication Middleware
```typescript
// lib/supabase/middleware.ts
import { createServerMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createServerMiddlewareClient({ req, res })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Redirect unauthenticated users to login
  if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Check role-based access
  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const userRole = profile?.role

    // Role-based redirects
    if (req.nextUrl.pathname.startsWith('/dashboard/admin') && userRole !== 'admin') {
      const redirectUrl = new URL('/unauthorized', req.url)
      return NextResponse.redirect(redirectUrl)
    }

    if (req.nextUrl.pathname.startsWith('/dashboard/sponsor') && userRole !== 'sponsor' && userRole !== 'admin') {
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

## 🎨 UI Component Setup

### Tailwind Configuration
```typescript
// tailwind.config.ts
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
        // iVisit brand colors
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
        border: {
          DEFAULT: '#d0d5dd',
          dark: '#2a2a2a',
        },
        // ... Add all other colors from mobile app
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
    },
  },
  plugins: [],
}

export default config
```

### Base Components
```typescript
// components/ui/button.tsx
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-brand-primary text-primary-foreground hover:bg-brand-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
```

## 🔑 RBAC Implementation

### Permission System
```typescript
// lib/permissions.ts
import { Database } from '@/types/database'

export type UserRole = Database['public']['Tables']['profiles']['Row']['role']
export type Resource = 'users' | 'hospitals' | 'ambulances' | 'emergency_requests' | 'visits' | 'notifications'
export type Action = 'create' | 'read' | 'update' | 'delete'
export type Scope = 'all' | 'own' | 'sponsored'

export interface Permission {
  resource: Resource
  action: Action
  scope: Scope
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    { resource: 'users', action: 'create', scope: 'all' },
    { resource: 'users', action: 'read', scope: 'all' },
    { resource: 'users', action: 'update', scope: 'all' },
    { resource: 'users', action: 'delete', scope: 'all' },
    // ... Add all other permissions for admin
  ],
  sponsor: [
    { resource: 'hospitals', action: 'read', scope: 'sponsored' },
    { resource: 'hospitals', action: 'update', scope: 'sponsored' },
    { resource: 'ambulances', action: 'read', scope: 'sponsored' },
    { resource: 'ambulances', action: 'update', scope: 'sponsored' },
    // ... Add sponsor permissions
  ],
  hospital: [
    { resource: 'hospitals', action: 'read', scope: 'own' },
    { resource: 'emergency_requests', action: 'read', scope: 'own' },
    // ... Add hospital permissions
  ],
  provider: [
    { resource: 'ambulances', action: 'read', scope: 'own' },
    { resource: 'emergency_requests', action: 'read', scope: 'own' },
    // ... Add provider permissions
  ],
  patient: [
    { resource: 'profiles', action: 'read', scope: 'own' },
    { resource: 'medical_profiles', action: 'create', scope: 'own' },
    // ... Add patient permissions
  ],
}
```

### Permission Hook
```typescript
// hooks/use-permissions.ts
import { useAuth } from './use-auth'
import { ROLE_PERMISSIONS, type Resource, type Action, type Scope } from '@/lib/permissions'

export function usePermissions() {
  const { user } = useAuth()

  const hasPermission = (resource: Resource, action: Action, scope: Scope = 'all') => {
    if (!user) return false
    if (user.role === 'admin') return true

    const permissions = ROLE_PERMISSIONS[user.role] || []
    return permissions.some(
      permission =>
        permission.resource === resource &&
        permission.action === action &&
        (permission.scope === scope || permission.scope === 'all')
    )
  }

  const canAccess = (resource: Resource, action: Action, entityId?: string) => {
    if (!hasPermission(resource, action)) return false

    // For sponsor scope, check relationship
    if (user?.role === 'sponsor' && entityId) {
      // Implement sponsor relationship check
      return checkSponsorRelationship(user.id, resource, entityId)
    }

    return true
  }

  return { hasPermission, canAccess }
}

async function checkSponsorRelationship(sponsorId: string, resource: string, entityId: string) {
  // Implement sponsor relationship verification
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

## 📊 Data Tables Implementation

### Generic Table Component
```typescript
// components/tables/data-table.tsx
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchable?: boolean
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchable = true,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      {searchable && (
        <div className="flex items-center py-4">
          <Input
            placeholder={`Filter ${searchKey}...`}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(event) =>
              table.getColumn(searchKey)?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
      )}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

## 🗺️ Map Implementation

### Emergency Map Component
```typescript
// components/maps/emergency-map.tsx
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useState } from 'react'

interface EmergencyMapProps {
  emergencyRequests: EmergencyRequest[]
  ambulances: Ambulance[]
  onMarkerClick?: (type: 'request' | 'ambulance', id: string) => void
}

export function EmergencyMap({ emergencyRequests, ambulances, onMarkerClick }: EmergencyMapProps) {
  const [viewState, setViewState] = useState({
    longitude: -122.4194,
    latitude: 37.7749,
    zoom: 12,
  })

  return (
    <div className="h-full w-full">
      <Map
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
      >
        <NavigationControl />
        
        {/* Emergency Request Markers */}
        {emergencyRequests.map((request) => (
          <Marker
            key={request.id}
            longitude={request.pickup_location?.coordinates[0] || 0}
            latitude={request.pickup_location?.coordinates[1] || 0}
            anchor="bottom"
          >
            <div className="relative">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping" />
            </div>
          </Marker>
        ))}

        {/* Ambulance Markers */}
        {ambulances.map((ambulance) => (
          <Marker
            key={ambulance.id}
            longitude={ambulance.location?.coordinates[0] || 0}
            latitude={ambulance.location?.coordinates[1] || 0}
            anchor="bottom"
          >
            <div className="bg-white rounded-full p-1 shadow-lg">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">🚑</span>
              </div>
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
```

## 🔄 Real-time Integration

### Real-time Hook
```typescript
// hooks/use-realtime.ts
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

## 📱 Dashboard Layout

### Main Layout Component
```typescript
// components/dashboard/layout.tsx
import { Sidebar } from './sidebar'
import { Header } from './header'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### Sidebar Navigation
```typescript
// components/dashboard/sidebar.tsx
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import { usePermissions } from '@/hooks/use-permissions'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['admin', 'sponsor', 'hospital', 'provider'] },
  { name: 'Users', href: '/dashboard/users', icon: '👥', roles: ['admin'] },
  { name: 'Hospitals', href: '/dashboard/hospitals', icon: '🏥', roles: ['admin', 'sponsor'] },
  { name: 'Ambulances', href: '/dashboard/ambulances', icon: '🚑', roles: ['admin', 'sponsor', 'provider'] },
  { name: 'Emergency', href: '/dashboard/emergency', icon: '🚨', roles: ['admin', 'sponsor', 'hospital', 'provider'] },
  { name: 'Visits', href: '/dashboard/visits', icon: '📋', roles: ['admin', 'sponsor', 'hospital'] },
  { name: 'Analytics', href: '/dashboard/analytics', icon: '📈', roles: ['admin', 'sponsor'] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { user } = useAuth()

  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(user?.role || 'patient')
  )

  return (
    <div className="w-64 bg-card border-r">
      <div className="flex h-full flex-col">
        <div className="flex h-16 items-center px-6 border-b">
          <h1 className="text-xl font-bold text-brand-primary">iVisit Console</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  'flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors',
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
```

## 🧪 Testing Setup

### Test Configuration
```typescript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testEnvironment: 'jest-environment-jsdom',
}

module.exports = createJestConfig(customJestConfig)
```

### Example Test
```typescript
// __tests__/components/dashboard/sidebar.test.tsx
import { render, screen } from '@testing-library/react'
import { Sidebar } from '@/components/dashboard/sidebar'
import { useAuth } from '@/hooks/use-auth'

jest.mock('@/hooks/use-auth')

describe('Sidebar', () => {
  it('renders navigation items based on user role', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { role: 'admin' }
    })

    render(<Sidebar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.getByText('Users')).toBeInTheDocument()
    expect(screen.getByText('Hospitals')).toBeInTheDocument()
  })

  it('filters navigation items for non-admin users', () => {
    ;(useAuth as jest.Mock).mockReturnValue({
      user: { role: 'hospital' }
    })

    render(<Sidebar />)

    expect(screen.getByText('Dashboard')).toBeInTheDocument()
    expect(screen.queryByText('Users')).not.toBeInTheDocument()
    expect(screen.getByText('Emergency')).toBeInTheDocument()
  })
})
```

## 🚀 Deployment

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Build the application
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Environment Variables for Production
```bash
# Production environment variables
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
MAPBOX_ACCESS_TOKEN=your_production_mapbox_token
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your_nextauth_secret
```

This comprehensive implementation guide provides everything your console developer needs to get started quickly, from project setup to deployment. Each section includes copy-pasteable code and detailed explanations.
