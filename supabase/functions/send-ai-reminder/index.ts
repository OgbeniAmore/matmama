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


// All windows resolved against Africa/Lagos local day boundaries.
const LAGOS_TZ = 'Africa/Lagos';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { patientId, reminderType, automated, retryOf, processRetries, dryRun, simulatedNow } = body;

    // --- AUTOMATED CRON MODE ---
    if (automated) {
      const expected = Deno.env.get('CRON_SECRET');
      if (expected) {
        const cronSecret = req.headers.get('x-cron-secret');
        if (cronSecret !== expected) return jsonResponse({ error: 'Forbidden' }, 403);
      }
      return await handleAutomatedReminders({ dryRun: !!dryRun, simulatedNow });
    }

    // --- RETRY WORKER MODE (cron) ---
    if (processRetries) {
      const expected = Deno.env.get('CRON_SECRET');
      if (expected) {
        const cronSecret = req.headers.get('x-cron-secret');
        if (cronSecret !== expected) return jsonResponse({ error: 'Forbidden' }, 403);
      }
      return await processRetryQueue();
    }

    // --- AUTHENTICATED MODES (manual + manual retry) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401);
    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token);
    if (userErr || !userData?.user) return jsonResponse({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    const { data: callerProfile } = await supabaseAdmin
      .from('profiles').select('account_id').eq('user_id', userId).maybeSingle();
    const callerAccountId = callerProfile?.account_id ?? null;
    if (!callerAccountId) return jsonResponse({ error: 'Forbidden' }, 403);

    if (retryOf) return await handleManualRetry(retryOf, callerAccountId);

    if (!patientId || !reminderType) throw new Error('Missing required fields: patientId and reminderType');
    if (!['sms', 'whatsapp'].includes(reminderType)) throw new Error('Invalid reminder type');

    const { data: client, error: clientError } = await supabaseAdmin
      .from('clients').select('*').eq('id', patientId).eq('account_id', callerAccountId).single();
    if (clientError || !client) throw new Error('Client not found');

    const generatedMessage = await generateMessage(client, 'manual');
    const channel = reminderType as 'sms' | 'whatsapp';
    const result = await sendByChannel(channel, client.contact, generatedMessage);
    await logReminder(patientId, channel, generatedMessage, client.account_id, 'manual', result.messageSid);

    return jsonResponse({ success: true, generatedMessage, messageSid: result.messageSid });
  } catch (error: any) {
    console.error('Error in send-ai-reminder function:', error);
    return jsonResponse({ success: false, error: error?.message || 'Internal error' }, 500);
  }
});

