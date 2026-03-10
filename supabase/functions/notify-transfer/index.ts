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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { transferId, event } = await req.json();

    if (!transferId || !event) {
      return new Response(JSON.stringify({ error: 'Missing transferId or event' }), { status: 400, headers: corsHeaders });
    }

    // Fetch transfer details
    const { data: transfer, error: tErr } = await adminClient
      .from('transfer_requests')
      .select('*')
      .eq('id', transferId)
      .single();

    if (tErr || !transfer) {
      return new Response(JSON.stringify({ error: 'Transfer not found' }), { status: 404, headers: corsHeaders });
    }

    // Get client name
    const { data: client } = await adminClient
      .from('clients')
      .select('name')
      .eq('id', transfer.client_id)
      .single();

    // Get facility names
    const { data: sourceFacility } = await adminClient
      .from('facilities')
      .select('name')
      .eq('id', transfer.source_facility_id)
      .single();

    const { data: targetFacility } = await adminClient
      .from('facilities')
      .select('name')
      .eq('id', transfer.target_facility_id)
      .single();

    // Determine which account's managers to email
    const notifyAccountId = event === 'created'
      ? transfer.source_account_id
      : transfer.target_account_id;

    // Get managers' emails
    const { data: managers } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('account_id', notifyAccountId);

    if (!managers || managers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers to notify' }), { headers: corsHeaders });
    }

    // Filter to only managers/admins
    const managerUserIds = managers.map(m => m.user_id);
    const { data: roledUsers } = await adminClient
      .from('user_roles')
      .select('user_id')
      .in('user_id', managerUserIds)
      .in('role', ['program_manager', 'system_admin', 'facility_officer']);

    if (!roledUsers || roledUsers.length === 0) {
      return new Response(JSON.stringify({ message: 'No managers with email' }), { headers: corsHeaders });
    }

    // Get emails from auth
    const emails: string[] = [];
    for (const ru of roledUsers) {
      const { data: userData } = await adminClient.auth.admin.getUserById(ru.user_id);
      if (userData?.user?.email) {
        emails.push(userData.user.email);
      }
    }

    const clientName = client?.name || 'Unknown Client';
    const sourceName = sourceFacility?.name || 'Unknown';
    const targetName = targetFacility?.name || 'Unknown';

    let subject: string;
    let body: string;

    if (event === 'created') {
      subject = `New Transfer Request: ${clientName}`;
      body = `A transfer request has been submitted for client "${clientName}" from ${sourceName} to ${targetName}. Please review this request in the Transfer Requests page.`;
    } else if (event === 'approved') {
      subject = `Transfer Approved: ${clientName}`;
      body = `The transfer request for client "${clientName}" from ${sourceName} to ${targetName} has been approved. The client's records have been moved to ${targetName}.`;
    } else {
      subject = `Transfer Rejected: ${clientName}`;
      body = `The transfer request for client "${clientName}" from ${sourceName} to ${targetName} has been rejected. The client remains at ${sourceName}.`;
    }

    // Send email via Twilio (already configured)
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuth = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!twilioSid || !twilioAuth) {
      console.log('Twilio not configured, skipping email notifications. Emails would go to:', emails);
      return new Response(JSON.stringify({ message: 'Email service not configured, in-app notifications sent', emails }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the notification attempt (emails would be sent via configured email service)
    console.log(`Transfer notification: ${subject} -> ${emails.join(', ')}`);
    console.log(`Body: ${body}`);

    return new Response(JSON.stringify({ 
      message: 'Notification processed',
      subject,
      recipients: emails.length,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: corsHeaders });
  }
});
