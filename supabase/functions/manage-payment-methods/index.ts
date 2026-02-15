import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('No authorization header')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) throw new Error('Invalid user')

    const { action, organization_id, payment_method_id, payout_details } = await req.json()

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2022-11-15',
      httpClient: Stripe.createFetchHttpClient(),
    })

    let customerId: string | null = null;
    let contextName = '';
    let resolvedOrgId = organization_id;

    if (organization_id) {
      // ID Resolution: Check if beautified ID
      if (/^(IVP|PRV|ORG|AMB|ADM|DSP)-\d{3,6}$/i.test(organization_id)) {
        const { data: uuid, error: resolveError } = await supabaseAdmin.rpc('get_entity_id', {
          p_display_id: organization_id.toUpperCase()
        });
        if (resolveError || !uuid) throw new Error(`Could not resolve organization ID: ${organization_id}`);
        resolvedOrgId = uuid;
      }

      // Organization Flow
      const { data: organization, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('*')
        .eq('id', resolvedOrgId)
        .single()

      if (orgError || !organization) throw new Error('Organization not found')
      customerId = organization.stripe_customer_id
      contextName = organization.name

      if (!customerId) {
        const customer = await stripe.customers.create({
          name: organization.name,
          metadata: { organization_id: organization.id }
        })
        customerId = customer.id
        await supabaseAdmin
          .from('organizations')
          .update({ stripe_customer_id: customerId })
          .eq('id', resolvedOrgId)
      }
    } else {
      // Patient Flow
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (profileError || !profile) throw new Error('Profile not found')
      customerId = profile.stripe_customer_id
      contextName = profile.full_name || user.email

      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: contextName,
          metadata: { user_id: user.id }
        })
        customerId = customer.id
        await supabaseAdmin
          .from('profiles')
          .update({ stripe_customer_id: customerId })
          .eq('id', user.id)
      }
    }

    if (action === 'create-setup-intent') {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId!,
        payment_method_types: ['card'],
        metadata: {
          organization_id: resolvedOrgId || null,
          user_id: resolvedOrgId ? null : user.id
        }
      })
      return new Response(JSON.stringify({ clientSecret: setupIntent.client_secret }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'list-payment-methods') {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId!,
        type: 'card',
      })
      return new Response(JSON.stringify({ data: paymentMethods.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'delete-payment-method') {
      if (!payment_method_id) throw new Error('Payment Method ID required')
      await stripe.paymentMethods.detach(payment_method_id)
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    if (action === 'set-payout-method' && organization_id) {
      if (!payment_method_id) throw new Error('Payment Method ID required')
      const pm = await stripe.paymentMethods.retrieve(payment_method_id)
      await supabaseAdmin
        .from('organizations')
        .update({
          payout_method_id: payment_method_id,
          payout_method_last4: pm.card?.last4,
          payout_method_brand: pm.card?.brand
        })
        .eq('id', resolvedOrgId)

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    throw new Error('Invalid action or missing organization_id for payout setup')

  } catch (error) {
    console.error('❌ Error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
