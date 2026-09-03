/**
 * Thelma knowledge-base changelog.
 *
 * Bump KB_VERSION and add an entry whenever features, roles, routes or
 * database tables change. The sync check (knowledgeSync.test.ts) fails when
 * routes/tables exist in the app but are missing from the knowledge base.
 */

export const KB_VERSION = "2026.09.03";

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const KB_CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-09-03",
    title: "Knowledge base, sync checks and role summaries",
    items: [
      "Added this changelog so Thelma can tell users what changed and when.",
      "Added concise role-based capability summaries (view / do / cannot) per role.",
      "Added an automated check that flags when the knowledge base drifts from the app's routes or database tables.",
    ],
  },
  {
    date: "2026-08",
    title: "Security and access-scope hardening",
    items: [
      "Signed-out (anonymous) access to database functions removed; only signed-in users and the backend can call them.",
      "Client status resync RPCs now require an authenticated caller with a Facility Officer, Program Manager or System Admin role, and only act on clients in the caller's own organisation (System Admins keep full scope).",
      "Visit, immunization and reminder writes now verify the client actually belongs to the caller's organisation.",
      "Reminder visibility narrowed to the user's own facility; Program Managers see their LGA, System Admins see everything.",
      "Profile creation restricted to Program Managers and System Admins within their own organisation.",
      "System Admins can see all facilities, users and roles; Program Managers see all facilities and team members in their single assigned LGA.",
    ],
  },
  {
    date: "2026-08",
    title: "SMS reminders (Termii) end-to-end",
    items: [
      "AI-generated reminder text via Lovable AI with a deterministic fallback message.",
      "Automated windows in Africa/Lagos time: 3 days before, day-of, day-after follow-up, and defaulter follow-up, with idempotency keys so each window sends once.",
      "Automatic retries with exponential backoff; Termii delivery webhook updates sent / delivered / failed with reasons.",
      "Editable SMS templates per service and reminder category (/sms-templates).",
      "Reminder History (/reminders): facility, status and date filters, delivery timeline sheet, rate-limited manual resend, CSV export.",
      "Automated SMS Runs (/sms-runs) monitoring, admin SMS delivery KPI card, and alerts when the 24h failure rate spikes.",
      "Every manual resend is recorded in the audit log.",
    ],
  },
  {
    date: "2026-07",
    title: "Accountability: roster, audit log and branded IDs",
    items: [
      "Facility roster of health workers (name + designation) with Excel template, upload and per-row validation (/roster).",
      "Staff confirm which health worker is acting; that name and designation is stored on each audit entry.",
      "Audit Log (/audit-log) for all roles, scoped to their own data: filters, server-side pagination, before/after details drawer, CSV export.",
      "'Last updated by' badge on each client card.",
      "Branded client system IDs in the form RXM-YYMMDD-XXXX, backfilled onto existing clients, alongside optional LASRAA ID and NIN.",
    ],
  },
  {
    date: "2026-07",
    title: "Lagos State oversight",
    items: [
      "System Admin dashboard (/admin): global KPIs, client and defaulter overview, LGA performance grid, 30-day trend chart with CSV export, team management with role filters.",
      "One Program Manager per LGA, enforced in the database, with an audited 'Reassign Program Manager' action.",
      "PHC management (/admin/phcs) over the preloaded Lagos LGA / ward / PHC lists, plus 'Other' for unlisted PHCs.",
      "Sign-up captures LGA, ward and PHC; the dashboard greets users by their PHC/facility name.",
      "System Admins and Program Managers stand alone — not attached to a PHC.",
    ],
  },
  {
    date: "2026-06",
    title: "Clients and clinical schedules",
    items: [
      "Ante Natal Care: WHO 8-contact schedule generated from LMP (EDD via Naegele's rule) with working completion toggles.",
      "Routine Immunization: Nigeria 2026 EPI schedule with automated visit generation and progress tracking.",
      "Defaulter detection runs daily; clients return to On Track automatically when their next visit date is ahead of today.",
      "Client transfers require source-facility approval; cross-facility search redacts phone numbers outside your organisation.",
    ],
  },
];

export function formatChangelogForPrompt(entries = KB_CHANGELOG): string {
  return entries
    .map((e) => `### ${e.date} — ${e.title}\n${e.items.map((i) => `- ${i}`).join("\n")}`)
    .join("\n\n");
}
