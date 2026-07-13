import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.91.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

const respond = (body: Record<string, unknown>, status: number) => new Response(
  JSON.stringify(body),
  { status, headers: corsHeaders },
)

const ALLOWED_ROLES = new Set(['provider', 'viewer', 'dispatcher', 'org_admin', 'sponsor'])
const ORG_ADMIN_ROLES = new Set(['provider', 'viewer', 'dispatcher'])

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return respond({ error: 'Method not allowed.' }, 405)

  const authHeader = request.headers.get('Authorization') || ''
  if (!authHeader.startsWith('Bearer ')) return respond({ error: 'Authentication required.' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || ''
  const consoleUrl = (Deno.env.get('CONSOLE_URL') || 'https://console.ivisit.ng').replace(/\/$/, '')
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const token = authHeader.slice('Bearer '.length)
  const { data: userData, error: userError } = await admin.auth.getUser(token)
  if (userError || !userData.user) return respond({ error: 'Authentication required.' }, 401)

  const actorClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: actor, error: actorError } = await actorClient
    .from('profiles')
    .select('role, organization_id')
    .eq('id', userData.user.id)
    .single()

  if (actorError || !actor || !['admin', 'org_admin'].includes(actor.role)) {
    return respond({ error: 'Administrator access required.' }, 403)
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return respond({ error: 'Invalid request.' }, 400)
  }

  const email = String(payload.email || '').trim().toLowerCase()
  const role = String(payload.role || 'viewer').trim().toLowerCase()
  const providerType = String(payload.provider_type || payload.providerType || '').trim().toLowerCase() || null
  const requestedOrganizationId = String(payload.organization_id || payload.organizationId || '').trim()
  const organizationId = actor.role === 'org_admin'
    ? String(actor.organization_id || '')
    : requestedOrganizationId

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !ALLOWED_ROLES.has(role)) {
    return respond({ error: 'Email or role is invalid.' }, 400)
  }

  if (role === 'provider' && !['hospital', 'ambulance_service', 'ambulance', 'doctor', 'driver', 'paramedic', 'pharmacy', 'clinic'].includes(providerType || '')) {
    return respond({ error: 'Choose a provider type.' }, 400)
  }

  if (!organizationId) return respond({ error: 'Organization is required.' }, 400)
  if (actor.role === 'org_admin' && (!actor.organization_id || !ORG_ADMIN_ROLES.has(role))) {
    return respond({ error: 'This role requires platform administrator approval.' }, 403)
  }

  const { data: organization, error: organizationError } = await actorClient
    .from('organizations')
    .select('id, is_active')
    .eq('id', organizationId)
    .single()

  if (organizationError || !organization?.is_active) return respond({ error: 'Organization is invalid.' }, 400)

  const { data: invitation, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${consoleUrl}/set-password`,
    data: { invited_by: userData.user.id },
  })

  if (inviteError || !invitation.user?.id) {
    return respond({ error: 'The invitation could not be sent.' }, 400)
  }

  const { data: assignment, error: profileError } = await admin.rpc('complete_console_user_invitation', {
    p_target_user_id: invitation.user.id,
    p_actor_user_id: userData.user.id,
    p_organization_id: organizationId,
    p_role: role,
    p_provider_type: providerType,
  })

  if (profileError || assignment?.success !== true) {
    return respond({
      error: 'The invitation was queued, but access assignment needs review.',
      delivery: { emailQueued: true, roleGranted: false, organizationLinked: false },
    }, 500)
  }

  return respond({
    success: true,
    delivery: { emailQueued: true, roleGranted: true, organizationLinked: true },
  }, 200)
})
