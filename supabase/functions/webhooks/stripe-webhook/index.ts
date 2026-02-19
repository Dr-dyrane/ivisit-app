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

    const signature = req.headers.get('stripe-signature')
    if (!signature) {
        return new Response('Missing stripe-signature', { status: 400 })
    }

    try {
        const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
            apiVersion: '2022-11-15',
            httpClient: Stripe.createFetchHttpClient(),
        })

        const body = await req.text()
        const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''

        let event
        try {
            event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`)
            return new Response(`Webhook Error: ${err.message}`, { status: 400 })
        }

        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        console.log(`🔔 Received Stripe event: ${event.type}`)

        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log(`💰 PaymentIntent succeeded: ${paymentIntent.id}`)

                // Update payment status in DB
                const { error: updateError } = await supabaseAdmin
                    .from('payments')
                    .update({
                        status: 'completed',
                        processed_at: new Date().toISOString(),
                        provider_response: paymentIntent
                    })
                    .eq('stripe_payment_intent_id', paymentIntent.id)

                if (updateError) {
                    console.error('Error updating payment status:', updateError)
                }

                // If it's linked to an emergency request, we might want to update that too
                const emergencyRequestId = paymentIntent.metadata.emergency_request_id
                if (emergencyRequestId) {
                    const { error: tripError } = await supabaseAdmin
                        .from('emergency_requests')
                        .update({ payment_status: 'paid' })
                        .eq('id', emergencyRequestId)

                    if (tripError) {
                        console.error('Error updating emergency request status:', tripError)
                    }
                }
                break
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object as Stripe.PaymentIntent
                console.log(`❌ PaymentIntent failed: ${paymentIntent.id}`)

                await supabaseAdmin
                    .from('payments')
                    .update({
                        status: 'failed',
                        processed_at: new Date().toISOString(),
                        provider_response: paymentIntent
                    })
                    .eq('stripe_payment_intent_id', paymentIntent.id)
                break
            }

            case 'account.updated': {
                const account = event.data.object as Stripe.Account
                console.log(`🏥 Account updated: ${account.id}`)

                // Sync organization status
                const { error: orgError } = await supabaseAdmin
                    .from('organizations')
                    .update({
                        is_active: account.details_submitted && account.payouts_enabled,
                        // Store additional info if needed
                    })
                    .eq('stripe_account_id', account.id)

                if (orgError) {
                    console.error('Error syncing organization status:', orgError)
                }
                break
            }

            case 'payout.paid': {
                const payout = event.data.object as Stripe.Payout
                console.log(`💸 Payout completed: ${payout.id}`)

                const stripeAccountId = event.account

                if (stripeAccountId) {
                    // Organization Payout
                    const { data: org } = await supabaseAdmin
                        .from('organizations')
                        .select('id')
                        .eq('stripe_account_id', stripeAccountId)
                        .single()

                    if (org) {
                        const amount = payout.amount / 100
                        const { data: wallet } = await supabaseAdmin
                            .from('organization_wallets')
                            .select('id, balance')
                            .eq('organization_id', org.id)
                            .single()

                        if (wallet) {
                            await supabaseAdmin
                                .from('organization_wallets')
                                .update({
                                    balance: wallet.balance - amount,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('id', wallet.id)

                            await supabaseAdmin.from('wallet_ledger').insert({
                                wallet_id: wallet.id,
                                amount: -amount,
                                transaction_type: 'payout',
                                description: `Payout ${payout.id} to bank`,
                                external_reference: payout.id,
                                metadata: { stripe_payout: payout }
                            })
                        }
                    }
                } else {
                    // Platform Payout (iVisit Main Account)
                    const { data: mainWallet } = await supabaseAdmin
                        .from('ivisit_main_wallet')
                        .select('id, balance')
                        .limit(1)
                        .single()

                    if (mainWallet) {
                        const amount = payout.amount / 100
                        await supabaseAdmin
                            .from('ivisit_main_wallet')
                            .update({
                                balance: mainWallet.balance - amount,
                                last_updated: new Date().toISOString()
                            })
                            .eq('id', mainWallet.id)

                        await supabaseAdmin.from('wallet_ledger').insert({
                            wallet_id: mainWallet.id,
                            amount: -amount,
                            transaction_type: 'payout',
                            description: `Platform Payout ${payout.id} to bank`,
                            external_reference: payout.id,
                            metadata: { stripe_payout: payout }
                        })
                    }
                }
                break
            }

            case 'payout.failed': {
                const payout = event.data.object as Stripe.Payout
                console.error(`❌ Payout failed: ${payout.id}`)
                // Optionally notify the admin/org admin
                break
            }

            default:
                console.log(`Unhandled event type ${event.type}`)
        }

        return new Response(JSON.stringify({ received: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('❌ Webhook Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
