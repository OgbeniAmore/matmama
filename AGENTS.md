# Architecture rules
- Define the active-worker context in a non-component module so provider and consumers share a stable identity during hot updates; never mask a missing provider with no-op audit actions.
- Keep mobile presentation changes separate from clinical and permission logic so responsive layouts preserve existing workflows.
- Render cross-facility search results as cards below the medium breakpoint and a table above it so phones retain all identifiers and transfer actions without horizontal scrolling.- Restrict client clinical actions (vitals, visit completion, vaccine administration) to facility accounts in both RLS and UI; oversight roles stay read-only so state/LGA dashboards never mutate client care.
