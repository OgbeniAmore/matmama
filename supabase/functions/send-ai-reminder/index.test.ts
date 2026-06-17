// E2E test for the send-ai-reminder edge function.
//
// What this verifies:
//   1. dryRun cron correctly groups clients into the upcoming (T-3),
//      day_of (T+0) and follow_up (T-1) windows based on Africa/Lagos local day.
//   2. Idempotency: a second cron run for the same Lagos day skips clients
//      that already have a patient_reminders row with the matching idempotency_key.
//   3. Retry worker: a row marked as failed with next_retry_at in the past is
//      picked up; one with next_retry_at in the future is not.
//
// The cron path uses dryRun + simulatedNow so no real SMS is dispatched and
// no OpenAI/Termii credentials are required for the test to pass.

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL") ?? Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;

const FN_URL = `${SUPABASE_URL}/functions/v1/send-ai-reminder`;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

// Pick a Lagos-local "today" deterministically so the windows resolve cleanly.
const SIM_NOW = "2026-06-15T10:00:00+01:00";
const lagosDay = (offset: number) => {
  const d = new Date("2026-06-15T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const TEST_PREFIX = `e2e-test-${crypto.randomUUID().slice(0, 8)}`;

async function setupAccountAndClients() {
  const { data: account } = await admin
    .from("accounts").insert({ name: `${TEST_PREFIX} account` }).select().single();
  const { data: facility } = await admin
    .from("facilities").insert({ name: `${TEST_PREFIX} facility`, account_id: account!.id }).select().single();

  const baseClient = {
    facility_id: facility!.id,
    account_id: account!.id,
    contact: "08012345678",
    address: "Test address",
    service: "Routine Immunization",
    status: "On Track",
    preferred_channel: "sms",
  };

  const clients = [
    { ...baseClient, id: `${TEST_PREFIX}-up`,  name: "Upcoming Client",  due_date: `${lagosDay(3)}T09:00:00+01:00` },
    { ...baseClient, id: `${TEST_PREFIX}-day`, name: "Day-of Client",    due_date: `${lagosDay(0)}T09:00:00+01:00` },
    { ...baseClient, id: `${TEST_PREFIX}-fu`,  name: "Follow-up Client", due_date: `${lagosDay(-1)}T09:00:00+01:00` },
    { ...baseClient, id: `${TEST_PREFIX}-noop`,name: "No-window Client", due_date: `${lagosDay(10)}T09:00:00+01:00` },
  ];
  await admin.from("clients").insert(clients);
  return { accountId: account!.id, facilityId: facility!.id };
}

async function cleanup() {
  await admin.from("patient_reminders").delete().like("patient_id", `${TEST_PREFIX}%`);
  await admin.from("clients").delete().like("id", `${TEST_PREFIX}%`);
  await admin.from("facilities").delete().like("name", `${TEST_PREFIX}%`);
  await admin.from("accounts").delete().like("name", `${TEST_PREFIX}%`);
}

async function callCron(extra: Record<string, unknown> = {}) {
  const r = await fetch(FN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
    body: JSON.stringify({ automated: true, simulatedNow: SIM_NOW, ...extra }),
  });
  const body = await r.json();
  return { status: r.status, body };
}

Deno.test("automated cron groups clients into T-3, day-of, and follow-up windows", async () => {
  await cleanup();
  const { accountId } = await setupAccountAndClients();
  try {
    const { status, body } = await callCron({ dryRun: true });
    assertEquals(status, 200);
    assertEquals(body.success, true);
    assertEquals(body.lagosDate, lagosDay(0));

    // Each window should match exactly the one matching client we inserted.
    assertEquals(body.results.upcoming.sent, 1, "T-3 window should match 1 client");
    assertEquals(body.results.day_of.sent, 1, "Day-of window should match 1 client");
    assertEquals(body.results.follow_up.sent, 1, "Follow-up window should match 1 client");

    // Now actually log idempotency keys (we simulate "sent" in DB so the second
    // dry run will treat them as already-processed) — insert minimal rows.
    for (const cat of ["automated_upcoming", "automated_day_of", "automated_follow_up"]) {
      const date = cat === "automated_upcoming" ? lagosDay(3)
                 : cat === "automated_day_of" ? lagosDay(0)
                 : lagosDay(-1);
      const cid = cat === "automated_upcoming" ? `${TEST_PREFIX}-up`
                : cat === "automated_day_of" ? `${TEST_PREFIX}-day`
                : `${TEST_PREFIX}-fu`;
      await admin.from("patient_reminders").insert({
        patient_id: cid, reminder_type: "sms", message: "test",
        status: "sent", delivery_status: "queued",
        account_id: accountId, reminder_category: cat,
        idempotency_key: `${cid}:${cat}:${date}`,
      });
    }

    // Second dry run: every window should be skipped (idempotency).
    const second = await callCron({ dryRun: true });
    assertEquals(second.body.results.upcoming.sent, 0);
    assertEquals(second.body.results.upcoming.skipped, 1);
    assertEquals(second.body.results.day_of.sent, 0);
    assertEquals(second.body.results.day_of.skipped, 1);
    assertEquals(second.body.results.follow_up.sent, 0);
    assertEquals(second.body.results.follow_up.skipped, 1);
  } finally {
    await cleanup();
  }
});

Deno.test("retry worker only picks up failed reminders whose backoff window has elapsed", async () => {
  await cleanup();
  const { accountId, facilityId } = await setupAccountAndClients();
  try {
    // Insert one due-now failed row and one scheduled an hour from now.
    const past = new Date(Date.now() - 60_000).toISOString();
    const future = new Date(Date.now() + 60 * 60_000).toISOString();
    const { data: dueRow } = await admin.from("patient_reminders").insert({
      patient_id: `${TEST_PREFIX}-up`, reminder_type: "sms",
      message: "FAILED: prior", status: "failed", delivery_status: "failed",
      account_id: accountId, reminder_category: "automated_upcoming",
      retry_count: 0, max_retries: 3, next_retry_at: past,
    }).select().single();
    const { data: futureRow } = await admin.from("patient_reminders").insert({
      patient_id: `${TEST_PREFIX}-day`, reminder_type: "sms",
      message: "FAILED: prior", status: "failed", delivery_status: "failed",
      account_id: accountId, reminder_category: "automated_day_of",
      retry_count: 0, max_retries: 3, next_retry_at: future,
    }).select().single();

    const r = await fetch(FN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({ processRetries: true }),
    });
    const body = await r.json();
    assertEquals(r.status, 200);
    // The due row is processed (success or failure depending on Termii); the
    // future row is not selected at all.
    assert((body.processed ?? 0) >= 1, "expected at least one reminder processed");

    const { data: untouched } = await admin
      .from("patient_reminders").select("retry_count, next_retry_at").eq("id", futureRow!.id).single();
    assertEquals(untouched!.retry_count, 0, "future-scheduled retry must not be touched");

    const { data: touched } = await admin
      .from("patient_reminders").select("retry_count").eq("id", dueRow!.id).single();
    assert(touched!.retry_count >= 1, "due retry should have been attempted");

    // Silence facilityId unused warning
    void facilityId;
  } finally {
    await cleanup();
  }
});
