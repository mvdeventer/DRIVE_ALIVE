# Development Guide

This guide is the practical companion to the shared agent contract in [AGENTS.md](AGENTS.md).

## Quality Gates

Run these before merging or releasing changes:

```powershell
npm --prefix frontend run i18n:check-completeness
npm --prefix frontend run i18n:detect-hardcoded
python scripts/check_error_code_mapping.py
```

### What They Check

- `i18n:check-completeness` ensures `en` remains the source of truth and that `af`, `zu`, and `xh` contain the same key set.
- `i18n:detect-hardcoded` flags user-facing literals in the frontend and supports a staged allowlist for legacy surfaces.
- `check_error_code_mapping.py` ensures backend user-facing error codes have a frontend translation mapping.

## Security Baseline

Current baseline protections include:

- HTTP-only auth cookies for web clients
- SameSite cookie policy
- Strict transport security in HTTPS environments
- Frame blocking and content-type sniffing protection
- Rate limiting on auth and reset flows
- Strong password policy on password change and reset flows

## Recommended Workflow

1. Make the code change.
2. Run the three quality gates.
3. Review security-sensitive docs if you touch auth, release, or public-facing copy.
4. Update the relevant help file or README section so the workflow stays discoverable.

## Regeneration Notes

This report is intended to be regenerated when code changes are made.

Recommended regeneration path:
1. Update the source markdown.
2. Run the report generation script.
3. Open the `.docx` and verify the flow map and file list.

The generator script is [scripts/generate_session_code_change_report.py](scripts/generate_session_code_change_report.py).

## References

