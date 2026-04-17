import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Twilio status callback URL
const statusCallbackUrl = `${supabaseUrl}/functions/v1/whatsapp-status-webhook`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { patientId, reminderType, automated, retryOf } = body;

    // --- RETRY MODE ---
    if (retryOf) {
      return await handleRetry(retryOf);
    }

    // --- AUTOMATED CRON MODE ---
    if (automated) {
      return await handleAutomatedReminders();
    }

    // --- MANUAL SINGLE-CLIENT MODE ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (!patientId || !reminderType) {
      throw new Error('Missing required fields: patientId and reminderType');
    }
    if (!['sms', 'whatsapp'].includes(reminderType)) {
      throw new Error('Invalid reminder type. Must be "sms" or "whatsapp"');
    }

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (clientError || !client) throw new Error('Client not found');

    const generatedMessage = await generateMessage(client, 'manual');
    const channel = reminderType as 'sms' | 'whatsapp';
    const result = await sendByChannel(channel, client.contact, generatedMessage);

    await logReminder(patientId, channel, generatedMessage, client.account_id, 'manual', result.messageSid);

    return jsonResponse({
      success: true,
      message: 'Reminder sent successfully',
      generatedMessage,
      messageSid: result.messageSid,
    });

  } catch (error) {
    console.error('Error in send-ai-reminder function:', error);
    return jsonResponse({ success: false, error: 'An internal error occurred' }, 500);
  }
});

// ──────────────── RETRY HANDLER ────────────────
async function handleRetry(reminderId: string) {
  console.log(`Processing retry for reminder ${reminderId}`);

  const { data: original, error: fetchErr } = await supabaseAdmin
    .from('patient_reminders')
    .select('*')
    .eq('id', reminderId)
    .single();

  if (fetchErr || !original) {
    return jsonResponse({ error: 'Original reminder not found' }, 404);
  }

  if (original.retry_count >= original.max_retries) {
    return jsonResponse({ error: 'Max retries exceeded' }, 400);
  }

  const { data: client } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('id', original.patient_id)
    .single();

  if (!client) return jsonResponse({ error: 'Client not found' }, 404);

  try {
    const message = await generateMessage(client, 'manual');
    const result = await sendByChannel(original.reminder_type, client.contact, message);

    // Update original reminder with retry info
    await supabaseAdmin
      .from('patient_reminders')
      .update({
        retry_count: original.retry_count + 1,
        status: 'sent',
        delivery_status: 'queued',
        external_message_id: result.messageSid,
        error_detail: null,
        sent_at: new Date().toISOString(),
        message,
      })
      .eq('id', reminderId);

    console.log(`Retry ${original.retry_count + 1} sent for ${original.patient_id}`);
    return jsonResponse({ success: true, retry: original.retry_count + 1 });
  } catch (err) {
    await supabaseAdmin
      .from('patient_reminders')
      .update({
        retry_count: original.retry_count + 1,
        error_detail: err.message,
      })
      .eq('id', reminderId);

    return jsonResponse({ error: 'Failed to send reminder' }, 500);
  }
}

// ──────────────── AUTOMATED CRON ────────────────
async function handleAutomatedReminders() {
  console.log('Running automated reminder cron...');
  const now = new Date();

  const threeDaysFromNow = new Date(now);
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const targetDate = threeDaysFromNow.toISOString().split('T')[0];
  const defaulterDate = threeDaysAgo.toISOString().split('T')[0];

  const { data: upcomingClients, error: upErr } = await supabaseAdmin
    .from('clients')
    .select('*')
    .eq('status', 'On Track')
    .gte('due_date', `${targetDate}T00:00:00`)
    .lt('due_date', `${targetDate}T23:59:59`);

  if (upErr) console.error('Error fetching upcoming clients:', upErr);

  const { data: defaulterClients, error: defErr } = await supabaseAdmin
    .from('clients')
    .select('*')
    .in('status', ['Defaulting', 'On Track'])
    .gte('due_date', `${defaulterDate}T00:00:00`)
    .lt('due_date', `${defaulterDate}T23:59:59`);

  if (defErr) console.error('Error fetching defaulter clients:', defErr);

  const results = { upcoming: 0, defaulters: 0, errors: 0 };

  for (const client of (upcomingClients || [])) {
    try {
      const message = await generateMessage(client, 'upcoming');
      const channel = client.preferred_channel || 'sms';
      const result = await sendByChannel(channel, client.contact, message);
      await logReminder(client.id, channel, message, client.account_id, 'automated_upcoming', result.messageSid);
      results.upcoming++;
    } catch (err) {
      console.error(`Failed reminder for ${client.id}:`, err.message);
      await logFailedReminder(client.id, client.preferred_channel || 'sms', err.message, client.account_id, 'automated_upcoming');
      results.errors++;
    }
  }

  for (const client of (defaulterClients || [])) {
    try {
      const message = await generateMessage(client, 'defaulter');
      const channel = client.preferred_channel || 'sms';
      const result = await sendByChannel(channel, client.contact, message);
      await logReminder(client.id, channel, message, client.account_id, 'automated_defaulter', result.messageSid);
      results.defaulters++;

      if (client.status === 'On Track') {
        await supabaseAdmin
          .from('clients')
          .update({ status: 'Defaulting' })
          .eq('id', client.id);
      }
    } catch (err) {
      console.error(`Failed defaulter reminder for ${client.id}:`, err.message);
      await logFailedReminder(client.id, client.preferred_channel || 'sms', err.message, client.account_id, 'automated_defaulter');
      results.errors++;
    }
  }

  console.log(`Cron complete: ${results.upcoming} upcoming, ${results.defaulters} defaulter, ${results.errors} errors`);
  return jsonResponse({ success: true, results });
}

