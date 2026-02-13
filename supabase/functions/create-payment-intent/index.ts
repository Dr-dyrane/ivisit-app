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

        const { amount, currency = 'usd', organization_id, emergency_request_id } = await req.json()

        if (!amount || !organization_id) {
            throw new Error('Missing required fields: amount, organization_id')
        }

        // 1. Get Organization details (stripe_account_id and fee percentage)
        // We use service role to get sensitive info
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: organization, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('stripe_account_id, ivisit_fee_percentage')
            .eq('id', organization_id)
            .single()

        if (orgError || !organization) {
            throw new Error('Organization not found')
        }

        if (!organization.stripe_account_id) {
            throw new Error('Organization has no Stripe account linked')
        }

        // 2. Initialize Stripe
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        // 3. Calculate Fee (2.5% default or organization specific)
        const feePercentage = organization.ivisit_fee_percentage ?? 2.5
        const amountInCents = Math.round(amount * 100)
        const applicationFeeInCents = Math.round((amountInCents * feePercentage) / 100)

        console.log(`Creating PaymentIntent: ${amountInCents} ${currency}, Fee: ${applicationFeeInCents}, Destination: ${organization.stripe_account_id}`)

        // 4. Create PaymentIntent with Destination Charge
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency,
            automatic_payment_methods: {
                enabled: true,
            },
            application_fee_amount: applicationFeeInCents,
            transfer_data: {
                destination: organization.stripe_account_id,
            },
            metadata: {
                user_id: user.id,
                organization_id: organization_id,
                emergency_request_id: emergency_request_id ?? '',
            },
        })

        // 5. Create a record in our payments table (pending)
        const { error: paymentRecordError } = await supabaseAdmin
            .from('payments')
            .insert({
                user_id: user.id,
                organization_id: organization_id,
                emergency_request_id: emergency_request_id,
                amount: amount,
                currency: currency,
                status: 'pending',
                transaction_id: paymentIntent.id,
            })

        if (paymentRecordError) {
            console.error('Error creating payment record:', paymentRecordError)
            // We don't throw here as the PaymentIntent is already created
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
