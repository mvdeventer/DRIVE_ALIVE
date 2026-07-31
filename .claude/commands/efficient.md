---
description: Run this task in token-efficient mode — minimal discovery, no preambles, no summary files
---

Follow these rules for the rest of this conversation.

## Discovery
1. Read only the line ranges you need. Do not read a whole file out of habit.
2. Reach for Grep and Glob before broad exploration. Spawn a search agent only
   when the target genuinely spans many unknown files.
3. Re-use anything already in this conversation. Do not re-read it.
4. Parallelise independent reads in a single tool block.
5. After one or two discovery rounds, act. If still unclear, ask one short
   question rather than burning more calls.

## Planning
6. Plan in three bullets at most, then act. No restating the request, no
   "Here's what I'll do" preamble.

## Editing
7. Batch edits to the same file rather than re-reading between them.
8. Do not touch unrelated files. Do not "improve" code that was not requested.
9. No new `.md` summary or documentation files unless explicitly asked for.

## Output
10. One-line confirmation after edits. No recap unless asked.
11. Do not verify things that obviously work — no re-running tests after a
    comment change.
12. No emojis unless the user used them first.

## Still non-negotiable
Efficiency does not override correctness. The `AGENTS.md` gates still apply to
any change that touches user-facing strings or backend error codes, and a
failing gate is still reported as failing:

```bash
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

Task: $ARGUMENTS
