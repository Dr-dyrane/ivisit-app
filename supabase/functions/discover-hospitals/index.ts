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

        console.log('🌍 Processing request...', { latitude, longitude, radius, mode, includeGooglePlaces })

        // Create Supabase client for database operations
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        let googlePlacesData = []
        
        // Step 1: Fetch from Google Places if requested
        if (includeGooglePlaces && googleApiKey) {
            try {
                let googleUrl
                
                if (mode === 'text_search' && query) {
                    // Text search mode
                    googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`
                } else {
                    // Nearby search mode (default)
                    googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radius}&type=hospital&key=${googleApiKey}&fields=place_id,name,formatted_address,geometry,rating,photos,opening_hours,formatted_phone_number,website`
                }
                
                console.log('🔍 Google Places API call...')
                const googleRes = await fetch(googleUrl)
                const googleData = await googleRes.json()

                console.log('Google API Status:', googleData.status)
                console.log('Results count:', googleData.results?.length || 0)

                if (googleData.status === 'OK' || googleData.status === 'ZERO_RESULTS') {
                    googlePlacesData = googleData.results || []
                    
                    // Step 2: Upsert Google Places data to database if merge is enabled
                    if (mergeWithDatabase && googlePlacesData.length > 0) {
                        const hospitalsToUpsert = googlePlacesData.map((place: any) => ({
                            place_id: place.place_id,
                            name: place.name,
                            address: place.vicinity || place.formatted_address,
                            google_address: place.vicinity || place.formatted_address,
                            google_phone: place.formatted_phone_number,
                            google_website: place.website,
                            latitude: place.geometry.location.lat,
                            longitude: place.geometry.location.lng,
                            google_rating: place.rating,
                            google_photos: place.photos?.map((photo: any) => 
                                `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${googleApiKey}`
                            ) || [],
                            google_opening_hours: place.opening_hours,
                            google_types: place.types,
                            import_status: 'pending',
                            verified: false,
                            status: 'available',
                            imported_from_google: true,
                            last_google_sync: new Date().toISOString()
                        }))

                        const { error: upsertError } = await supabaseClient
                            .from('hospitals')
                            .upsert(hospitalsToUpsert, {
                                onConflict: 'place_id',
                                ignoreDuplicates: false // Update existing records
                            })

                        if (upsertError) {
                            console.error('Database upsert error:', upsertError)
                        } else {
                            console.log('✅ Successfully upserted', hospitalsToUpsert.length, 'hospitals to database')
                        }
                    }
                } else {
                    console.warn('Google Places API error:', googleData.status, googleData.error_message)
                }
            } catch (error) {
                console.error('Google Places API fetch error:', error)
                // Continue with database data even if Google fails
            }
        }

        // Step 3: Always return data from database (merged with Google data if available)
        const { data: nearbyHospitals, error: rpcError } = await supabaseClient
            .rpc('nearby_hospitals', {
                user_lat: latitude,
                user_lng: longitude,
                radius_km: Math.round(radius / 1000) // Convert meters to km
            })

        if (rpcError) {
            console.error('RPC error:', rpcError)
            throw rpcError
        }

        // Step 4: Merge and return results
        let finalResults = nearbyHospitals || []
        
        // If we have Google Places data but no database results, return Google data directly
        if (finalResults.length === 0 && googlePlacesData.length > 0) {
            finalResults = googlePlacesData.map((place: any) => ({
                id: `google_${place.place_id}`, // Temporary ID for Google-only results
                name: place.name,
                address: place.vicinity || place.formatted_address,
                google_address: place.vicinity || place.formatted_address,
                google_phone: place.formatted_phone_number,
                google_website: place.website,
                latitude: place.geometry.location.lat,
                longitude: place.geometry.location.lng,
                google_rating: place.rating,
                google_photos: place.photos?.map((photo: any) => 
                    `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${googleApiKey}`
                ) || [],
                google_types: place.types,
                distance_km: 0, // Will be calculated on client if needed
                verified: false,
                status: 'available',
                import_status: 'pending',
                google_only: true // Flag to indicate this is Google-only data
            }))
        }

        // Apply limit
        const limitedResults = finalResults.slice(0, limit)

        console.log('✅ Returning', limitedResults.length, 'hospitals (Google Places:', googlePlacesData.length, ', Database:', nearbyHospitals?.length || 0, ')')

        return new Response(JSON.stringify({ 
            data: limitedResults,
            meta: {
                google_places_count: googlePlacesData.length,
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
