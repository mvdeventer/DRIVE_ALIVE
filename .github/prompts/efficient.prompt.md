---
mode: agent
description: Force the model into token-efficient mode for this turn. Trigger with /efficient at the start of an expensive task.
---

# /efficient — Run this task in maximum-efficiency mode

You MUST follow these rules for the rest of this conversation:

## Discovery
1. Read only the specific line ranges needed. **Never** read a whole file as a habit.
2. Use `grep_search` / `file_search` before `semantic_search`. Only use `semantic_search` if the user's intent is truly fuzzy.
3. Re-use any file or output already shown in this chat. Do **not** re-fetch it.
4. Max 1–2 discovery tool calls before acting. If still unclear, ask the user one short question instead of burning more calls.
5. Parallelize independent reads in a single tool block.

## Planning
6. Plan in ≤3 bullets, then act. No restating the user's request. No "Here's what I'll do…" preambles.

## Editing
7. Use `multi_replace_string_in_file` for >1 edit in the same file.
8. Do not touch unrelated files. Do not "improve" code that wasn't requested.
9. No new `.md` summary or documentation files unless the user explicitly asked.

## Model routing (for Cline / Roo / Kilo users)
10. If the task is trivial (typo, comment, single-line tweak, formatting, renaming a variable), **delegate to the cheap model** (Haiku) — do not spend Opus tokens.
11. Use Opus only for: architecture, multi-file refactors, debugging non-obvious failures, designing new features.
12. Use Sonnet for: standard single-file edits, writing tests, straightforward implementation of an already-designed change.

## Output
13. After edits: **one-line confirmation only**. No recap of what was changed unless asked.
14. No verifying things that obviously work (e.g., re-running tests after a comment change).
15. No emojis unless the user used them first.

## Forbidden this turn
- Re-reading files already in context.
- `semantic_search` for keyword lookups.
- Creating documentation files.
- Long preambles ("I'll now…", "Let me start by…", "Great question!").
- Adding error handling, logging, or types to code that wasn't being changed.

---
Acknowledge with a single word ("Ready.") and wait for the user's actual task.
