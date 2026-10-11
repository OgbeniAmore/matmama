/**
 * Thelma knowledge-base changelog.
 *
 * Bump KB_VERSION and add an entry whenever features, roles, routes or
 * database tables change. The sync check (knowledgeSync.test.ts) fails when
 * routes/tables exist in the app but are missing from the knowledge base.
 */

export const KB_VERSION = "2026.10.11a";

export type ChangelogEntry = {
  date: string;
  title: string;
  items: string[];
};

export const KB_CHANGELOG: ChangelogEntry[] = [
  {
    date: "2026-10-11",
    title: "AI reminders use the service's SMS template for the reminder type (all roles)",
    items: [
      "When sending an AI reminder (single or bulk), staff pick: Visit reminder, Day after scheduled visit, or Defaulter follow-up — or Auto-detect from the visit date.",
      "The message comes from the SMS Templates page for the client's service (Immunization, Family Planning or ANC) and that type. If the template is turned off, an AI message is written instead.",
      "Auto-detect: due today or later → visit reminder; 1–2 days late → day after visit; 3+ days late or Defaulting → defaulter follow-up. Program Managers and System Admins edit templates.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Live ANC trimester; link a child to the mother's ANC record at registration (all roles)",
    items: [
      "The trimester on ANC client cards, profiles and SMS reminders is now worked out from the LMP every time, so it moves from 1st to 2nd (13 weeks) to 3rd (27 weeks) automatically.",
      "On Add Client for Routine Immunization, 'Link mother's ANC record' searches all Lagos facilities by LASRAA ID, NIN, system ID or name. Choosing her fills the parent name and phone and links the child to her record, so the child appears under her Delivery & Children section. Facility Officers, Program Managers and System Admins can search; Data Entry Officers cannot run the cross-facility search.",
      "If the mother's record is at another facility, the child's profile shows that she is linked; request a share to view her file.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Vitals recorded under each of the 8 ANC visits; Admins and PMs not tied to a facility (all roles)",
    items: [
      "On an ANC client's profile, each of the 8 contacts in the ANC Schedule has a 'Vitals' button. Open it to record and view BP, fundal height, fetal heart rate, urinalysis, weight and Hb for that visit. The risk level of the visit shows on the button.",
      "System Admins are no longer linked to any facility or LGA and see all facilities and clients across every Lagos LGA. Program Managers are no longer linked to a facility; they oversee every facility in their assigned LGA.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Ticking ANC visits/vaccines fixed; update pending lab results from the profile (all roles)",
    items: [
      "Marking ANC visits Complete and vaccines Administered now works for Facility Officers, Program Managers and System Admins, including for clients whose records moved between facilities. Data Entry Officers remain view-only for ticking.",
      "On an ANC client's profile, the 'Booking history & tests' card has an Update button (shows how many results are pending). Enter Blood group, Genotype, HIV I & II, Hepatitis B, VDRL and Gravida/Para there once results return; no need to open Edit client.",
    ],
  },
  {
    date: "2026-10-10",
    title: "Service chosen first on the registration form (all roles)",
    items: [
      "On Add Client, the Service selector is now the first field. Pick Routine Immunization, Family Planning or Ante Natal Care before entering details.",
      "The rest of the form then adapts to the service: child name and date of birth for Routine Immunization; LMP, pregnancy history and booking tests for Ante Natal Care.",
      "The name field is labelled 'Parent/Guardian Name' for Routine Immunization and 'Client Name' for the other services.",
    ],
  },
  {
    date: "2026-10-10",
    title: "ANC booking tests, Gravida/Para and Home risk alerts (all roles)",
    items: [
      "When registering an ANC client, record Gravida and Para. Gravida = total times ever pregnant including this pregnancy (ask: 'How many times have you ever been pregnant, counting this one and any miscarriage or lost pregnancy?'). Para = past births after about 7 months (28 weeks), alive or stillborn (ask: 'How many times have you given birth to a baby after about 7 months of pregnancy?'). Para must be less than Gravida.",
      "Booking tests are requested at first contact (registration) only: Blood group, Genotype, HIV I & II, Hepatitis B (HBsAg) and VDRL. Use 'Pending' until results return, then update via Edit client.",
      "The ANC profile shows a 'Booking history & tests' card (e.g. G3 P2); reactive/positive results, Rh-negative blood groups and SS/SC genotype are highlighted red for follow-up.",
      "The Home dashboard now lists every ANC client whose latest vitals are Critical or High risk, with the risk reasons, so Facility Officers can act immediately. Visible to all roles for the clients they can access.",
    ],
  },
  {
    date: "2026-10-10",
    title: "ANC clinical vitals and maternal risk triage (all roles)",
    items: [
      "Open an ANC client and tap 'Record vitals' to enter BP, fundal height, fetal heart rate, urine protein/glucose, weight and haemoglobin. Gestational age is pre-filled from LMP.",
      "Live triage while typing: Critical = BP >=160/110 (severe hypertension, or severe pre-eclampsia with proteinuria), Hb <7, FHR <110. High = BP >=140/90 with protein >=1+ (pre-eclampsia), Hb 7-9.9, FHR >160. Moderate = BP >=140/90 alone, Hb 10-10.9, urine glucose >=2+, fundal height off by >3 cm from gestational weeks (20-40 wks), weight <45 kg.",
      "Each flag shows a recommended action (e.g. MgSO4 + urgent referral). This is decision support only; facility protocol and clinical judgement come first.",
      "The latest moderate/high/critical result shows as a red or amber risk banner at the top of the client's profile; full vitals history is listed with who recorded it.",
      "All roles that can act on the client (including Data Entry Officers) can record vitals; Facility Officers, Program Managers and System Admins can delete entries. Every entry is audit-logged.",
    ],
  },
  {
    date: "2026-10-07",
    title: "Phone-friendly layout and home screen icon (all roles)",
    items: [
      "Matmama now fits all Android and iPhone screens, including phones with notches and gesture bars.",
      "Add to home screen on iPhone: open Matmama in Safari, tap Share, then 'Add to Home Screen'. The Matmama logo becomes the app icon.",
      "Add to home screen on Android: open Matmama in Chrome, tap the menu, then 'Add to Home screen' or 'Install app'.",
      "Opened from the home screen, Matmama runs full-screen like an app. Internet is still required.",
    ],
  },
  {
    date: "2026-10-02",
    title: "Mother & child records, temporary sharing and Facility Inbox",
    items: [
      "Temporary client sharing with another facility: choose a reason (visiting or relocation) and a duration; access ends automatically.",
      "Facility Inbox (/inbox) lists pending requests to approve or reject plus currently shared clients; the Roster shows when each share ends.",
      "Cancelling a pending request deletes it, so it disappears for both facilities. Only the requester can cancel.",
      "ANC mothers: record a delivery per pregnancy, register babies under the mother's file (each becomes a Routine Immunization client), and start a new pregnancy.",
      "Baby name is optional at birth ('Baby of [mother]') but required from the second immunization visit. A Schedule button opens each baby's immunization schedule.",
      "Growth chart on each child's file: record dated weight and height and track trends by age in months.",
    ],
  },
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
