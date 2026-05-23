"""
rename_app.py — One-shot brand rename / migration tool.

Replaces every hard-coded "Drive Alive" / "RoadReady" / "DRIVE_ALIVE" /
"drivealive" / "roadready" variant across the entire repository with a
single set of brand values you choose.

Re-runnable: the *current* brand is tracked in `.app_brand.json` at the
repo root, so subsequent runs migrate from your last chosen name to the
next one (not from the original "Drive Alive").

Usage:
    python scripts/rename_app.py                # interactive prompts
    python scripts/rename_app.py --non-interactive \\
        --name "My School" --slug myschool \\
        --bundle com.myschool.app --domain myschool.co.za
    python scripts/rename_app.py --show         # print current brand and exit
    python scripts/rename_app.py --dry-run      # show what would change

Also writes / updates `APP_NAME`, `APP_DOMAIN`, `FROM_EMAIL`,
`UNSUBSCRIBE_EMAIL`, `FRONTEND_URL` in `backend/.env` so the running
backend can serve the brand to the frontend at runtime.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parent.parent
BRAND_FILE = ROOT / ".app_brand.json"
BACKEND_ENV = ROOT / "backend" / ".env"

# Folders never touched.
EXCLUDE_DIRS = {
    ".git", "node_modules", "venv", ".venv", "env", "vendor",
    "dist", "build", "__pycache__", ".expo", ".next", ".cache",
    "backups", ".brand-backup", "logs", "image",
}

# File extensions/names that are safe to text-edit.
TEXT_EXTS = {
    ".py", ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".txt",
    ".yml", ".yaml", ".toml", ".cfg", ".ini", ".env", ".example",
    ".html", ".css", ".sh", ".ps1", ".bat", ".cmd", ".spec",
    ".code-workspace", ".gitignore",
}

# Files we never touch even if they'd otherwise match (binary or risky).
EXCLUDE_FILES = {
    "package-lock.json",  # auto-regenerated, risky to mangle
    "rename_app.py",      # this script
    ".app_brand.json",    # brand state file
}

# Default "current" brand if no .app_brand.json exists yet. Reflects the
# state of this repo as originally checked in.
DEFAULT_CURRENT = {
    "name": "Drive Alive",
    "name_compact": "DriveAlive",
    "name_snake": "drive_alive",
    "name_kebab": "drive-alive",
    "name_upper": "DRIVE_ALIVE",
    "slug": "roadready",
    "bundle_id": "com.roadready.app",
    "domain": "roadready.co.za",
    "email_from": "noreply@roadready.co.za",
    "email_unsubscribe": "unsubscribe@roadready.co.za",
    # Extra aliases present in the original codebase, grouped by what
    # they should map to in the *new* brand.
    "name_aliases": ["RoadReady", "Road Ready"],
    "compact_aliases": ["drivealive"],
    "domain_aliases": ["drivealive.co.za"],
}


@dataclass
class Brand:
    name: str            # e.g. "My Driving School"
    name_compact: str    # e.g. "MyDrivingSchool"
    name_snake: str      # e.g. "my_driving_school"
    name_kebab: str      # e.g. "my-driving-school"
    name_upper: str      # e.g. "MY_DRIVING_SCHOOL"
    slug: str            # e.g. "mydrivingschool"
    bundle_id: str       # e.g. "com.mydrivingschool.app"
    domain: str          # e.g. "mydrivingschool.co.za"
    email_from: str
    email_unsubscribe: str

    @classmethod
    def derive(cls, name: str, slug: str | None = None,
               bundle_id: str | None = None, domain: str | None = None,
               email_from: str | None = None,
               email_unsubscribe: str | None = None) -> "Brand":
        clean = re.sub(r"[^A-Za-z0-9 ]+", " ", name).strip()
        parts = [p for p in clean.split() if p]
        compact = "".join(p.capitalize() for p in parts) or "App"
        snake = "_".join(p.lower() for p in parts) or "app"
        kebab = "-".join(p.lower() for p in parts) or "app"
        upper = snake.upper()
        slug = slug or (snake.replace("_", "") or "app")
        bundle_id = bundle_id or f"com.{slug}.app"
        domain = domain or f"{slug}.local"
        email_from = email_from or f"noreply@{domain}"
        email_unsubscribe = email_unsubscribe or f"unsubscribe@{domain}"
        return cls(
            name=name, name_compact=compact, name_snake=snake,
            name_kebab=kebab, name_upper=upper, slug=slug,
            bundle_id=bundle_id, domain=domain,
            email_from=email_from, email_unsubscribe=email_unsubscribe,
        )


def load_current() -> dict:
    if BRAND_FILE.exists():
        return json.loads(BRAND_FILE.read_text(encoding="utf-8"))
    return dict(DEFAULT_CURRENT)


def save_current(brand: Brand) -> None:
    data = asdict(brand)
    # After a rename, no stale aliases remain in the working tree.
    data["name_aliases"] = []
    data["compact_aliases"] = []
    data["domain_aliases"] = []
    BRAND_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")


def build_replacements(current: dict, new: Brand) -> list[tuple[str, str]]:
    """Return (old, new) pairs ordered longest-first to avoid partial overlaps."""
    pairs: list[tuple[str, str]] = []

    def add(old: str, repl: str) -> None:
        if old and old != repl:
            pairs.append((old, repl))

    # Domain/email first (longest, most specific).
    add(current.get("email_unsubscribe", ""), new.email_unsubscribe)
    add(current.get("email_from", ""), new.email_from)
    add(current.get("domain", ""), new.domain)
    add(current.get("bundle_id", ""), new.bundle_id)

    # Brand name variants.
    add(current.get("name_upper", ""), new.name_upper)
    add(current.get("name", ""), new.name)
    add(current.get("name_compact", ""), new.name_compact)
    add(current.get("name_kebab", ""), new.name_kebab)
    add(current.get("name_snake", ""), new.name_snake)
    add(current.get("slug", ""), new.slug)

    # Extra aliases (legacy spellings still present in source).
    for alias in current.get("name_aliases", []) or []:
        add(alias, new.name)
    for alias in current.get("compact_aliases", []) or []:
        add(alias, new.name_compact.lower())
    for alias in current.get("domain_aliases", []) or []:
        add(alias, new.domain)

    # Stable order: longest old-string first; ties broken alphabetically.
    pairs.sort(key=lambda kv: (-len(kv[0]), kv[0]))
    # De-dupe while preserving order.
    seen: set[str] = set()
    unique: list[tuple[str, str]] = []
    for old, repl in pairs:
        if old in seen:
            continue
        seen.add(old)
        unique.append((old, repl))
    return unique


def iter_files() -> Iterable[Path]:
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.name in EXCLUDE_FILES:
            continue
        # Skip anything under an excluded directory.
        if any(part in EXCLUDE_DIRS for part in path.relative_to(ROOT).parts):
            continue
        if path.suffix.lower() not in TEXT_EXTS and path.name not in (
            ".env", ".env.example", "Makefile", "Dockerfile",
        ):
            continue
        yield path


def apply_replacements(text: str, pairs: list[tuple[str, str]]) -> tuple[str, int]:
    """Apply all (old,new) replacements; return new_text and total hits."""
    total = 0
    for old, new in pairs:
        if old in text:
            total += text.count(old)
            text = text.replace(old, new)
    return text, total


def update_env(brand: Brand) -> None:
    """Write APP_NAME and friends into backend/.env (creating it if needed)."""
    lines: list[str] = []
    if BACKEND_ENV.exists():
        lines = BACKEND_ENV.read_text(encoding="utf-8").splitlines()
    keys = {
        "APP_NAME": brand.name,
        "APP_DOMAIN": brand.domain,
        "APP_SLUG": brand.slug,
        "APP_BUNDLE_ID": brand.bundle_id,
        "FROM_EMAIL": brand.email_from,
        "UNSUBSCRIBE_EMAIL": brand.email_unsubscribe,
    }
    out: list[str] = []
    seen: set[str] = set()
    for line in lines:
        m = re.match(r"^\s*([A-Z_][A-Z0-9_]*)\s*=", line)
        if m and m.group(1) in keys:
            key = m.group(1)
            out.append(f"{key}={keys[key]}")
            seen.add(key)
        else:
            out.append(line)
    for key, value in keys.items():
        if key not in seen:
            out.append(f"{key}={value}")
    BACKEND_ENV.parent.mkdir(parents=True, exist_ok=True)
    BACKEND_ENV.write_text("\n".join(out) + "\n", encoding="utf-8")


def prompt(label: str, default: str) -> str:
    raw = input(f"  {label} [{default}]: ").strip()
    return raw or default


def interactive_brand(current: dict) -> Brand:
    print("\n=== App Brand Setup ===")
    print(f"  Current name: {current.get('name', '(none)')}")
    print("  Press Enter to keep the suggested value.\n")
    name = prompt("App name", current.get("name", "Driving School"))
    derived = Brand.derive(name)
    slug = prompt("URL slug / package name", derived.slug)
    bundle = prompt("Mobile bundle id", f"com.{slug}.app")
    domain = prompt("Primary domain", f"{slug}.co.za")
    email_from = prompt("From email", f"noreply@{domain}")
    email_unsub = prompt("Unsubscribe email", f"unsubscribe@{domain}")
    return Brand.derive(
        name, slug=slug, bundle_id=bundle, domain=domain,
        email_from=email_from, email_unsubscribe=email_unsub,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Rename the application brand.")
    parser.add_argument("--show", action="store_true",
                        help="Print current brand and exit.")
    parser.add_argument("--dry-run", action="store_true",
                        help="Report changes without writing files.")
    parser.add_argument("--non-interactive", action="store_true")
    parser.add_argument("--name")
    parser.add_argument("--slug")
    parser.add_argument("--bundle")
    parser.add_argument("--domain")
    parser.add_argument("--email-from")
    parser.add_argument("--email-unsubscribe")
    args = parser.parse_args()

    current = load_current()

    if args.show:
        print(json.dumps(current, indent=2))
        return 0

    if args.non_interactive:
        if not args.name:
            print("ERROR: --name is required with --non-interactive", file=sys.stderr)
            return 2
        new = Brand.derive(
            args.name, slug=args.slug, bundle_id=args.bundle,
            domain=args.domain, email_from=args.email_from,
            email_unsubscribe=args.email_unsubscribe,
        )
    else:
        new = interactive_brand(current)

    pairs = build_replacements(current, new)
    if not pairs:
        print("Nothing to do — new brand equals current brand.")
        return 0

    print("\nReplacements to apply (longest first):")
    for old, repl in pairs:
        print(f"  {old!r}  ->  {repl!r}")
    if not args.dry_run and not args.non_interactive:
        if input("\nProceed? [y/N]: ").strip().lower() not in {"y", "yes"}:
            print("Aborted.")
            return 1

    changed: list[tuple[Path, int]] = []
    for path in iter_files():
        try:
            text = path.read_text(encoding="utf-8")
        except (UnicodeDecodeError, OSError):
            continue
        new_text, hits = apply_replacements(text, pairs)
        if hits and new_text != text:
            changed.append((path, hits))
            if not args.dry_run:
                path.write_text(new_text, encoding="utf-8")

    total_hits = sum(h for _, h in changed)
    print(f"\n{'Would change' if args.dry_run else 'Changed'} "
          f"{len(changed)} files ({total_hits} replacements).")
    for path, hits in changed[:50]:
        print(f"  {path.relative_to(ROOT)}  ({hits})")
    if len(changed) > 50:
        print(f"  ... and {len(changed) - 50} more")

    if not args.dry_run:
        save_current(new)
        update_env(new)
        print(f"\nBrand state saved to {BRAND_FILE.relative_to(ROOT)}")
        print(f"Backend env updated:   {BACKEND_ENV.relative_to(ROOT)}")
        print("\nNext steps:")
        print("  1. Review changes:   git diff")
        print("  2. Restart backend & frontend so APP_NAME is picked up.")
        print("  3. If you renamed the bundle id, rebuild mobile apps.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
