import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type' },
    });
  }

  try {
    // WATI sends JSON POST for all webhook events
    const payload = await req.json().catch(() => null);
    if (!payload) return new Response('Bad Request', { status: 400 });

    // Only handle message status updates; ignore incoming message events
    const eventType = (payload.type || payload.eventType || '').toLowerCase();
    if (eventType && eventType !== 'messagestatusupdated') {
      return new Response(JSON.stringify({ ok: true, ignored: true }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }

    // WATI status update fields
    const messageSid: string = payload.whatsappMessageId || payload.id || payload.messageId || '';
    const messageStatus: string = (payload.status || '').toLowerCase();

    if (!messageSid || !messageStatus) {
      return new Response('Missing required fields', { status: 400 });
    }

    console.log(`WATI delivery update: ${messageSid} -> ${messageStatus}`);

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const statusMap: Record<string, string> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'delivered',
      failed: 'failed',
      warning: 'undelivered', // outside 24h session window
    };

    const deliveryStatus = statusMap[messageStatus] ?? messageStatus;
    const isFailed = ['failed', 'warning'].includes(messageStatus);

    const updateData: Record<string, unknown> = {
      delivery_status: deliveryStatus,
      delivery_updated_at: new Date().toISOString(),
    };

    if (isFailed) {
      updateData.status = 'failed';
      updateData.error_detail = payload.error || payload.errorMessage ||
        (messageStatus === 'warning' ? 'Sent outside 24h session window — template required' : 'Delivery failed');
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

    // Schedule retry via next_retry_at; hourly pg_cron worker picks it up
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
        console.log(`Retry ${attempt} scheduled for ${reminder.id} at ${nextRetryAt}`);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
});
