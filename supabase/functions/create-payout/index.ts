import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@12.0.0?target=deno'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader) {
            throw new Error('No authorization header')
        }

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                global: {
                    headers: { Authorization: authHeader },
                },
            }
        )

        // Get the current user
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
        if (authError || !user) {
            throw new Error('Invalid user')
        }

        // Verify user is an org admin or admin
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('role, organization_id')
            .eq('id', user.id)
            .single()

        if (profileError || !profile || (profile.role !== 'org_admin' && profile.role !== 'admin')) {
            throw new Error('Unauthorized: Only organization admins can request payouts')
        }

        const { amount, currency = 'usd', organization_id } = await req.json()

        // Ensure org admin can only payout for their own organization
        if (profile.role === 'org_admin') {
            if (!organization_id || profile.organization_id !== organization_id) {
                throw new Error('Unauthorized: You can only request payouts for your own organization')
            }
        }

        if (!amount) {
            throw new Error('Missing required field: amount')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let stripeAccountId = null

        if (organization_id) {
            // 1. Get Organization Stripe ID
            const { data: organization, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('stripe_account_id')
                .eq('id', organization_id)
                .single()

            if (orgError || !organization || !organization.stripe_account_id) {
                throw new Error('Organization Stripe account not found')
            }
            stripeAccountId = organization.stripe_account_id
        }

        // 2. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const amountInCents = Math.round(amount * 100)

        // 3. Create Payout
        // If stripeAccountId exists, payout from the connected account
        // If not, payout from the platform account (default)
        let payoutOptions: any = {
            amount: amountInCents,
            currency: currency,
        }

        let stripeHeaderOptions: any = {}
        if (stripeAccountId) {
            stripeHeaderOptions.stripeAccount = stripeAccountId
        }

        const payout = await stripe.payouts.create(payoutOptions, stripeHeaderOptions)

        console.log(`✅ Payout created for ${stripeAccountId || 'Platform'}: ${amount} ${currency}`)

        return new Response(JSON.stringify({
            success: true,
            payoutId: payout.id,
            status: payout.status
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('❌ Edge Function Error:', error.message)
        return new Response(JSON.stringify({
            error: error.message
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
