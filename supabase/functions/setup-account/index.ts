import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Validate auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, account_id, facility_id')
      .eq('user_id', userId)
      .single();

    if (existingProfile) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Profile already exists',
        account_id: existingProfile.account_id,
        facility_id: existingProfile.facility_id,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get user metadata for account setup
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (userError || !user) {
      throw new Error('Failed to fetch user details');
    }

    const metadata = user.user_metadata || {};
    const facilityName = metadata.facility || 'My Facility';
    const localGovernment = metadata.local_government || null;
    const ward = metadata.ward || null;
    const firstName = metadata.first_name || null;
    const lastName = metadata.last_name || null;

    console.log(`Setting up account for user ${userId}: ${firstName} ${lastName}`);

    // 1. Create account (tenant)
    const { data: account, error: accountError } = await supabaseAdmin
      .from('accounts')
      .insert({ name: facilityName })
      .select()
      .single();

    if (accountError) {
      console.error('Account creation error:', accountError);
      throw accountError;
    }

    // 2. Create facility
    const { data: facility, error: facilityError } = await supabaseAdmin
      .from('facilities')
      .insert({
        account_id: account.id,
        name: facilityName,
        local_government: localGovernment,
        ward: ward,
      })
      .select()
      .single();

    if (facilityError) {
      console.error('Facility creation error:', facilityError);
      throw facilityError;
    }

    // 3. Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        account_id: account.id,
        facility_id: facility.id,
        first_name: firstName,
        last_name: lastName,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      throw profileError;
    }

    // 4. Assign default role (facility_officer)
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'facility_officer',
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      throw roleError;
    }

    console.log(`Account setup complete for user ${userId}, account ${account.id}, facility ${facility.id}`);

    return new Response(JSON.stringify({
      success: true,
      account_id: account.id,
      facility_id: facility.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Setup account error:', error);
    return new Response(JSON.stringify({ error: 'An internal error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
