/**
 * ANC maternal risk triage. Thresholds follow WHO ANC 2016 / FMOH Nigeria
 * guidance. Decision support only — clinical judgement prevails.
 */
export type UrineLevel = "negative" | "trace" | "1+" | "2+" | "3+" | "4+";
export type RiskLevel = "normal" | "moderate" | "high" | "critical";

export interface AncVitalsInput {
  gestational_weeks?: number | null;
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  fundal_height_cm?: number | null;
  fetal_heart_rate_bpm?: number | null;
  urine_protein?: UrineLevel | null;
  urine_glucose?: UrineLevel | null;
  weight_kg?: number | null;
  hemoglobin_g_dl?: number | null;
}

export interface RiskFlag {
  code: string;
  label: string;
  level: Exclude<RiskLevel, "normal">;
  action: string;
}

const URINE_RANK: Record<UrineLevel, number> = { negative: 0, trace: 0.5, "1+": 1, "2+": 2, "3+": 3, "4+": 4 };
const rank = (u?: UrineLevel | null) => (u ? URINE_RANK[u] : 0);
const ORDER: RiskLevel[] = ["normal", "moderate", "high", "critical"];

export function triageAncVitals(v: AncVitalsInput): { level: RiskLevel; flags: RiskFlag[] } {
  const flags: RiskFlag[] = [];
  const sys = v.systolic_bp ?? 0;
  const dia = v.diastolic_bp ?? 0;
  const hasBp = v.systolic_bp != null && v.diastolic_bp != null;
  const protein = rank(v.urine_protein);
  const ga = v.gestational_weeks ?? null;

  if (hasBp) {
    const severe = sys >= 160 || dia >= 110;
    const raised = sys >= 140 || dia >= 90;
    if (severe && protein >= 1) {
      flags.push({ code: "severe_preeclampsia", label: "Severe pre-eclampsia", level: "critical",
        action: "Emergency: give MgSO₄ loading dose and antihypertensive per protocol, refer to CEmONC facility immediately." });
    } else if (severe) {
      flags.push({ code: "severe_hypertension", label: "Severe hypertension (≥160/110)", level: "critical",
        action: "Emergency: recheck in 15 min, start antihypertensive per protocol and refer urgently." });
    } else if (raised && protein >= 1 && (ga == null || ga >= 20)) {
      flags.push({ code: "preeclampsia", label: "Pre-eclampsia (BP ≥140/90 + proteinuria)", level: "high",
        action: "Refer same day to a doctor/CEmONC facility for assessment." });
    } else if (raised) {
      flags.push({ code: "gestational_hypertension", label: "Raised BP (≥140/90)", level: "moderate",
        action: "Repeat BP after 15 min rest; recheck within 1 week and test urine protein." });
    }
  }

  const hb = v.hemoglobin_g_dl;
  if (hb != null) {
    if (hb < 7) flags.push({ code: "severe_anemia", label: `Severe anaemia (Hb ${hb} g/dL)`, level: "critical",
      action: "Refer urgently for transfusion assessment." });
    else if (hb < 10) flags.push({ code: "moderate_anemia", label: `Moderate anaemia (Hb ${hb} g/dL)`, level: "high",
      action: "Start therapeutic iron (120 mg) + folic acid, deworm if indicated, recheck Hb in 4 weeks." });
    else if (hb < 11) flags.push({ code: "mild_anemia", label: `Mild anaemia (Hb ${hb} g/dL)`, level: "moderate",
      action: "Daily iron + folic acid; counsel on diet; recheck at next contact." });
  }

  const fhr = v.fetal_heart_rate_bpm;
  if (fhr != null) {
    if (fhr < 110) flags.push({ code: "fetal_bradycardia", label: `Fetal bradycardia (${fhr} bpm)`, level: "critical",
      action: "Reposition mother, recheck; if persistent refer immediately." });
    else if (fhr > 160) flags.push({ code: "fetal_tachycardia", label: `Fetal tachycardia (${fhr} bpm)`, level: "high",
      action: "Check maternal fever/dehydration, recheck in 20 min; refer if persistent." });
  }

  const gl = rank(v.urine_glucose);
  if (gl >= 2) flags.push({ code: "glycosuria", label: `Glycosuria (${v.urine_glucose})`, level: "moderate",
    action: "Screen for gestational diabetes (fasting/random blood glucose or OGTT)." });

  if (v.fundal_height_cm != null && ga != null && ga >= 20 && ga <= 40) {
    const diff = v.fundal_height_cm - ga;
    if (Math.abs(diff) > 3) flags.push({
      code: diff < 0 ? "fundal_small" : "fundal_large",
      label: diff < 0 ? `Fundal height small for dates (${v.fundal_height_cm} cm at ${ga} wks)` : `Fundal height large for dates (${v.fundal_height_cm} cm at ${ga} wks)`,
      level: "moderate",
      action: diff < 0 ? "Suspect growth restriction or wrong dates — refer for ultrasound." : "Suspect multiple pregnancy, polyhydramnios or macrosomia — refer for ultrasound.",
    });
  }

  if (v.weight_kg != null && v.weight_kg < 45) flags.push({ code: "low_weight", label: `Low maternal weight (${v.weight_kg} kg)`, level: "moderate",
    action: "Nutrition counselling and supplementation; monitor weight gain." });

  const level = flags.reduce<RiskLevel>((acc, f) => (ORDER.indexOf(f.level) > ORDER.indexOf(acc) ? f.level : acc), "normal");
  return { level, flags };
}

export const RISK_STYLES: Record<RiskLevel, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900" },
  moderate: { label: "Moderate risk", className: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900" },
  high: { label: "High risk", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900" },
  critical: { label: "Critical — refer now", className: "bg-destructive text-destructive-foreground border-destructive" },
};
