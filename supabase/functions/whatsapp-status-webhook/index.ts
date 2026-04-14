import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Twilio sends status callbacks as form-encoded
    const formData = await req.formData();
    const messageSid = formData.get('MessageSid') as string;
    const messageStatus = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string | null;
    const errorMessage = formData.get('ErrorMessage') as string | null;

    if (!messageSid || !messageStatus) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`Delivery status update: ${messageSid} -> ${messageStatus}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Map Twilio statuses to our delivery_status
    const statusMap: Record<string, string> = {
      queued: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      read: 'delivered',
      failed: 'failed',
      undelivered: 'undelivered',
    };

    const deliveryStatus = statusMap[messageStatus] || messageStatus;
    const isFailed = ['failed', 'undelivered'].includes(messageStatus);

    const updateData: Record<string, unknown> = {
      delivery_status: deliveryStatus,
      delivery_updated_at: new Date().toISOString(),
    };

    if (isFailed) {
      updateData.status = 'failed';
      updateData.error_detail = errorMessage || `Error code: ${errorCode || 'unknown'}`;
    } else if (messageStatus === 'delivered' || messageStatus === 'read') {
      updateData.status = 'sent';
    }

    const { error } = await supabaseAdmin
      .from('patient_reminders')
      .update(updateData)
      .eq('external_message_id', messageSid);

    if (error) {
      console.error('Error updating delivery status:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    // If failed and retries remaining, trigger retry
    if (isFailed) {
      const { data: reminder } = await supabaseAdmin
        .from('patient_reminders')
        .select('id, patient_id, reminder_type, retry_count, max_retries, account_id')
        .eq('external_message_id', messageSid)
        .single();

      if (reminder && reminder.retry_count < reminder.max_retries) {
        console.log(`Scheduling retry ${reminder.retry_count + 1}/${reminder.max_retries} for ${reminder.patient_id}`);

        // Invoke send-ai-reminder for retry
        const retryResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/send-ai-reminder`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            },
            body: JSON.stringify({
              patientId: reminder.patient_id,
              reminderType: reminder.reminder_type,
              retryOf: reminder.id,
            }),
          }
        );

        if (!retryResponse.ok) {
          console.error('Retry invocation failed:', await retryResponse.text());
        }
      }
    }

    // Twilio expects 200 with empty body or TwiML
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
