/**
 * Knowledge-base sync contract.
 *
 * These lists declare what Thelma's knowledge base is known to cover.
 * `knowledgeSync.test.ts` compares them against the app's real routes
 * (src/App.tsx) and database tables (src/integrations/supabase/types.ts)
 * and fails when something ships without a knowledge-base update.
 *
 * When the check fails: document the new route/table in chatbotContext.ts and
 * supabase/functions/chat-assistant/index.ts, add a changelog entry, bump
 * KB_VERSION, then add it here.
 */

/** Routes intentionally not described to users (redirects, auth, 404). */
export const UNDOCUMENTED_ROUTES = [
  "/",
  "*",
  "/auth",
  "/reset-password",
  "/patients",
];

/** Database tables covered by the knowledge base. */
export const KNOWN_TABLES = [
  "accounts",
  "anc_visits",
  "audit_logs",
  "clients",
  "epi_schedule",
  "facilities",
  "facility_roster",
  "immunization_records",
  "invitations",
  "notification_preferences",
  "notifications",
  "patient_reminders",
  "phcs",
  "profiles",
  "sms_templates",
  "transfer_requests",
  "user_roles",
] as const;

export type KnowledgeSyncReport = {
  inSync: boolean;
  undocumentedRoutes: string[];
  undocumentedTables: string[];
  staleTables: string[];
};

export function buildSyncReport(
  appRoutes: string[],
  dbTables: string[],
  isRouteDocumented: (path: string) => boolean
): KnowledgeSyncReport {
  const undocumentedRoutes = appRoutes
    .filter((r) => !UNDOCUMENTED_ROUTES.includes(r))
    .filter((r) => !isRouteDocumented(r.replace(/:[^/]+/g, "sample-id")));

  const known = new Set<string>(KNOWN_TABLES);
  const undocumentedTables = dbTables.filter((t) => !known.has(t));
  const staleTables = [...known].filter((t) => !dbTables.includes(t));

  return {
    inSync:
      undocumentedRoutes.length === 0 &&
      undocumentedTables.length === 0 &&
      staleTables.length === 0,
    undocumentedRoutes,
    undocumentedTables,
    staleTables,
  };
}
