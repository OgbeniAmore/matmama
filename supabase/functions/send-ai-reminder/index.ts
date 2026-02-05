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
    // Validate auth
    const authHeader = req.headers.get('Authorization');
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

    const { patientId, reminderType } = await req.json();
    
    console.log(`Processing ${reminderType} reminder for client: ${patientId}`);

    if (!patientId || !reminderType) {
      throw new Error('Missing required fields: patientId and reminderType');
    }

    if (!['sms', 'whatsapp'].includes(reminderType)) {
      throw new Error('Invalid reminder type. Must be "sms" or "whatsapp"');
    }

    // Fetch client details using service role client
    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (clientError || !client) {
      console.error('Client fetch error:', clientError);
      throw new Error('Client not found');
    }

    console.log(`Found client: ${client.name}, service: ${client.service}`);

    // Generate personalized message using OpenAI
    const prompt = `Generate a friendly, professional reminder message for a healthcare patient. 
    
    Patient Details:
    - Name: ${client.name}
    - Service: ${client.service}
    - Due Date: ${new Date(client.due_date).toLocaleDateString()}
    ${client.child_name ? `- Child Name: ${client.child_name}` : ''}
    ${client.service === 'Ante Natal Care' && client.trimester ? `- Trimester: ${client.trimester}` : ''}
    
    Create a warm, caring message (max 160 characters for SMS compatibility) that:
    1. Addresses the patient by name
    2. Mentions their specific healthcare service
    3. Reminds them of their missed/overdue appointment
    4. Encourages them to reschedule
    5. Uses a supportive, non-judgmental tone
    
    Do not include any clinic name or contact details - just the reminder message.
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
          { role: 'user', content: prompt }
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
    const generatedMessage = openaiData.choices[0].message.content.trim().replace(/^["']|["']$/g, '');
    
    console.log('Generated message:', generatedMessage);

    // Send reminder based on type
    let result;
    if (reminderType === 'sms') {
      result = await sendSMS(client.contact, generatedMessage);
    } else {
      result = await sendWhatsApp(client.contact, generatedMessage);
    }

    // Log the reminder activity using service role client
    const { error: logError } = await supabaseAdmin
      .from('patient_reminders')
      .insert({
        patient_id: patientId,
        reminder_type: reminderType,
        message: generatedMessage,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });

    if (logError) {
      console.error('Error logging reminder:', logError);
    }

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
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendSMS(phoneNumber: string, message: string) {
  console.log(`Sending SMS to ${phoneNumber}`);
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
  if (!response.ok) {
    console.error('Twilio SMS error:', data);
    throw new Error(`SMS sending failed: ${data.message || 'Unknown error'}`);
  }
  
  console.log('SMS sent successfully:', data.sid);
  return data;
}

async function sendWhatsApp(phoneNumber: string, message: string) {
  console.log(`Sending WhatsApp to ${phoneNumber}`);
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
  if (!response.ok) {
    console.error('Twilio WhatsApp error:', data);
    throw new Error(`WhatsApp sending failed: ${data.message || 'Unknown error'}`);
  }
  
  console.log('WhatsApp sent successfully:', data.sid);
  return data;
}
