import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Support both authenticated calls (manual) and cron calls (with Authorization: Bearer <anon_key>)
    const authHeader = req.headers.get('Authorization');
    
    const body = await req.json().catch(() => ({}));
    const { patientId, reminderType, automated } = body;

    // --- AUTOMATED CRON MODE ---
    if (automated) {
      console.log('Running automated reminder cron...');
      const now = new Date();
      const threeDaysFromNow = new Date(now);
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      const threeDaysAgo = new Date(now);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      // Format dates for comparison
      const targetDate = threeDaysFromNow.toISOString().split('T')[0];
      const defaulterDate = threeDaysAgo.toISOString().split('T')[0];

      // 1. Upcoming appointments (3 days from now)
      const { data: upcomingClients, error: upErr } = await supabaseAdmin
        .from('clients')
        .select('*')
        .eq('status', 'On Track')
        .gte('due_date', `${targetDate}T00:00:00`)
        .lt('due_date', `${targetDate}T23:59:59`);

      if (upErr) console.error('Error fetching upcoming clients:', upErr);

      // 2. Defaulters (due date was 3 days ago, still not completed)
      const { data: defaulterClients, error: defErr } = await supabaseAdmin
        .from('clients')
        .select('*')
        .in('status', ['Defaulting', 'On Track'])
        .gte('due_date', `${defaulterDate}T00:00:00`)
        .lt('due_date', `${defaulterDate}T23:59:59`);

      if (defErr) console.error('Error fetching defaulter clients:', defErr);

      const results = { upcoming: 0, defaulters: 0, errors: 0 };

      // Send upcoming reminders
      for (const client of (upcomingClients || [])) {
        try {
          const message = await generateMessage(client, 'upcoming');
          await sendSMS(client.contact, message);
          await logReminder(client.id, 'sms', message, client.account_id);
          results.upcoming++;
        } catch (err) {
          console.error(`Failed reminder for ${client.id}:`, err.message);
          results.errors++;
        }
      }

      // Send defaulter follow-ups
      for (const client of (defaulterClients || [])) {
        try {
          const message = await generateMessage(client, 'defaulter');
          await sendSMS(client.contact, message);
          await logReminder(client.id, 'sms', message, client.account_id);
          results.defaulters++;
          
          // Update status to Defaulting if still On Track
          if (client.status === 'On Track') {
            await supabaseAdmin
              .from('clients')
              .update({ status: 'Defaulting' })
              .eq('id', client.id);
          }
        } catch (err) {
          console.error(`Failed defaulter reminder for ${client.id}:`, err.message);
          results.errors++;
        }
      }

      console.log(`Cron complete: ${results.upcoming} upcoming, ${results.defaulters} defaulter reminders sent, ${results.errors} errors`);
      return new Response(JSON.stringify({ success: true, results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- MANUAL SINGLE-CLIENT MODE ---
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
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

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    const generatedMessage = await generateMessage(client, 'manual');

    if (reminderType === 'sms') {
      await sendSMS(client.contact, generatedMessage);
    } else {
      await sendWhatsApp(client.contact, generatedMessage);
    }

    await logReminder(patientId, reminderType, generatedMessage, client.account_id);

    return new Response(JSON.stringify({
      success: true,
      message: 'Reminder sent successfully',
      generatedMessage,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-ai-reminder function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateMessage(client: any, type: 'upcoming' | 'defaulter' | 'manual'): Promise<string> {
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

async function logReminder(patientId: string, type: string, message: string, accountId: string | null) {
  const { error } = await supabaseAdmin
    .from('patient_reminders')
    .insert({
      patient_id: patientId,
      reminder_type: type,
      message,
      status: 'sent',
      sent_at: new Date().toISOString(),
      account_id: accountId,
    });
  if (error) console.error('Error logging reminder:', error);
}

async function sendSMS(phoneNumber: string, message: string) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
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
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`SMS failed: ${data.message || 'Unknown error'}`);
  return data;
}

async function sendWhatsApp(phoneNumber: string, message: string) {
  const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
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
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp failed: ${data.message || 'Unknown error'}`);
  return data;
}
