import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

serve((request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers })

  return new Response(
    JSON.stringify({ error: 'Account discovery is no longer available.' }),
    { status: 410, headers },
  )
})
