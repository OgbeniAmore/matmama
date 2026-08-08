export type PageContext = {
  path: string;
  name: string;
  description: string;
};

const PAGE_MAP: Array<{ match: RegExp; name: string; description: string }> = [
  {
    match: /^\/(dashboard)?$/,
    name: "Dashboard",
    description:
      "Home dashboard. Greets the user by their PHC/facility name, shows services overview (Routine Immunization, Family Planning, ANC), reminder stats widget, and quick links.",
  },
  {
    match: /^\/clients$/,
    name: "Clients",
    description:
      "Card-based list of clients. Users can add clients (service-specific fields like LMP for ANC, child DOB for immunization), tap a client name to open full details, view ANC/immunization schedules and transfer history, mark visits completed, send AI reminders, and open the client's location on a map. Clients carry branded system IDs (RXM-YYMMDD-XXXX) plus optional LASRAA ID and NIN. Each card shows a 'Last updated by' badge naming the health worker who last acted.",
  },
  {
    match: /^\/defaulters$/,
    name: "Defaulters",
    description:
      "Clients who missed scheduled visits. Supports bulk reminders, individual actions, and a manual 'Run Defaulter Check'. Defaulters automatically return to On Track when a new visit date is ahead of today.",
  },
  {
    match: /^\/reminders$/,
    name: "Reminder History",
    description:
      "History of AI-generated SMS (Termii) and WhatsApp reminders. Filter by facility, delivery status and date range; open a reminder to see its delivery timeline (sent, delivered, failed, reason, retry attempts), resend failed SMS (rate-limited with cooldown), and export history or a timeline to CSV.",
  },
  {
    match: /^\/sms-runs$/,
    name: "Automated SMS Runs",
    description:
      "Monitoring page for automated reminder runs: per-window send counts (T-3 upcoming, day-of, follow-up, defaulter), successes and failures broken down by facility and date.",
  },
  {
    match: /^\/sms-templates$/,
    name: "SMS Templates",
    description:
      "Editable SMS message templates per service (Routine Immunization, Family Planning, Ante Natal Care) and per reminder category, so message wording can change without code changes. Templates can be enabled or disabled.",
  },
  {
    match: /^\/transfers$/,
    name: "Transfers",
    description:
      "Incoming and outgoing client transfer requests between facilities. The source facility must approve before a client moves; both sides get notifications.",
  },
  {
    match: /^\/team$/,
    name: "Team",
    description:
      "Manage team members: invite users by email, assign roles, facility, and LGA; edit roles, resend invitations (with cooldown) and see invite status (sent / accepted). System Admins see all users; Program Managers see users in their LGA.",
  },
  {
    match: /^\/facilities\/[^/]+$/,
    name: "Facility Detail",
    description:
      "Single facility view with its staff, clients and details (ward, LGA, address).",
  },
  {
    match: /^\/facilities$/,
    name: "Facilities",
    description:
      "Manage healthcare facilities with staff and client counts, each tagged to a Lagos LGA and ward. System Admins see every facility; Program Managers see facilities in their LGA.",
  },
  {
    match: /^\/roster$/,
    name: "Facility Roster",
    description:
      "Roster of health workers at the facility (name + designation, active/inactive). Supports Excel upload with a downloadable template and per-row validation. The active worker selected here is attributed to every action in the audit log.",
  },
  {
    match: /^\/audit-log$/,
    name: "Audit Log",
    description:
      "Non-editable audit trail: who did what, when, and which client/visit was affected, including the health worker's name and designation. Supports date-range and action filters, server-side pagination, a details drawer with before/after field changes, and CSV export. Available to all roles, scoped to their own data.",
  },
  {
    match: /^\/admin\/phcs$/,
    name: "PHC Management",
    description:
      "System Admin page to review and manage the Primary Health Centre list per LGA and ward, and add PHCs that are missing from the preloaded Lagos list.",
  },
  {
    match: /^\/admin$/,
    name: "Admin Dashboard",
    description:
      "System Admin oversight across all 20 Lagos LGAs: global KPIs, client and defaulter overview, SMS delivery KPI card (delivery rate, failure reasons, last 24h volume), a 30-day trend chart of new clients and defaulter rate per LGA with CSV export, an LGA performance grid with a 'Reassign Program Manager' action (one PM per LGA), and team/user management with role filters.",
  },
  {
    match: /^\/client-search$/,
    name: "Cross-Facility Client Search",
    description:
      "Secure global search for clients across all facilities by name, LASRAA ID, NIN ID, or system ID. Phone numbers of clients outside your own organisation are redacted.",
  },
  {
    match: /^\/profile$/,
    name: "Profile & Settings",
    description:
      "User's profile, role-based permissions card, password change (with strength meter and breached-password check), and link to notification preferences.",
  },
  {
    match: /^\/notification-preferences$/,
    name: "Notification Preferences",
    description:
      "Toggle in-app and email notifications for reminders, defaulters, and transfers.",
  },
];


