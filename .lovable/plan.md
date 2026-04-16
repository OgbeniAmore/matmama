
## Goal
Replace the manual EDD entry with an LMP (Last Menstrual Period) date input on the ANC client form. Auto-calculate EDD using Naegele's rule (LMP + 280 days) and display the resulting EDD plus the WHO 8-contact ANC schedule preview before submission.

## Changes

### 1. `src/components/ClientForm.tsx`
- Replace the EDD date picker with an **LMP date picker** (limited to past dates within ~10 months).
- Add a new `lmp` field to the zod schema; keep `edd` as a derived (auto-computed) value passed through on submit.
- Watch the LMP field — when set, compute EDD = LMP + 280 days and:
  - Display a read-only summary card showing: LMP, calculated EDD, current gestational age (weeks), and "8 ANC visits will be scheduled (WHO recommendation)".
  - Auto-derive the trimester from gestational age (1st: <13w, 2nd: 13–26w, 3rd: 27w+) so the trimester dropdown is no longer required (remove or auto-fill).
- Update the ANC validation refinement to require `lmp` instead of `trimester` + `edd`.
- On submit, inject the computed `edd` so downstream code (`saveClient`, ANC schedule generation) keeps working unchanged.

### 2. `src/utils/ancUtils.ts`
- Add helper `calculateEddFromLmp(lmp: Date): Date` (LMP + 280 days).
- Add helper `calculateGestationalAge(lmp: Date): number` returning weeks.
- Add helper `calculateTrimester(weeks: number): 1 | 2 | 3`.
- `generateAncSchedule` already takes EDD — no change needed there; the WHO 8-contact schedule (already defined in `src/types/anc.ts`) continues to be generated automatically on client creation.

### 3. `src/types/index.ts` (Client interface) & `src/queries/clients.ts`
- Add optional `lmp?: Date` to the `Client` type for persistence/display.
- Update `saveClient` to also store `lmp` (will require a small schema migration adding an `lmp` date column to the `clients` table).
- Continue saving `edd` (computed) and `trimester` (computed) so existing views (`AncScheduleView`, dashboards) keep working without changes.

### 4. Database migration
- Add nullable `lmp date` column to `public.clients`.

### 5. `src/components/ViewClientSheet.tsx` (light update)
- For ANC clients, display LMP, EDD (computed), gestational age, and "ANC visits: 8 (WHO standard)" alongside existing fields.

## User-Visible Result
When adding an Ante Natal Care client, the user enters only the **LMP date**. The form instantly shows the calculated EDD, current gestational week, and confirms that 8 WHO-recommended ANC visits will be scheduled. The existing ANC schedule view continues to render the 8 contacts with progress tracking.

<lov-actions>
<lov-suggestion message="Approve and implement the LMP-based ANC flow as described.">Approve plan</lov-suggestion>
<lov-suggestion message="Also show the next upcoming ANC visit date directly on the ANC client card on the Clients page.">Show next ANC visit on card</lov-suggestion>
<lov-suggestion message="Allow editing the auto-calculated EDD in case the clinician wants to override it based on ultrasound dating.">Allow EDD override</lov-suggestion>
</lov-actions>
