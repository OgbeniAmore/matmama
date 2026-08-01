export interface FieldChange {
  field: string;
  before: string;
  after: string;
}

const IGNORED = new Set(["updated_at", "created_at"]);

const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

/** Compare old_data / new_data JSON blobs and return the fields that changed. */
export const diffAuditRow = (
  oldData: unknown,
  newData: unknown,
): FieldChange[] => {
  const before = (oldData ?? {}) as Record<string, unknown>;
  const after = (newData ?? {}) as Record<string, unknown>;
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  ).filter((k) => !IGNORED.has(k));

  const changes: FieldChange[] = [];
  for (const k of keys.sort()) {
    const b = fmt(before[k]);
    const a = fmt(after[k]);
    if (b === a) continue;
    changes.push({ field: k, before: b, after: a });
  }
  return changes;
};

export const summarizeChanges = (changes: FieldChange[]): string =>
  changes.map((c) => `${c.field}: ${c.before} → ${c.after}`).join("; ");

export const labelField = (field: string) =>
  field.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