// ──────────────── CHANNEL DISPATCH ────────────────
async function sendByChannel(channel: string, phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  if (channel === 'whatsapp') {
    return await sendWhatsApp(phoneNumber, message);
  } else {
    return await sendSMS(phoneNumber, message);
  }
}

// ──────────────── AI MESSAGE GENERATION ────────────────
async function generateMessage(client: any, type: 'upcoming' | 'defaulter' | 'manual'): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) throw new Error('OPENAI_API_KEY is not configured');

  const contextMap = {
    upcoming: 'Their appointment is coming up in 3 days. Remind them warmly.',
    defaulter: 'They missed their appointment 3 days ago. Encourage them to reschedule urgently but caringly.',
    manual: 'Remind them of their missed/overdue appointment.',
  };

  const prompt = `Generate a friendly, professional reminder message for a healthcare client.
  
  Client Details:
  - Name: ${client.name}
  - Service: ${client.service}
  - Due Date: ${new Date(client.due_date).toLocaleDateString()}
  ${client.child_name ? `- Child Name: ${client.child_name}` : ''}
  ${client.service === 'Ante Natal Care' && client.trimester ? `- Trimester: ${client.trimester}` : ''}
  
  Context: ${contextMap[type]}
  
  Create a warm, caring message (max 160 characters for SMS compatibility) that:
  1. Addresses the patient by name
  2. Mentions their specific healthcare service
  3. Uses a supportive, non-judgmental tone
  
  Return ONLY the message text, no quotes or extra formatting.`;

  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful healthcare communication assistant. Return only the message text.' },
        { role: 'user', content: prompt },
      ],
      max_tokens: 100,
      temperature: 0.7,
    }),
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.text();
    console.error('OpenAI API error:', errorData);
    throw new Error('Failed to generate reminder message');
  }

  const openaiData = await openaiResponse.json();
  return openaiData.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
}

// ──────────────── LOGGING ────────────────
async function logReminder(patientId: string, type: string, message: string, accountId: string | null, category: string, messageSid?: string) {
  const { error } = await supabaseAdmin
    .from('patient_reminders')
    .insert({
      patient_id: patientId,
      reminder_type: type,
      message,
      status: 'sent',
      delivery_status: 'queued',
      sent_at: new Date().toISOString(),
      account_id: accountId,
      reminder_category: category,
      external_message_id: messageSid || null,
    });
  if (error) console.error('Error logging reminder:', error);
}

async function logFailedReminder(patientId: string, type: string, errorMsg: string, accountId: string | null, category: string) {
  const { error } = await supabaseAdmin
    .from('patient_reminders')
    .insert({
      patient_id: patientId,
      reminder_type: type,
      message: `FAILED: ${errorMsg}`,
      status: 'failed',
      delivery_status: 'failed',
      sent_at: new Date().toISOString(),
      account_id: accountId,
      reminder_category: category,
      error_detail: errorMsg,
    });
  if (error) console.error('Error logging failed reminder:', error);
}

// ──────────────── SMS / WHATSAPP VIA TWILIO ────────────────
async function sendSMS(phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!twilioAccountSid || !twilioAuthToken) throw new Error('Twilio credentials not configured');

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phoneNumber,
      From: Deno.env.get('TWILIO_PHONE_NUMBER') || '+1234567890',
      Body: message,
      StatusCallback: statusCallbackUrl,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`SMS failed: ${data.message || 'Unknown error'}`);
  return { messageSid: data.sid };
}

async function sendWhatsApp(phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  if (!twilioAccountSid || !twilioAuthToken) throw new Error('Twilio credentials not configured');

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${phoneNumber}`,
      From: `whatsapp:${Deno.env.get('TWILIO_WHATSAPP_NUMBER') || '+14155238886'}`,
      Body: message,
      StatusCallback: statusCallbackUrl,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp failed: ${data.message || 'Unknown error'}`);
  return { messageSid: data.sid };
}

// ──────────────── HELPERS ────────────────
function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
