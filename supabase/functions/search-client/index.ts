import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify the user
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const userId = claimsData.claims.sub;

    // Use service role to search across all facilities
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify user has appropriate role
    const { data: hasRole } = await adminClient.rpc('has_any_role', {
      _user_id: userId,
      _roles: ['facility_officer', 'program_manager', 'system_admin'],
    });

    if (!hasRole) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), { status: 403, headers: corsHeaders });
    }

    const { searchId } = await req.json();
    if (!searchId || typeof searchId !== 'string' || searchId.trim().length < 3) {
      return new Response(JSON.stringify({ error: 'Search ID must be at least 3 characters' }), { status: 400, headers: corsHeaders });
    }

    const sanitizedId = searchId.trim();

    // Search by LASRAA ID, NIN, system_id, or client ID
    const { data: clients, error: searchError } = await adminClient
      .from('clients')
      .select('id, name, service, status, facility_id, account_id, lasraa_id, nin_id, system_id, contact')
      .or(`lasraa_id.eq.${sanitizedId},nin_id.eq.${sanitizedId},system_id.eq.${sanitizedId},id.eq.${sanitizedId}`);

    if (searchError) {
      console.error('Search error:', searchError);
      return new Response(JSON.stringify({ error: 'Search failed' }), { status: 500, headers: corsHeaders });
    }

    // Enrich with facility name
    const facilityIds = [...new Set(clients?.map(c => c.facility_id).filter(Boolean))];
    let facilitiesMap: Record<string, string> = {};
    
    if (facilityIds.length > 0) {
      const { data: facilities } = await adminClient
        .from('facilities')
        .select('id, name, local_government')
        .in('id', facilityIds);
      
      if (facilities) {
        facilitiesMap = Object.fromEntries(facilities.map(f => [f.id, `${f.name} (${f.local_government || 'N/A'})`]));
      }
    }

    const results = (clients || []).map(c => ({
      id: c.id,
      name: c.name,
      service: c.service,
      status: c.status,
      contact: c.contact,
      facility_id: c.facility_id,
      account_id: c.account_id,
      facility_name: facilitiesMap[c.facility_id] || 'Unknown',
      lasraa_id: c.lasraa_id,
      nin_id: c.nin_id,
      system_id: c.system_id,
    }));

    return new Response(JSON.stringify({ clients: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
