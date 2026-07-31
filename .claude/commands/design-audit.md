---
description: Audit the frontend for responsive and design-token problems, and produce a ranked worklist
---

Audit the DRIVE_ALIVE frontend for layout and design-system problems.

Scope: $ARGUMENTS (if empty, audit all of `frontend/screens/` and `frontend/components/`).

Run these two agents **in parallel** in a single message:

1. `responsive-auditor` — layouts that don't adapt to viewport width.
2. `design-system-keeper` — token drift (raw hex, magic numbers, hand-written
   shadows, browser-only APIs in shared paths). Point it at the working tree,
   not a diff, when auditing broadly.

Then merge their output into **one** ranked worklist:

- Group by screen, not by agent.
- Order screens by severity × count. Frozen-layout bugs
  (`Dimensions.get` / viewport value inside `StyleSheet.create`) always rank
  above cosmetic drift — they are correctness bugs, not style issues.
- For each screen give a one-line summary and an estimated size (S/M/L) based on
  its line count and finding count.
- Finish with a suggested parallel split: which screens can be handed to
  separate `ui-refactorer` runs without touching the same files.

Do not fix anything. This command produces a plan.
