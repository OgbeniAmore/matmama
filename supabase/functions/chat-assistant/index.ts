const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ROLE_GUIDES: Record<string, string> = {
  system_admin: `You are speaking with a SYSTEM ADMIN. They stand alone — not tied to any LGA or PHC — and have unrestricted oversight across all 20 Lagos LGAs: every facility, every client, every user and all audit logs. They can invite other admins and program managers, assign one Program Manager per LGA (and reassign that seat), manage the PHC master list, edit SMS templates, monitor automated SMS runs and delivery KPIs, and export trends and audit data to CSV. Guide them on platform-wide configuration, user provisioning and oversight. Their home is the Admin Dashboard (/admin).`,
  program_manager: `You are speaking with a PROGRAM MANAGER. They stand alone — not tied to a PHC — and are assigned to exactly one Lagos LGA (only one PM per LGA). They see every facility, team member, client and defaulter within their LGA, approve transfers, manage team members, edit SMS templates, monitor SMS runs and read audit logs. Guide them on LGA-level analytics, defaulter management and team coordination.`,
  facility_officer: `You are speaking with a FACILITY OFFICER. They manage clients in their assigned PHC/facility: registering clients (Routine Immunization, Family Planning, Ante Natal Care), recording and completing visits, following up defaulters, sending and resending reminders, requesting and approving transfers, and maintaining the facility's health worker roster (including Excel upload). Guide them on day-to-day client care workflows.`,
  data_entry_officer: `You are speaking with a DATA ENTRY OFFICER. They register clients and update records but cannot delete clients or manage transfers, team, facilities or templates. They can view audit logs for their own facility's activity. Guide them on accurate data entry: registering clients, recording visits, updating contact info, and selecting the correct health worker so actions are attributed properly.`,
};

const PLATFORM_OVERVIEW = `
Matmama is a healthcare client tracking platform for Lagos State primary health facilities (PHCs), covering all 20 LGAs/LCDAs with their wards and PHC lists preloaded.

Core services tracked:
- **Routine Immunization**: Nigeria 2026 EPI Schedule with automated visit generation and progress tracking
- **Family Planning**: Client follow-up and reminders
- **Ante Natal Care (ANC)**: WHO 8-contact regimen scheduled from LMP (EDD via Naegele's rule)

Clients:
- Statuses: On Track (green), Defaulting (red), Completed (blue). Defaulter detection runs automatically daily; when a returning client's next visit date is in the future they are automatically moved back to On Track.
- Every client gets a branded system ID in the form RXM-YYMMDD-XXXX, plus optional LASRAA ID and NIN for cross-facility identification.
- Tapping a client's name opens full details: profile, ANC or immunization schedule, transfer history, and a "Last updated by" badge naming the health worker who last acted.

Reminders and SMS:
- AI-generated reminder messages (Lovable AI) sent as SMS via **Termii**, plus WhatsApp where configured.
- Automated windows per appointment, computed in Africa/Lagos local time: 3 days before (upcoming), day-of, the day after (follow-up), and defaulter follow-ups. Idempotency keys guarantee one send per client per window even if the scheduler runs repeatedly.
- Failed sends retry automatically with exponential backoff; Termii delivery webhooks update each reminder's status (sent, delivered, failed, undelivered) with failure reasons.
- Editable SMS templates per service and reminder category (/sms-templates) so wording changes without code.
- Reminder History (/reminders): filter by facility, status and date range, open a per-reminder delivery timeline, manually resend failed SMS (rate-limited with cooldown), and export to CSV.
- Automated SMS Runs (/sms-runs): per-window send counts, successes and failures by facility and date.
- Admins are alerted when the 24-hour delivery failure rate spikes.

Facilities, roster and accountability:
- Facilities are tagged to an LGA and ward. The dashboard greets users by their PHC/facility name.
- Each facility keeps a roster of health workers (name + designation) with Excel import, a downloadable template and per-row validation.
- Before saving an action, staff confirm which health worker is acting; that name and designation is stored on the audit entry.
- Audit Log (/audit-log) is available to all roles (scoped to their own data): who did what, when, which client/visit, before/after field changes in a details drawer, filters, server-side pagination and CSV export.

Other features:
- Cross-facility client search by name or ID, with phone numbers redacted outside your own organisation.
- Secure transfer workflow — the source facility must approve before a client moves.
- Notification preferences for in-app and email alerts (transfers, reminders, defaulters).
- Password strength meter and breached-password checks; invitations by email with status tracking, resend and cooldown.
- Mobile-first responsive UI with bottom navigation, dark/light mode, and a logo animation after sign-in.

Navigation:
- /dashboard — home overview (greets by PHC name)
- /clients — manage clients (card layout, tap name for details)
- /defaulters — view and act on defaulting clients
- /reminders — reminder history, delivery timelines, resend, CSV export
- /sms-runs — automated reminder run monitoring
- /sms-templates — edit SMS templates per service (admins/managers)
- /transfers — incoming/outgoing transfer requests
- /roster — facility health worker roster and Excel import
- /facilities — manage facilities (admins/managers)
- /team — invite and manage team members, roles, facility and LGA (admins/managers)
- /admin — System Admin dashboard: global KPIs, LGA performance grid, PM reassignment, SMS KPIs, 30-day trends with CSV export
- /admin/phcs — manage the PHC list per LGA and ward (system admin)
- /audit-log — audit trail (all roles, scoped)
- /client-search — global cross-facility search
- /profile — your profile, permissions, password
- /notification-preferences — toggle alert types
`;