// ──────────────── TIMEZONE HELPERS (Africa/Lagos) ────────────────
// Returns YYYY-MM-DD for the given date in Africa/Lagos.
function lagosDateStr(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: LAGOS_TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(d);
  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${day}`;
}

function lagosDayOffset(now: Date, days: number): string {
  // Build a date that is `days` away from `now` in Lagos local terms.
  const today = lagosDateStr(now);
  const [y, m, d] = today.split('-').map(Number);
  // Use UTC to avoid the runner's local TZ skewing arithmetic.
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function buildIdempotencyKey(clientId: string, category: string, dateStr: string): string {
  return `${clientId}:${category}:${dateStr}`;
}

// ──────────────── MANUAL RETRY (single reminder, user-initiated) ────────────────
const MANUAL_RESEND_COOLDOWN_MS = 5 * 60_000; // 5 minutes per reminder
const MANUAL_RESEND_HOURLY_CAP = 20;          // per account, per rolling hour

async function handleManualRetry(reminderId: string, callerAccountId: string) {
  const { data: original } = await supabaseAdmin
    .from('patient_reminders').select('*').eq('id', reminderId).eq('account_id', callerAccountId).single();
  if (!original) return jsonResponse({ error: 'Original reminder not found' }, 404);
  if (original.retry_count >= original.max_retries) return jsonResponse({ error: 'Max retries exceeded' }, 400);

  // Per-reminder cooldown
  const last = original.last_attempted_at ? new Date(original.last_attempted_at).getTime() : 0;
  const elapsed = Date.now() - last;
  if (last && elapsed < MANUAL_RESEND_COOLDOWN_MS) {
    return jsonResponse({
      error: 'Cooldown active',
      retryAfterSeconds: Math.ceil((MANUAL_RESEND_COOLDOWN_MS - elapsed) / 1000),
    }, 429);
  }

  // Account-level hourly rate limit
  const sinceHour = new Date(Date.now() - 60 * 60_000).toISOString();
  const { count } = await supabaseAdmin
    .from('patient_reminders')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', callerAccountId)
    .gte('last_attempted_at', sinceHour);
  if ((count ?? 0) >= MANUAL_RESEND_HOURLY_CAP) {
    return jsonResponse({ error: 'Hourly resend limit reached. Try again later.' }, 429);
  }

  const { data: client } = await supabaseAdmin
    .from('clients').select('*').eq('id', original.patient_id).eq('account_id', callerAccountId).single();
  if (!client) return jsonResponse({ error: 'Client not found' }, 404);

  return await attemptRetry(original, client);
}


// ──────────────── RETRY QUEUE WORKER (cron) ────────────────
async function processRetryQueue() {
  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from('patient_reminders')
    .select('*')
    .eq('delivery_status', 'failed')
    .lt('retry_count', supabaseAdmin.rpc ? 99 : 99) // simple guard; real cap enforced below
    .or(`next_retry_at.is.null,next_retry_at.lte.${nowIso}`)
    .limit(50);

  if (error) {
    console.error('Retry queue fetch error:', error);
    return jsonResponse({ error: 'Retry fetch failed' }, 500);
  }

  let succeeded = 0, failed = 0, skipped = 0;
  for (const reminder of (due || [])) {
    if (reminder.retry_count >= reminder.max_retries) { skipped++; continue; }
    const { data: client } = await supabaseAdmin
      .from('clients').select('*').eq('id', reminder.patient_id).maybeSingle();
    if (!client) { skipped++; continue; }
    const res = await attemptRetry(reminder, client);
    if ((res as any).status === 200) succeeded++; else failed++;
  }
  return jsonResponse({ success: true, processed: (due || []).length, succeeded, failed, skipped });
}

async function attemptRetry(reminder: any, client: any) {
  const nextAttempt = (reminder.retry_count || 0) + 1;
  try {
    const message = reminder.message?.startsWith('FAILED:')
      ? await generateMessage(client, mapCategoryForGeneration(reminder.reminder_category))
      : reminder.message;
    const result = await sendByChannel(reminder.reminder_type, client.contact, message);

    await supabaseAdmin.from('patient_reminders').update({
      retry_count: nextAttempt,
      status: 'sent',
      delivery_status: 'queued',
      external_message_id: result.messageSid,
      error_detail: null,
      sent_at: new Date().toISOString(),
      last_attempted_at: new Date().toISOString(),
      next_retry_at: null,
      message,
    }).eq('id', reminder.id);

    return jsonResponse({ success: true, retry: nextAttempt });
  } catch (err: any) {
    // Exponential backoff: 2^n minutes (cap 6h)
    const backoffMin = Math.min(360, Math.pow(2, nextAttempt));
    const next = new Date(Date.now() + backoffMin * 60_000).toISOString();
    const giveUp = nextAttempt >= (reminder.max_retries || 3);

    await supabaseAdmin.from('patient_reminders').update({
      retry_count: nextAttempt,
      error_detail: err.message,
      last_attempted_at: new Date().toISOString(),
      next_retry_at: giveUp ? null : next,
      delivery_status: 'failed',
    }).eq('id', reminder.id);

    return jsonResponse({ error: 'Retry failed', detail: err.message }, 500);
  }
}

function mapCategoryForGeneration(cat: string): 'upcoming' | 'day_of' | 'follow_up' | 'defaulter' | 'manual' {
  if (cat?.startsWith('automated_')) return cat.replace('automated_', '') as any;
  if (['upcoming','day_of','follow_up','defaulter','manual'].includes(cat)) return cat as any;
  return 'manual';
}

// ──────────────── AUTOMATED CRON ────────────────
async function handleAutomatedReminders(opts: { dryRun: boolean; simulatedNow?: string } = { dryRun: false }) {
  const now = opts.simulatedNow ? new Date(opts.simulatedNow) : new Date();
  console.log(`Running automated reminder cron for Lagos day ${lagosDateStr(now)} (dryRun=${opts.dryRun})`);

  const windows: Array<{ category: 'upcoming' | 'day_of' | 'follow_up' | 'defaulter'; date: string; statuses: string[] }> = [
    { category: 'upcoming',  date: lagosDayOffset(now, 3),  statuses: ['On Track'] },
    { category: 'day_of',    date: lagosDayOffset(now, 0),  statuses: ['On Track'] },
    { category: 'follow_up', date: lagosDayOffset(now, -1), statuses: ['On Track', 'Defaulting'] },
    { category: 'defaulter', date: lagosDayOffset(now, -3), statuses: ['On Track', 'Defaulting'] },
  ];

  const results: Record<string, any> = {
    upcoming: { sent: 0, skipped: 0, failed: 0 },
    day_of:   { sent: 0, skipped: 0, failed: 0 },
    follow_up:{ sent: 0, skipped: 0, failed: 0 },
    defaulter:{ sent: 0, skipped: 0, failed: 0 },
  };

  for (const w of windows) {
    const { data: clients, error } = await supabaseAdmin
      .from('clients').select('*')
      .in('status', w.statuses)
      .gte('due_date', `${w.date}T00:00:00+01:00`)
      .lt('due_date',  `${w.date}T23:59:59+01:00`);

    if (error) { console.error(`Fetch error for ${w.category}:`, error); continue; }

    for (const client of (clients || [])) {
      const idemKey = buildIdempotencyKey(client.id, `automated_${w.category}`, w.date);

      // Idempotency check: have we already queued/sent this window for this client today?
      const { data: existing } = await supabaseAdmin
        .from('patient_reminders').select('id, delivery_status').eq('idempotency_key', idemKey).maybeSingle();
      if (existing) {
        results[w.category].skipped++;
        continue;
      }
      if (opts.dryRun) { results[w.category].sent++; continue; }

      try {
        const message = await generateMessage(client, w.category);
        const channel = client.preferred_channel || 'sms';
        const result = await sendByChannel(channel, client.contact, message);
        await logReminder(client.id, channel, message, client.account_id, `automated_${w.category}`, result.messageSid, idemKey);
        results[w.category].sent++;

        if (w.category === 'defaulter' && client.status === 'On Track') {
          await supabaseAdmin.from('clients').update({ status: 'Defaulting' }).eq('id', client.id);
        }
      } catch (err: any) {
        console.error(`Failed ${w.category} reminder for ${client.id}:`, err.message);
        // Schedule first retry in 2 minutes (exponential ladder kicks in via worker)
        const next = new Date(Date.now() + 2 * 60_000).toISOString();
        await logFailedReminder(
          client.id, client.preferred_channel || 'sms', err.message,
          client.account_id, `automated_${w.category}`, idemKey, next,
        );
        results[w.category].failed++;
      }
    }
  }

  console.log('Cron complete:', results);
  return jsonResponse({ success: true, lagosDate: lagosDateStr(now), results });
}

// ──────────────── CHANNEL DISPATCH ────────────────
async function sendByChannel(channel: string, phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  if (channel === 'whatsapp') return await sendWhatsApp(phoneNumber, message);
  return await sendSMS(phoneNumber, message);
}

// ──────────────── MESSAGE GENERATION ────────────────
function renderTemplate(body: string, client: any, facilityName?: string): string {
  const dueDate = client.due_date ? new Date(client.due_date).toLocaleDateString() : '';
  const map: Record<string, string> = {
    '{name}': client.name || '',
    '{service}': client.service || '',
    '{due_date}': dueDate,
    '{child_name}': client.child_name || '',
    '{trimester}': client.trimester ? String(client.trimester) : '',
    '{facility}': facilityName || 'your facility',
  };
  return body.replace(/\{name\}|\{service\}|\{due_date\}|\{child_name\}|\{trimester\}|\{facility\}/g, (m) => map[m] ?? '');
}

async function getTemplate(accountId: string | null, service: string, category: string): Promise<string | null> {
  if (!accountId) return null;
  const { data } = await supabaseAdmin
    .from('sms_templates').select('body, enabled')
    .eq('account_id', accountId).eq('service', service).eq('category', category).maybeSingle();
  if (!data || !data.enabled || !data.body?.trim()) return null;
  return data.body;
}

async function generateMessage(client: any, type: 'upcoming' | 'day_of' | 'follow_up' | 'defaulter' | 'manual'): Promise<string> {
  const template = await getTemplate(client.account_id, client.service, type);
  if (template) {
    let facilityName: string | undefined;
    if (client.facility_id) {
      const { data: fac } = await supabaseAdmin
        .from('facilities').select('name').eq('id', client.facility_id).maybeSingle();
      facilityName = fac?.name;
    }
    return renderTemplate(template, client, facilityName);
  }

  const contextMap: Record<string, string> = {
    upcoming: 'Their appointment is coming up in 3 days. Remind them warmly.',
    day_of: 'Their appointment is TODAY. Remind them warmly to come in.',
    follow_up: 'They missed their appointment yesterday. Encourage them gently to come in today.',
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

Create a warm, caring message (max 160 characters for SMS) that addresses the client by name, mentions their service, and uses a supportive tone. Return ONLY the message text.`;

  const aiMessage = await tryGenerateWithAi(prompt);
  if (aiMessage) return aiMessage;

  // Deterministic fallback so a reminder is never dropped because AI is unavailable.
  return fallbackMessage(client, type);
}

