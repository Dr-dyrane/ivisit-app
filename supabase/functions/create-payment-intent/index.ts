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

        const { amount, currency = 'usd', organization_id, emergency_request_id, is_top_up } = await req.json()

        if (!amount) {
            throw new Error('Missing required field: amount')
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let stripeAccountId = null
        let feePercentage = 2.5
        let isPlatformAction = false
        let resolvedOrgId = organization_id

        if (!organization_id) {
            // Platform actions (require Admin role)
            const { data: profile } = await supabaseAdmin
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single()

            if (profile?.role !== 'admin') {
                throw new Error('Unauthorized: Platform actions require Admin role')
            }
            isPlatformAction = true
        } else {
            // ID Resolution: Check if beautified ID (e.g. ORG-000001)
            if (/^(IVP|PRV|ORG|AMB|ADM|DSP)-\d{3,6}$/i.test(organization_id)) {
                console.log(`Resolving beautified ID: ${organization_id}`)
                const { data: uuid, error: resolveError } = await supabaseAdmin.rpc('get_entity_id', {
                    p_display_id: organization_id.toUpperCase()
                })
                if (resolveError || !uuid) {
                    throw new Error(`Could not resolve organization ID: ${organization_id}`)
                }
                resolvedOrgId = uuid
            }

            // Organization Flow
            const { data: organization, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('stripe_account_id, ivisit_fee_percentage')
                .eq('id', resolvedOrgId)
                .single()

            if (orgError || !organization) {
                throw new Error(`Organization not found (${resolvedOrgId})`)
            }
            stripeAccountId = organization.stripe_account_id
            feePercentage = organization.ivisit_fee_percentage ?? 2.5
        }

        // 2. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 3. Calculate Fee & Prep Intent
        const amountInCents = Math.round(amount * 100)
        let applicationFeeInCents = 0
        let intentOptions: any = {
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: { enabled: true },
            metadata: {
                user_id: user.id,
                organization_id: resolvedOrgId || 'platform',
                emergency_request_id: emergency_request_id ?? '',
                is_top_up: is_top_up ? 'true' : 'false'
            },
        }

        if (isPlatformAction) {
            console.log(`Creating Platform PaymentIntent: ${amountInCents} ${currency}`)
        } else {
            applicationFeeInCents = Math.round((amountInCents * feePercentage) / 100)
            console.log(`Creating Org PaymentIntent: ${amountInCents} ${currency}, Fee: ${applicationFeeInCents}, Destination: ${stripeAccountId}`)

            intentOptions.application_fee_amount = applicationFeeInCents
            intentOptions.transfer_data = {
                destination: stripeAccountId,
            }
        }

        const paymentIntent = await stripe.paymentIntents.create(intentOptions)

        // 4. Create a record in our payments table (pending)
        const { error: paymentRecordError } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: user.id,
                organization_id: resolvedOrgId, // null for platform
                emergency_request_id: emergency_request_id,
                amount: amount,
                currency: currency,
                status: 'pending',
                transaction_id: paymentIntent.id,
            })

        if (paymentRecordError) {
            console.error('Error creating payment record:', paymentRecordError)
        }

        return new Response(JSON.stringify({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
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
