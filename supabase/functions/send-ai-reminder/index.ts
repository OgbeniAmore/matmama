
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { patientId, reminderType } = await req.json();
    
    console.log(`Processing ${reminderType} reminder for patient: ${patientId}`);

    // Fetch patient details
    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('*')
      .eq('id', patientId)
      .single();

    if (patientError || !patient) {
      throw new Error('Patient not found');
    }

    // Generate personalized message using OpenAI
    const prompt = `Generate a friendly, professional reminder message for a healthcare patient. 
    
    Patient Details:
    - Name: ${patient.name}
    - Service: ${patient.service}
    - Due Date: ${new Date(patient.due_date).toLocaleDateString()}
    ${patient.child_name ? `- Child Name: ${patient.child_name}` : ''}
    ${patient.service === 'Ante Natal Care' && patient.trimester ? `- Trimester: ${patient.trimester}` : ''}
    
    Create a warm, caring message (max 160 characters for SMS compatibility) that:
    1. Addresses the patient by name
    2. Mentions their specific healthcare service
    3. Reminds them of their missed/overdue appointment
    4. Encourages them to reschedule
    5. Uses a supportive, non-judgmental tone
    
    Do not include any clinic name or contact details - just the reminder message.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a helpful healthcare communication assistant.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.7,
      }),
    });

    const openaiData = await openaiResponse.json();
    const generatedMessage = openaiData.choices[0].message.content.trim();
    
    console.log('Generated message:', generatedMessage);

    // Send reminder based on type
    let result;
    if (reminderType === 'sms') {
      result = await sendSMS(patient.contact, generatedMessage);
    } else if (reminderType === 'whatsapp') {
      result = await sendWhatsApp(patient.contact, generatedMessage);
    } else {
      throw new Error('Invalid reminder type');
    }

    // Log the reminder activity
    const { error: logError } = await supabase
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
      result 
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
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: phoneNumber,
      From: '+1234567890', // Replace with your Twilio phone number
      Body: message,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`SMS sending failed: ${data.message}`);
  }
  
  return data;
}

async function sendWhatsApp(phoneNumber: string, message: string) {
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: `whatsapp:${phoneNumber}`,
      From: 'whatsapp:+14155238886', // Twilio Sandbox WhatsApp number
      Body: message,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`WhatsApp sending failed: ${data.message}`);
  }
  
  return data;
}