// Lovable AI Gateway first, then OpenAI if a key exists. Never throws.
async function tryGenerateWithAi(prompt: string): Promise<string | null> {
  const clean = (t: string) => t.trim().replace(/^["']|["']$/g, '');

  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (lovableKey) {
    try {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${lovableKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a helpful healthcare communication assistant. Return only the message text.' },
            { role: 'user', content: prompt },
          ],
        }),
      });
      if (r.ok) {
        const d = await r.json();
        const text = d?.choices?.[0]?.message?.content;
        if (text) return clean(text);
      } else {
        console.error('Lovable AI error:', r.status, await r.text());
      }
    } catch (e) {
      console.error('Lovable AI request failed:', (e as Error).message);
    }
  }

  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (openaiApiKey) {
    try {
      const r = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openaiApiKey}`, 'Content-Type': 'application/json' },
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
      if (r.ok) {
        const d = await r.json();
        const text = d?.choices?.[0]?.message?.content;
        if (text) return clean(text);
      } else {
        console.error('OpenAI error:', r.status, await r.text());
      }
    } catch (e) {
      console.error('OpenAI request failed:', (e as Error).message);
    }
  }

  return null;
}

function fallbackMessage(client: any, type: string): string {
  const due = client.due_date ? new Date(client.due_date).toLocaleDateString() : '';
  const name = client.name || 'Hello';
  const service = client.service || 'your appointment';
  switch (type) {
    case 'upcoming':
      return `Hello ${name}, a friendly reminder: your ${service} appointment is on ${due}. We look forward to seeing you.`;
    case 'day_of':
      return `Hello ${name}, your ${service} appointment is today. Please visit your health facility. We look forward to seeing you.`;
    case 'follow_up':
      return `Hello ${name}, we missed you at your ${service} appointment yesterday. Please come in today so we can care for you.`;
    case 'defaulter':
      return `Hello ${name}, you missed your ${service} appointment on ${due}. Please visit your health facility soon to reschedule.`;
    default:
      return `Hello ${name}, this is a reminder about your ${service} appointment due ${due}. Please visit your health facility.`;
  }
}


// ──────────────── LOGGING ────────────────
async function logReminder(patientId: string, type: string, message: string, accountId: string | null, category: string, messageSid?: string, idemKey?: string) {
  const { error } = await supabaseAdmin.from('patient_reminders').insert({
    patient_id: patientId,
    reminder_type: type,
    message,
    status: 'sent',
    delivery_status: 'queued',
    sent_at: new Date().toISOString(),
    last_attempted_at: new Date().toISOString(),
    account_id: accountId,
    reminder_category: category,
    external_message_id: messageSid || null,
    idempotency_key: idemKey || null,
  });
  if (error) console.error('Error logging reminder:', error);
}

async function logFailedReminder(patientId: string, type: string, errorMsg: string, accountId: string | null, category: string, idemKey?: string, nextRetryAt?: string) {
  const { error } = await supabaseAdmin.from('patient_reminders').insert({
    patient_id: patientId,
    reminder_type: type,
    message: `FAILED: ${errorMsg}`,
    status: 'failed',
    delivery_status: 'failed',
    sent_at: new Date().toISOString(),
    last_attempted_at: new Date().toISOString(),
    account_id: accountId,
    reminder_category: category,
    error_detail: errorMsg,
    idempotency_key: idemKey || null,
    next_retry_at: nextRetryAt || null,
  });
  if (error) console.error('Error logging failed reminder:', error);
}

// ──────────────── SMS VIA TERMII ────────────────
function normalizeForTermii(phoneNumber: string): string {
  let n = (phoneNumber || '').replace(/[\s\-()]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0') && n.length === 11) n = '234' + n.slice(1);
  return n;
}

async function sendSMS(phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  const termiiApiKey = Deno.env.get('TERMII_API_KEY');
  const termiiSenderId = Deno.env.get('TERMII_SENDER_ID');
  if (!termiiApiKey) throw new Error('TERMII_API_KEY is not configured');
  if (!termiiSenderId) throw new Error('TERMII_SENDER_ID is not configured');

  const to = normalizeForTermii(phoneNumber);
  const response = await fetch('https://v3.api.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to, from: termiiSenderId, sm: message, type: 'plain', channel: 'generic', api_key: termiiApiKey,
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || (data.code && data.code !== 'ok')) {
    throw new Error(`Termii SMS failed: ${data.message || data.code || `HTTP ${response.status}`}`);
  }
  return { messageSid: data.message_id || data.messageId || crypto.randomUUID() };
}

// ──────────────── WHATSAPP VIA WATI ────────────────
function normalizeForWati(phoneNumber: string): string {
  let n = (phoneNumber || '').replace(/[\s\-()]/g, '');
  if (n.startsWith('+')) n = n.slice(1);
  if (n.startsWith('0') && n.length === 11) n = '234' + n.slice(1);
  return n; // WATI expects plain international number, e.g. 2348012345678
}

async function sendWhatsApp(phoneNumber: string, message: string): Promise<{ messageSid: string }> {
  const apiKey = Deno.env.get('WATI_API_KEY');
  const instanceUrl = Deno.env.get('WATI_INSTANCE_URL')?.replace(/\/$/, '');
  if (!apiKey || !instanceUrl) throw new Error('WATI credentials not configured (WATI_API_KEY, WATI_INSTANCE_URL)');

  const to = normalizeForWati(phoneNumber);
  const r = await fetch(`${instanceUrl}/api/v1/sendSessionMessage/${to}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messageText: message }),
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.result === false) {
    throw new Error(`WATI WhatsApp failed: ${data.error || data.message || `HTTP ${r.status}`}`);
  }

  return { messageSid: data.info?.whatsappMessageId || data.id || crypto.randomUUID() };
}

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
