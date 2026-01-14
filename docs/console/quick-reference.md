# iVisit Console Quick Reference

## 🚀 One-Page Setup Guide

### 1. Environment Setup
```bash
# Create project
npx create-next-app@latest ivisit-console --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr @tanstack/react-query @tanstack/react-table @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs class-variance-authority clsx tailwind-merge lucide-react react-hook-form @hookform/resolvers zod mapbox-gl react-map-gl date-fns sonner recharts

# Copy template files from docs/console/starter-template.md
```

### 2. Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
MAPBOX_ACCESS_TOKEN=your_mapbox_token
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

### 3. Key Files to Copy
- `src/types/database.ts` - Complete database types
- `src/lib/supabase/` - Supabase client configuration
- `src/lib/permissions.ts` - RBAC system
- `src/hooks/use-auth.ts` - Authentication hook
- `src/hooks/use-permissions.ts` - Permission checking
- `src/hooks/use-realtime.ts` - Real-time subscriptions
- `src/app/layout.tsx` - Root layout with providers
- `tailwind.config.ts` - iVisit theme configuration

## 🔐 Authentication Flow

### Login Component
```typescript
// components/auth/login-form.tsx
'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const { signIn, loading, error } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await signIn(email, password)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <Input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Signing in...' : 'Sign In'}
      </Button>
      {error && <p className="text-red-500 text-sm">{error}</p>}
    </form>
  )
}
```

### Protected Route
```typescript
// app/(dashboard)/layout.tsx
import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  return <>{children}</>
}
```

## 📊 Data Table Example

### Users Table
```typescript
// components/tables/users-table.tsx
import { DataTable } from '@/components/ui/data-table'
import { useRealtime } from '@/hooks/use-realtime'
import { usePermissions } from '@/hooks/use-permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const columns = [
  {
    accessorKey: 'username',
    header: 'Username',
  },
  {
    accessorKey: 'email',
    header: 'Email',
  },
  {
    accessorKey: 'role',
    header: 'Role',
    cell: ({ row }) => (
      <Badge variant={row.getValue('role') === 'admin' ? 'destructive' : 'secondary'}>
        {row.getValue('role')}
      </Badge>
    ),
  },
  {
    accessorKey: 'bvn_verified',
    header: 'Verified',
    cell: ({ row }) => (
      <Badge variant={row.getValue('bvn_verified') ? 'default' : 'outline'}>
        {row.getValue('bvn_verified') ? 'Yes' : 'No'}
      </Badge>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const { hasPermission } = usePermissions()
      
      if (!hasPermission('users', 'update')) return null
      
      return (
        <div className="flex space-x-2">
          <Button variant="outline" size="sm">Edit</Button>
          <Button variant="destructive" size="sm">Delete</Button>
        </div>
      )
    },
  },
]

export function UsersTable() {
  const { data: users, loading } = useRealtime('admin_profiles_view')
  
  return (
    <DataTable
      columns={columns}
      data={users || []}
      searchKey="username"
    />
  )
}
```

## 🗺️ Map Component

### Emergency Map
```typescript
// components/maps/emergency-map.tsx
'use client'

import Map, { Marker, NavigationControl } from 'react-map-gl/mapbox'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useRealtime } from '@/hooks/use-realtime'

export function EmergencyMap() {
  const { data: requests } = useRealtime('emergency_requests', { column: 'status', value: 'in_progress' })
  const { data: ambulances } = useRealtime('ambulances')

  return (
    <div className="h-full w-full">
      <Map
        initialViewState={{
          longitude: -122.4194,
          latitude: 37.7749,
          zoom: 12,
        }}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN!}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox-gl/styles/mapbox/dark-v11"
      >
        <NavigationControl />
        
        {/* Emergency Requests */}
        {requests?.map((request) => (
          <Marker
            key={request.id}
            longitude={request.pickup_location?.coordinates[0] || 0}
            latitude={request.pickup_location?.coordinates[1] || 0}
          >
            <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse" />
          </Marker>
        ))}
        
        {/* Ambulances */}
        {ambulances?.map((ambulance) => (
          <Marker
            key={ambulance.id}
            longitude={ambulance.location?.coordinates[0] || 0}
            latitude={ambulance.location?.coordinates[1] || 0}
          >
            <div className="bg-blue-500 rounded-full p-2">
              🚑
            </div>
          </Marker>
        ))}
      </Map>
    </div>
  )
}
```

## 🔑 Permission Checking

### Component with Permissions
```typescript
// components/dashboard/user-management.tsx
'use client'

import { Button } from '@/components/ui/button'
import { usePermissions } from '@/hooks/use-permissions'

export function UserManagement() {
  const { hasPermission } = usePermissions()

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Management</h1>
      
      {hasPermission('users', 'create') && (
        <Button>Add New User</Button>
      )}
      
      {hasPermission('users', 'read') && (
        <UsersTable />
      )}
      
      {!hasPermission('users', 'read') && (
        <p className="text-muted-foreground">
          You don't have permission to view users.
        </p>
      )}
    </div>
  )
}
```

