/**
 * Concise role-based capability summaries used by Thelma to explain
 * what each role can view and do. Keep these short and factual.
 */

export type AppRole =
  | "system_admin"
  | "program_manager"
  | "facility_officer"
  | "data_entry_officer";

export type RoleCapability = {
  role: AppRole;
  label: string;
  scope: string;
  canView: string[];
  canDo: string[];
  cannotDo: string[];
  routes: string[];
};

export const ROLE_CAPABILITIES: Record<AppRole, RoleCapability> = {
  system_admin: {
    role: "system_admin",
    label: "System Admin",
    scope: "Whole platform — all 20 Lagos LGAs, every facility, user and record. Not attached to an LGA or PHC.",
    canView: [
      "Global KPIs, client and defaulter overview across all LGAs",
      "All facilities, all team members and all roles",
      "All audit logs, SMS runs and delivery KPIs",
      "30-day trend chart of new clients and defaulter rate per LGA",
    ],
    canDo: [
      "Invite admins, program managers and facility staff, and change roles",
      "Assign and reassign the single Program Manager seat per LGA (audited)",
      "Manage the PHC master list per LGA and ward",
      "Edit SMS templates, resend failed SMS, export trends and audit CSVs",
    ],
    cannotDo: ["Nothing is restricted; day-to-day clinical data entry is normally done by facility staff"],
    routes: ["/admin", "/admin/phcs", "/team", "/facilities", "/audit-log", "/sms-runs", "/sms-templates", "/reminders", "/client-search"],
  },
  program_manager: {
    role: "program_manager",
    label: "Program Manager",
    scope: "Exactly one Lagos LGA (only one PM per LGA). Not attached to a PHC.",
    canView: [
      "Every facility, team member, client and defaulter in their LGA",
      "Audit logs and SMS runs for their LGA",
      "Incoming and outgoing transfer requests",
    ],
    canDo: [
      "Approve or reject client transfers",
      "Invite and manage team members and facility assignments in their LGA",
      "Edit SMS templates and resend failed reminders",
      "Export audit logs and reminder history to CSV",
    ],
    cannotDo: [
      "See or manage data outside their LGA",
      "Manage the PHC master list or reassign Program Managers",
    ],
    routes: ["/dashboard", "/clients", "/defaulters", "/facilities", "/team", "/transfers", "/audit-log", "/reminders", "/sms-runs", "/sms-templates"],
  },
  facility_officer: {
    role: "facility_officer",
    label: "Facility Officer",
    scope: "Their assigned PHC / facility only.",
    canView: [
      "Clients, schedules and defaulters at their facility",
      "Reminder history and delivery timelines for their facility",
      "Their facility's roster and audit log",
    ],
    canDo: [
      "Register clients (Routine Immunization, Family Planning, Ante Natal Care) and record or complete visits",
      "Follow up defaulters, send and resend reminders",
      "Request transfers out and approve transfers of their own clients",
      "Maintain the health worker roster, including Excel import",
    ],
    cannotDo: [
      "See other facilities' clients (beyond redacted cross-facility search)",
      "Invite users, manage facilities or edit SMS templates",
    ],
    routes: ["/dashboard", "/clients", "/defaulters", "/reminders", "/transfers", "/roster", "/audit-log", "/client-search"],
  },
  data_entry_officer: {
    role: "data_entry_officer",
    label: "Data Entry Officer",
    scope: "Their assigned facility, data entry only.",
    canView: [
      "Clients and schedules at their facility",
      "Their facility's audit log activity",
    ],
    canDo: [
      "Register clients and update contact and profile details",
      "Record that a client attended a visit",
      "Select the acting health worker so actions are attributed correctly",
    ],
    cannotDo: [
      "Delete clients",
      "Manage transfers, team members, facilities or SMS templates",
    ],
    routes: ["/dashboard", "/clients", "/audit-log", "/profile"],
  },
};

export function summariseRole(role: AppRole): string {
  const c = ROLE_CAPABILITIES[role];
  return [
    `${c.label} — ${c.scope}`,
    `Can view: ${c.canView.join("; ")}.`,
    `Can do: ${c.canDo.join("; ")}.`,
    `Cannot: ${c.cannotDo.join("; ")}.`,
    `Pages: ${c.routes.join(", ")}.`,
  ].join("\n");
}

export function formatAllRolesForPrompt(): string {
  return (Object.keys(ROLE_CAPABILITIES) as AppRole[]).map(summariseRole).join("\n\n");
}
