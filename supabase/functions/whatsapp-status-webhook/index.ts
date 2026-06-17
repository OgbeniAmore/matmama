import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' },
    });
  }

  try {
    // Twilio sends status callbacks as form-encoded POST
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

    const statusMap: Record<string, string> = {
      queued: 'queued',
      sent: 'sent',
      delivered: 'delivered',
      read: 'delivered',
      failed: 'failed',
      undelivered: 'undelivered',
    };

    const deliveryStatus = statusMap[messageStatus] ?? messageStatus;
    const isFailed = ['failed', 'undelivered'].includes(messageStatus);

    const updateData: Record<string, unknown> = {
      delivery_status: deliveryStatus,
      delivery_updated_at: new Date().toISOString(),
    };

    if (isFailed) {
      updateData.status = 'failed';
      updateData.error_detail = errorMessage || `Error code: ${errorCode ?? 'unknown'}`;
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

    // If failed and retries remain, schedule next retry via next_retry_at.
    // The hourly pg_cron worker (processRetries mode) picks these up automatically.
    if (isFailed) {
      const { data: reminder } = await supabaseAdmin
        .from('patient_reminders')
        .select('id, retry_count, max_retries')
        .eq('external_message_id', messageSid)
        .maybeSingle();

      if (reminder && (reminder.retry_count ?? 0) < (reminder.max_retries ?? 3)) {
        const attempt = (reminder.retry_count ?? 0) + 1;
        const backoffMin = Math.min(360, Math.pow(2, attempt));
        const nextRetryAt = new Date(Date.now() + backoffMin * 60_000).toISOString();
        await supabaseAdmin
          .from('patient_reminders')
          .update({ next_retry_at: nextRetryAt })
          .eq('id', reminder.id);
        console.log(`Retry ${attempt} scheduled for ${reminder.id} at ${nextRetryAt} (backoff ${backoffMin}m)`);
      }
    }

    // Twilio expects 200 with TwiML or empty body
    return new Response('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