## 📈 Analytics Dashboard

### KPI Cards
```typescript
// components/dashboard/kpi-cards.tsx
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRealtime } from '@/hooks/use-realtime'

export function KPICards() {
  const { data: users } = useRealtime('profiles')
  const { data: hospitals } = useRealtime('hospitals')
  const { data: requests } = useRealtime('emergency_requests')

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          👥
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{users?.length || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hospitals</CardTitle>
          🏥
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{hospitals?.length || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
          🚨
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {requests?.filter(r => r.status === 'in_progress').length || 0}
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available Beds</CardTitle>
          🛏️
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {hospitals?.reduce((sum, h) => sum + (h.available_beds || 0), 0) || 0}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

## 🔄 Real-time Updates

### Notification System
```typescript
// components/notifications/toast-provider.tsx
'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/use-realtime'

export function ToastProvider() {
  const { data: notifications } = useRealtime('notifications')

  useEffect(() => {
    const unreadNotifications = notifications?.filter(n => !n.read)
    
    unreadNotifications?.forEach(notification => {
      toast(notification.title || 'New Notification', {
        description: notification.message,
        action: {
          label: 'View',
          onClick: () => console.log('View notification:', notification.id),
        },
      })
    })
  }, [notifications])

  return null
}
```

## 🎨 UI Components

### Dashboard Layout
```typescript
// components/dashboard/dashboard-layout.tsx
'use client'

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
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊', roles: ['admin', 'sponsor', 'hospital', 'provider'] },
  { name: 'Users', href: '/dashboard/users', icon: '👥', roles: ['admin'] },
  { name: 'Hospitals', href: '/dashboard/hospitals', icon: '🏥', roles: ['admin', 'sponsor'] },
  { name: 'Emergency', href: '/dashboard/emergency', icon: '🚨', roles: ['admin', 'sponsor', 'hospital', 'provider'] },
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

## 📋 Common Tasks

### Create New User
```typescript
// components/forms/create-user-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

export function CreateUserForm() {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    role: 'patient' as const,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: formData.email,
      password: 'temp-password-123',
      email_confirm: true,
    })

    if (authError) {
      console.error('Error creating user:', authError)
      return
    }

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: formData.email,
        username: formData.username,
        role: formData.role,
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        placeholder="Email"
        value={formData.email}
        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
      />
      <Input
        placeholder="Username"
        value={formData.username}
        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
      />
      <Select value={formData.role} onValueChange={(value) => setFormData(prev => ({ ...prev, role: value as any }))}>
        <Select.Trigger>
          <Select.Value placeholder="Select role" />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="patient">Patient</Select.Item>
          <Select.Item value="provider">Provider</Select.Item>
          <Select.Item value="sponsor">Sponsor</Select.Item>
          <Select.Item value="admin">Admin</Select.Item>
        </Select.Content>
      </Select>
      <Button type="submit">Create User</Button>
    </form>
  )
}
```

### Update Hospital Status
```typescript
// components/forms/hospital-status-form.tsx
'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

export function HospitalStatusForm({ hospitalId }: { hospitalId: string }) {
  const [status, setStatus] = useState('available')

  const handleUpdate = async () => {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('hospitals')
      .update({ status })
      .eq('id', hospitalId)

    if (error) {
      console.error('Error updating hospital:', error)
    }
  }

  return (
    <div className="flex space-x-2">
      <Select value={status} onValueChange={setStatus}>
        <Select.Trigger className="w-32">
          <Select.Value />
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="available">Available</Select.Item>
          <Select.Item value="busy">Busy</Select.Item>
          <Select.Item value="full">Full</Select.Item>
        </Select.Content>
      </Select>
      <Button onClick={handleUpdate}>Update</Button>
    </div>
  )
}
```

## 🚨 Common Issues & Solutions

### Real-time Not Working
```typescript
// Make sure to enable Realtime on your Supabase tables
// Database > Replication > Select tables > Enable

// Also check your RLS policies
CREATE POLICY "Enable realtime" ON public.emergency_requests
FOR SELECT USING (auth.role() = 'authenticated');
```

### Permission Errors
```typescript
// Check that your RLS policies match your permission system
CREATE POLICY "Admin full access" ON public.profiles
FOR ALL USING (auth.jwt() ->> 'role' = 'admin');
```

### Map Not Loading
```typescript
// Ensure Mapbox token is set and valid
// Check that mapbox-gl is properly imported
import 'mapbox-gl/dist/mapbox-gl.css'
```

## 📱 Mobile Responsiveness

### Responsive Table
```typescript
// Add to your DataTable component
<div className="rounded-md border">
  <div className="overflow-x-auto">
    <Table>
      {/* Table content */}
    </Table>
  </div>
</div>
```

### Responsive Grid
```typescript
// Use responsive grid classes
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {/* Cards */}
</div>
```

This quick reference provides all the essential code snippets and patterns your console developer will need to implement the iVisit dashboard quickly and efficiently.
