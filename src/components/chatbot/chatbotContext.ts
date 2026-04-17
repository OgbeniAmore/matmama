export type PageContext = {
  path: string;
  name: string;
  description: string;
};

const PAGE_MAP: Array<{ match: RegExp; name: string; description: string }> = [
  {
    match: /^\/$/,
    name: "Dashboard",
    description:
      "Home dashboard showing services overview (Routine Immunization, Family Planning, ANC), reminder stats, and quick links.",
  },
  {
    match: /^\/clients$/,
    name: "Clients",
    description:
      "Card-based list of all clients in the user's facility. Users can add new clients (with service-specific fields like LMP for ANC), search, filter, view details, send reminders, and open client maps.",
  },
  {
    match: /^\/defaulters$/,
    name: "Defaulters",
    description:
      "List of clients who have missed scheduled visits. Supports bulk reminders, individual actions, and a manual 'Run Defaulter Check' trigger.",
  },
  {
    match: /^\/reminders$/,
    name: "Reminder History",
    description:
      "History of AI-generated SMS/WhatsApp reminders sent to clients via Twilio, with delivery status.",
  },
  {
    match: /^\/transfers$/,
    name: "Transfers",
    description:
      "Incoming and outgoing client transfer requests between facilities. Source facility must approve transfers before clients move.",
  },
  {
    match: /^\/team$/,
    name: "Team",
    description:
      "Manage team members: invite users by email, assign roles and facilities, edit or remove members. Visible to System Admin and Program Manager.",
  },
  {
    match: /^\/facilities$/,
    name: "Facilities",
    description:
      "Manage healthcare facilities in the account, with staff and client counts. Visible to System Admin and Program Manager.",
  },
  {
    match: /^\/audit-log$/,
    name: "Audit Log",
    description:
      "Non-editable audit trail of all significant system actions. Visible to System Admin and Program Manager.",
  },
  {
    match: /^\/client-search$/,
    name: "Cross-Facility Client Search",
    description:
      "Secure global search to look up clients across all facilities by LASRAA ID, NIN ID, or system ID.",
  },
  {
    match: /^\/profile$/,
    name: "Profile & Settings",
    description:
      "User's profile, role-based permissions card, password change, and link to notification preferences.",
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
    { label: "Send a reminder", prompt: "How do I send a reminder to a client?" },
    { label: "Add an ANC client", prompt: "How do I add an Ante Natal Care client using LMP?" },
    { label: "Handle a defaulter", prompt: "How do I follow up with a defaulting client?" },
    { label: "Transfer a client", prompt: "How do I transfer a client to another facility?" },
  ],
  data_entry_officer: [
    { label: "Register a new client", prompt: "How do I register a new client?" },
    { label: "Update client info", prompt: "How do I update a client's contact details?" },
    { label: "Record a visit", prompt: "How do I record that a client attended a visit?" },
    { label: "Find a client", prompt: "How do I find an existing client?" },
  ],
  program_manager: [
    { label: "Approve a transfer", prompt: "How do I approve or reject a client transfer request?" },
    { label: "Invite a team member", prompt: "How do I invite a new team member and assign their role?" },
    { label: "Review defaulters", prompt: "How do I review defaulters across all facilities?" },
    { label: "Read audit logs", prompt: "How do I use the audit log to investigate actions?" },
    { label: "Send bulk reminders", prompt: "How do I send bulk reminders to defaulters?" },
  ],
  system_admin: [
    { label: "Add a facility", prompt: "How do I add a new facility to the account?" },
    { label: "Invite a team member", prompt: "How do I invite a team member and assign role + facility?" },
    { label: "Manage permissions", prompt: "How do roles and permissions work on the platform?" },
    { label: "Review audit logs", prompt: "How do I use the audit log to investigate activity?" },
    { label: "Configure notifications", prompt: "How do users configure their notification preferences?" },
  ],
};

export function getSuggestionsForRole(role: string | null): Suggestion[] {
  const base = role ? ROLE_SUGGESTIONS[role] || ROLE_SUGGESTIONS.facility_officer : ROLE_SUGGESTIONS.facility_officer;
  return [...COMMON, ...base];
}
