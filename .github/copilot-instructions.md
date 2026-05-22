# DRIVE_ALIVE — Copilot Instructions (READ FIRST EVERY TURN)

> Auto-loaded into every chat. Keep this file SHORT — every token here is sent on every request.

## Token / Credit Efficiency Rules (HIGHEST PRIORITY)

1. **Default to Haiku-class reasoning.** Use Sonnet/Opus only when the user explicitly requests edits, multi-file refactors, or complex agent work.
2. **Do NOT search broadly.** Skip `semantic_search` unless the user's request clearly needs it. Prefer `grep_search` / `file_search` with a tight pattern, or `read_file` if path is known.
3. **Do NOT read whole files.** Read only the line ranges needed. Never `read_file` 1→9999 as a habit.
4. **Re-use context.** If a file is already in context (active editor, prior tool result), do NOT re-read it.
5. **No exploratory chains.** Maximum 1–2 discovery tool calls before acting. If still unclear, ask the user one short question instead of burning calls.
6. **Parallelize independent reads** in a single tool block (saves round-trips).
7. **No documentation files** unless explicitly requested. No summaries of changes after edits — a one-line confirmation only.
8. **Skip `codacy_cli_analyze` for trivial edits** (typo fixes, comment changes, single-line tweaks). Only run it after meaningful code changes to `.py`, `.ts`, `.tsx`.

## Project Map (use this instead of re-discovering)

- **Backend**: `backend/app/` — FastAPI. Entry: [backend/app/main.py](backend/app/main.py). Routes in `backend/app/routes/`, models in `backend/app/models/`, services in `backend/app/services/`.
- **Frontend**: `frontend/` — React Native (Expo) + TypeScript + NativeWind. Screens in `frontend/screens/`, components in `frontend/components/`, navigation in `frontend/navigation/`, API client in `frontend/services/api.ts`.
- **Python venv**: `backend/venv/Scripts/python.exe` (Windows).
- **DB**: SQLite at `frontend/drive_alive.db` and `backend/` (dev). Migrations in `backend/migrations/`.
- **Tasks**: VS Code tasks already defined (`Start Backend Server`, `Start Expo Dev Server`, `Run Backend Tests`). Use `run_task` instead of crafting terminal commands.

## Conventions

- Backend: SQLAlchemy models, Pydantic schemas, route files grouped by domain. Black/isort formatted.
- Frontend: Functional components, hooks, theme via `useTheme()` from `frontend/theme/ThemeContext`. API calls via `ApiService` from `frontend/services/api`.
- Auth tokens via Bearer JWT. Multi-role users (admin/instructor/student/school-owner).
- Never commit secrets — `KEYS.txt`, `.env`, `*.pem` are gitignored.

## When acting in Agent Mode

- Confirm understanding in ≤1 sentence, then act. Do not restate the plan.
- Use `multi_replace_string_in_file` for >1 edit in the same file.
- After edits: one-line confirmation. No "Here's what I did" recap unless asked.
- Do not modify unrelated files, do not "improve" code that wasn't requested.

## Forbidden (wastes credits)

- Re-reading files already shown in the current chat.
- Running `semantic_search` for keyword lookups (use `grep_search`).
- Creating `.md` summary files after tasks.
- Long preambles ("I'll now…", "Let me start by…").
- Verifying things that obviously work (e.g., re-running tests after a comment change).
