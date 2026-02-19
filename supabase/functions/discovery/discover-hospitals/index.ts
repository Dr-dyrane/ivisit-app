import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
        console.log('🚀 Edge Function invoked')
        console.log('Request method:', req.method)

        // For hospital discovery, we allow anonymous access but log the request
        const authHeader = req.headers.get('Authorization')
        console.log('Auth header present:', !!authHeader)

        // Optional: Verify JWT if present, but don't require it
        if (authHeader) {
            try {
                const supabaseClient = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                    {
                        global: {
                            headers: { Authorization: authHeader },
                        },
                    }
                )

                const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
                if (!authError && user) {
                    console.log('✅ Authenticated user:', user.id)
                } else {
                    console.log('⚠️ Invalid JWT, proceeding anonymously')
                }
            } catch (e) {
                console.log('⚠️ Auth check failed, proceeding anonymously:', e.message)
            }
        } else {
            console.log('ℹ️ Proceeding without authentication (public discovery)')
        }

        const body = await req.json()
        console.log('Request body:', body)

        const {
            latitude,
            longitude,
            radius = 15000,
            mode = 'nearby', // 'nearby' or 'text_search'
            query, // for text_search mode
            limit = 10,
            includeGooglePlaces = true, // whether to fetch from Google Places
            mergeWithDatabase = true // whether to merge with existing DB data
        } = body

        const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
        const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN')

        console.log('🌍 Processing request...', { latitude, longitude, radius, mode, includeGooglePlaces })

        // Create Supabase client for database operations
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let providerData = []
        let providerSource = 'google'

        // Step 1: Fetch from Provider (Mapbox preferred if token present, or Google as fallback)
        if (includeGooglePlaces) {
            try {
                if (mapboxToken) {
                    // Mapbox Search v1
                    const mapboxUrl = `https://api.mapbox.com/search/searchbox/v1/suggest?q=hospital&proximity=${longitude},${latitude}&limit=10&types=poi&access_token=${mapboxToken}`
                    console.log('🔍 Mapbox Search API call...')
                    const mapboxRes = await fetch(mapboxUrl)
                    const mapboxData = await mapboxRes.json()
                    providerData = mapboxData.suggestions || []
                    providerSource = 'mapbox'
                } else if (googleApiKey) {
                    let googleUrl
                    if (mode === 'text_search' && query) {
                        googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`
                    } else {
                        googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=hospital&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`
                    }
                    console.log('🔍 Google Places API call...')
                    const googleRes = await fetch(googleUrl)
                    const googleData = await googleRes.json()
                    if (googleData.status === 'OK' || googleData.status === 'ZERO_RESULTS') {
                        providerData = googleData.results || []
                        providerSource = 'google'
                    }
                }

                // Step 2: Upsert Provider data to database if merge is enabled
                if (mergeWithDatabase && providerData.length > 0) {
                    const hospitalsToUpsert = providerData.map((place: any) => {
                        if (providerSource === 'mapbox') {
                            return {
                                place_id: place.mapbox_id,
                                name: place.name,
                                address: place.full_address || place.place_formatted,
                                latitude: place.center?.[1] || latitude,
                                longitude: place.center?.[0] || longitude,
                                imported_from_google: false,
                                import_status: 'pending',
                                verified: false,
                                status: 'available'
                            }
                        } else {
                            return {
                                place_id: place.place_id,
                                name: place.name,
                                address: place.vicinity || place.formatted_address,
                                latitude: place.geometry.location.lat,
                                longitude: place.geometry.location.lng,
                                imported_from_google: true,
                                import_status: 'pending',
                                verified: false,
                                status: 'available'
                            }
                        }
                    })

                    const { error: upsertError } = await supabaseClient
                        .from('hospitals')
                        .upsert(hospitalsToUpsert, {
                            onConflict: 'place_id',
                            ignoreDuplicates: false
                        })

                    if (upsertError) console.error('Database upsert error:', upsertError)
                }
            } catch (error) {
                console.error('Provider fetch error:', error)
            }
        }

        // Step 3: Always return data from database (merged with provider data if available)
        const { data: nearbyHospitals, error: rpcError } = await supabaseClient
            .rpc('nearby_hospitals', {
                user_lat: latitude,
                user_lng: longitude,
                radius_km: Math.round(radius / 1000)
            })

        if (rpcError) {
            console.error('RPC error:', rpcError)
            throw rpcError
        }

        // Step 4: Merge and return results
        let finalResults = nearbyHospitals || []

        // If we have provider data but no database results, return provider data directly
        if (finalResults.length === 0 && providerData.length > 0) {
            finalResults = providerData.map((place: any) => {
                if (providerSource === 'mapbox') {
                    return {
                        id: `mapbox_${place.mapbox_id}`,
                        name: place.name,
                        address: place.full_address || place.place_formatted,
                        latitude: place.center?.[1] || latitude,
                        longitude: place.center?.[0] || longitude,
                        verified: false,
                        status: 'available',
                        mapbox_only: true
                    }
                } else {
                    return {
                        id: `google_${place.place_id}`,
                        name: place.name,
                        address: place.vicinity || place.formatted_address,
                        latitude: place.geometry.location.lat,
                        longitude: place.geometry.location.lng,
                        verified: false,
                        status: 'available',
                        google_only: true
                    }
                }
            })
        }

        // Apply limit
        const limitedResults = finalResults.slice(0, limit)

        console.log(`✅ Returning ${limitedResults.length} hospitals (Source: ${providerSource}, count: ${providerData.length})`)

        return new Response(JSON.stringify({
            data: limitedResults,
            meta: {
                provider_count: providerData.length,
                provider_source: providerSource,
                database_count: nearbyHospitals?.length || 0,
                merged_count: limitedResults.length,
                mode,
                radius_km: Math.round(radius / 1000)
            }
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('❌ Edge Function Error:', error)
        console.error('Error stack:', error.stack)
        console.error('Error message:', error.message)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'

        return new Response(JSON.stringify({
            error: errorMessage,
            details: error.stack || 'No stack trace available'
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