export function getPageContext(pathname: string): PageContext {
  const match = PAGE_MAP.find((p) => p.match.test(pathname));
  if (match) return { path: pathname, name: match.name, description: match.description };
  return {
    path: pathname,
    name: "Unknown page",
    description: `The user is on ${pathname}, which isn't a documented page.`,
  };
}

type Suggestion = { label: string; prompt: string };

const COMMON: Suggestion[] = [
  { label: "How does this page work?", prompt: "How does the page I'm currently on work? Walk me through it." },
  { label: "What's my role?", prompt: "What does my role allow me to do on this platform?" },
];

const ROLE_SUGGESTIONS: Record<string, Suggestion[]> = {
  facility_officer: [
    { label: "Register a new client", prompt: "How do I register a new client?" },
    { label: "Add an ANC client", prompt: "How do I add an Ante Natal Care client using LMP, and how is the 8-contact schedule generated?" },
    { label: "Mark a visit completed", prompt: "How do I mark an ANC or immunization visit as completed?" },
    { label: "Handle a defaulter", prompt: "How do I follow up with a defaulting client, and how does a client return to On Track?" },
    { label: "Fix a failed SMS", prompt: "A reminder SMS failed. How do I check its delivery timeline and resend it?" },
    { label: "Manage the roster", prompt: "How do I manage the health worker roster and upload it from Excel?" },
    { label: "Transfer a client", prompt: "How do I transfer a client to another facility?" },
  ],
  data_entry_officer: [
    { label: "Register a new client", prompt: "How do I register a new client?" },
    { label: "Update client info", prompt: "How do I update a client's contact details?" },
    { label: "Record a visit", prompt: "How do I record that a client attended a visit?" },
    { label: "Find a client", prompt: "How do I find an existing client by name or ID?" },
    { label: "Who am I logging as?", prompt: "Why am I asked to pick a health worker before saving, and where does that show up?" },
  ],
  program_manager: [
    { label: "Approve a transfer", prompt: "How do I approve or reject a client transfer request?" },
    { label: "Invite a team member", prompt: "How do I invite a new team member and assign their role, facility and LGA?" },
    { label: "Review defaulters", prompt: "How do I review defaulters across the facilities in my LGA?" },
    { label: "Check SMS runs", prompt: "How do I check automated SMS reminder runs and see failures by facility?" },
    { label: "Edit SMS templates", prompt: "How do I edit the SMS reminder templates for each service?" },
    { label: "Read audit logs", prompt: "How do I use the audit log filters, details drawer and CSV export?" },
  ],
  system_admin: [
    { label: "Tour the admin dashboard", prompt: "Walk me through the Admin Dashboard: global KPIs, LGA grid, SMS KPIs and the 30-day trend chart." },
    { label: "Reassign a Program Manager", prompt: "How do I reassign the Program Manager seat for an LGA?" },
    { label: "Manage PHCs", prompt: "How do I review the PHC list per LGA and ward, and add a missing PHC?" },
    { label: "Invite an admin", prompt: "How do I invite another admin or a program manager and set their access level?" },
    { label: "Resend an invite", prompt: "An invited user didn't get their email. How do I check invite status and resend it?" },
    { label: "Review audit logs", prompt: "How do I investigate activity across all roles in the audit log?" },
  ],
};


export function getSuggestionsForRole(role: string | null): Suggestion[] {
  const base = role ? ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.facility_officer : ROLE_SUGGESTIONS.facility_officer;
  return [...COMMON, ...base];
}
