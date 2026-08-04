import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Termii DLR statuses -> internal delivery_status
const statusMap: Record<string, string> = {
  delivered: "delivered",
  sent: "sent",
  dnd_active_on_phone_number: "undelivered",
  dnd: "undelivered",
  rejected: "failed",
  expired: "failed",
  message_failed: "failed",
  failed: "failed",
  undelivered: "undelivered",
  received: "delivered",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json().catch(() => null);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Termii wraps DLR events as { type: "outbound", id, message_id, receiver, status, ... }
    const event = payload.data ?? payload;
    const messageId: string =
      event.message_id || event.messageId || event.id || event.sms_id || "";
    const rawStatus: string = String(event.status || event.message_status || "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    if (!messageId || !rawStatus) {
      return new Response(
        JSON.stringify({ error: "Missing message id or status", received: event }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const deliveryStatus = statusMap[rawStatus] ?? rawStatus;
    const isFailed = ["failed", "undelivered"].includes(deliveryStatus);

    console.log(`Termii DLR: ${messageId} -> ${rawStatus} (${deliveryStatus})`);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const updateData: Record<string, unknown> = {
      delivery_status: deliveryStatus,
      delivery_updated_at: new Date().toISOString(),
    };

    if (isFailed) {
      updateData.status = "failed";
      updateData.error_detail =
        event.error || event.reason || event.description || `Termii status: ${rawStatus}`;
    } else if (deliveryStatus === "delivered" || deliveryStatus === "sent") {
      updateData.status = "sent";
    }

    const { data: updated, error } = await supabaseAdmin
      .from("patient_reminders")
      .update(updateData)
      .eq("external_message_id", messageId)
      .select("id, retry_count, max_retries");

    if (error) {
      console.error("Failed updating reminder:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!updated || updated.length === 0) {
      console.log(`No reminder found for message id ${messageId}`);
      return new Response(JSON.stringify({ ok: true, matched: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Schedule retry with exponential backoff; the cron worker picks it up.
    if (isFailed) {
      for (const reminder of updated) {
        const retries = reminder.retry_count ?? 0;
        const max = reminder.max_retries ?? 3;
        if (retries < max) {
          const attempt = retries + 1;
          const backoffMin = Math.min(360, Math.pow(2, attempt));
          const nextRetryAt = new Date(Date.now() + backoffMin * 60_000).toISOString();
          await supabaseAdmin
            .from("patient_reminders")
            .update({ next_retry_at: nextRetryAt })
            .eq("id", reminder.id);
          console.log(`Retry ${attempt} scheduled for ${reminder.id} at ${nextRetryAt}`);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, matched: updated.length }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Termii webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
