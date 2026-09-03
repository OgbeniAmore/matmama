import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPageContext } from "./chatbotContext";
import { buildSyncReport, UNDOCUMENTED_ROUTES } from "./knowledgeSync";
import { KB_CHANGELOG, KB_VERSION } from "./knowledgeChangelog";
import { ROLE_CAPABILITIES } from "./roleCapabilities";

function appRoutes(): string[] {
  const src = readFileSync("src/App.tsx", "utf8");
  return [...src.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]);
}

function dbTables(): string[] {
  const src = readFileSync("src/integrations/supabase/types.ts", "utf8");
  const publicBlock = src.slice(src.indexOf("Tables: {"));
  return [...publicBlock.matchAll(/^ {6}(\w+): \{$/gm)].map((m) => m[1]);
}

function knowledgeText(): string {
  return (
    readFileSync("src/components/chatbot/chatbotContext.ts", "utf8") +
    readFileSync("supabase/functions/chat-assistant/index.ts", "utf8")
  );
}

describe("Thelma knowledge base sync", () => {
  it("documents every user-facing route and every database table", () => {
    const report = buildSyncReport(
      appRoutes(),
      dbTables(),
      (path) => getPageContext(path).name !== "Unknown page"
    );
    expect(report, JSON.stringify(report, null, 2)).toMatchObject({ inSync: true });
  });

  it("mentions every app route in the assistant knowledge text", () => {
    const text = knowledgeText();
    const missing = appRoutes()
      .filter((r) => r.startsWith("/") && !r.includes(":") && !UNDOCUMENTED_ROUTES.includes(r))
      .filter((r) => !text.includes(r));
    expect(missing).toEqual([]);
  });

  it("keeps a changelog whose newest entry matches KB_VERSION", () => {
    expect(KB_CHANGELOG.length).toBeGreaterThan(0);
    expect(KB_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
    expect(KB_CHANGELOG[0].date).toBe(KB_VERSION.replace(/\./g, "-"));
  });

  it("covers every app_role with a capability summary", () => {
    const types = readFileSync("src/integrations/supabase/types.ts", "utf8");
    const match = types.match(/app_role:\s*([^\n]+)/);
    const roles = (match?.[1] ?? "")
      .match(/"([a-z_]+)"/g)
      ?.map((s) => s.replace(/"/g, "")) ?? [];
    expect(roles.length).toBeGreaterThan(0);
    for (const role of roles) {
      expect(Object.keys(ROLE_CAPABILITIES)).toContain(role);
    }
  });
});