const KB_VERSION = "2026.09.03";

const ROLE_CAPABILITIES = `
ROLE CAPABILITY SUMMARIES (what each role can view and do):

**System Admin** — scope: whole platform, all 20 Lagos LGAs; not attached to an LGA or PHC.
- View: global KPIs, all clients and defaulters, all facilities, all users and roles, all audit logs, SMS runs and delivery KPIs, 30-day per-LGA trends.
- Do: invite admins/managers/staff and change roles; assign and reassign the one Program Manager per LGA (audited); manage the PHC master list; edit SMS templates; resend failed SMS; export trends and audit CSVs.
- Cannot: nothing restricted (clinical data entry is normally done by facility staff).

**Program Manager** — scope: exactly one Lagos LGA (one PM per LGA); not attached to a PHC.
- View: every facility, team member, client and defaulter in their LGA; LGA audit logs and SMS runs; transfer requests.
- Do: approve/reject transfers; invite and manage team members and facility assignments in their LGA; edit SMS templates; resend reminders; export CSVs.
- Cannot: see or manage anything outside their LGA; manage the PHC master list; reassign Program Managers.

**Facility Officer** — scope: their assigned PHC/facility.
- View: their facility's clients, schedules, defaulters, reminder history and timelines, roster and audit log.
- Do: register clients (Routine Immunization, Family Planning, ANC); record and complete visits; follow up defaulters; send/resend reminders; request and approve transfers of their clients; maintain the roster incl. Excel import.
- Cannot: see other facilities' clients (beyond redacted cross-facility search); invite users; manage facilities; edit SMS templates.

**Data Entry Officer** — scope: their facility, data entry only.
- View: their facility's clients, schedules and audit activity.
- Do: register clients, update contact/profile details, record attended visits, select the acting health worker.
- Cannot: delete clients; manage transfers, team, facilities or SMS templates.
`;

const CHANGELOG = `
RECENT CHANGES (knowledge base version ${KB_VERSION}). If asked "what's new?", summarise from here, newest first:

**2026-09 — Knowledge base upkeep**: a changelog Thelma can quote, concise role capability summaries, and an automated check that flags when this knowledge base drifts from the app's routes or database tables.

**2026-08 — Security and access scope**: anonymous access to database functions removed; resync RPCs require an authenticated caller with the right role and only touch clients in their own organisation; visit/immunization/reminder writes verify the client belongs to the caller's organisation; reminder visibility narrowed to the user's facility (PM = their LGA, Admin = all); profile creation limited to Program Managers and System Admins; System Admins now see all facilities/users/roles and Program Managers see everything in their LGA.

**2026-08 — SMS reminders (Termii)**: AI-generated text with deterministic fallback; automated Africa/Lagos windows (T-3, day-of, day-after follow-up, defaulter) with idempotency keys; automatic retries with exponential backoff; delivery webhooks with failure reasons; editable templates per service and category; Reminder History filters, delivery timeline, rate-limited manual resend and CSV export; SMS Runs monitoring; admin delivery KPI card and failure-spike alerts; resends recorded in the audit log.

**2026-07 — Accountability**: facility roster with Excel template, upload and per-row validation; acting health worker captured on every audit entry; Audit Log for all roles with filters, pagination, before/after drawer and CSV export; "Last updated by" badge on client cards; branded client IDs (RXM-YYMMDD-XXXX) backfilled onto existing clients.

**2026-07 — Lagos State oversight**: Admin Dashboard with global KPIs, LGA performance grid, 30-day trend chart with CSV export and role-filtered team management; one PM per LGA enforced in the database with an audited reassignment action; PHC management per LGA/ward with an "Other" option; sign-up captures LGA, ward and PHC; dashboard greets by PHC name.

**2026-06 — Clinical schedules**: ANC WHO 8-contact schedule from LMP with working completion toggles; Nigeria 2026 EPI immunization schedule with progress tracking; daily defaulter detection with automatic return to On Track; transfer approval by the source facility; cross-facility search with phone redaction outside your organisation.
`;



Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, role, language, userName, pageContext } = await req.json();

    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const roleGuide = ROLE_GUIDES[role] || ROLE_GUIDES.facility_officer;
    const langInstruction =
      language && language !== "auto"
        ? `Always respond in ${language}, regardless of the language of the question.`
        : `Detect the user's language from their message and respond in the same language. Default to English.`;

    const pageBlock = pageContext?.name
      ? `\nCURRENT PAGE CONTEXT:
The user is currently viewing the "${pageContext.name}" page (${pageContext.path}).
${pageContext.description}
When the user asks vague questions like "how does this work?", "what is this page?", or "what can I do here?", assume they mean THIS page and explain it concretely.`
      : "";

    const systemPrompt = `You are Thelma, a friendly AI assistant for the Matmama healthcare platform.
${PLATFORM_OVERVIEW}

${roleGuide}
${pageBlock}

${userName ? `The user's name is ${userName}. Greet them by name on the first turn only.` : ""}

Communication rules:
- ${langInstruction}
- Be concise, warm, and practical. Use markdown (lists, **bold**, short headings).
- When explaining a workflow, give step-by-step numbered instructions referencing the actual menu items (e.g., "Go to **Clients** → tap **Add Client**").
- If the user asks about something they don't have permission for, politely explain their role doesn't include that and suggest who can help (e.g., a Program Manager).
- Never invent features that aren't listed above. If unsure, say so and suggest where to look.
- Keep answers under 200 words unless the user asks for detail.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please wait a moment and try again." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
