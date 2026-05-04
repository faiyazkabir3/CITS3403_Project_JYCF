"""Run the project's sanity checks in one command.

Default order:
1. Python unit tests
2. Selenium browser tests
3. JavaScript sanity checks
4. Playwright browser smoke tests

Examples:
    python sanity_check.py
    python sanity_check.py --quick
    python sanity_check.py --keep-going
    python sanity_check.py --skip-selenium
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parent


@dataclass(frozen=True)
class Check:
    name: str
    command: list[str]
    env: dict[str, str] | None = None


def log(message: str = "") -> None:
    print(message, flush=True)


def find_npm() -> str:
    npm_name = "npm.cmd" if os.name == "nt" else "npm"
    npm_path = shutil.which(npm_name) or shutil.which("npm")

    if npm_path is None:
        log("ERROR: npm was not found on PATH.")
        log("Install Node.js LTS, then open a new terminal and try again.")
        raise SystemExit(127)

    return npm_path


def build_checks(args: argparse.Namespace) -> list[Check]:
    npm = find_npm()
    playwright_env = {"PYTHON": sys.executable}

    checks = [
        Check(
            name="Python unit tests",
            command=[sys.executable, "-m", "pytest", "tests/unit"],
        ),
        Check(
            name="Selenium browser tests",
            command=[sys.executable, "-m", "pytest", "tests/selenium"],
        ),
        Check(
            name="JavaScript sanity",
            command=[npm, "run", "sanity:js"],
        ),
        Check(
            name="Playwright browser smoke tests",
            command=[npm, "run", "sanity:browser"],
            env=playwright_env,
        ),
    ]

    if args.quick:
        checks = [
            check
            for check in checks
            if check.name in {"Python unit tests", "JavaScript sanity"}
        ]

    skip_names = set()
    if args.skip_unit:
        skip_names.add("Python unit tests")
    if args.skip_selenium:
        skip_names.add("Selenium browser tests")
    if args.skip_js:
        skip_names.add("JavaScript sanity")
    if args.skip_playwright:
        skip_names.add("Playwright browser smoke tests")

    return [check for check in checks if check.name not in skip_names]


def format_command(command: list[str]) -> str:
    return " ".join(command)


def run_check(check: Check) -> int:
    log()
    log("=" * 72)
    log(f"Running: {check.name}")
    log(f"Command: {format_command(check.command)}")
    if check.env:
        for key, value in check.env.items():
            log(f"Env: {key}={value}")
    log("=" * 72)

    env = os.environ.copy()
    if check.env:
        env.update(check.env)

    started_at = time.monotonic()
    result = subprocess.run(check.command, cwd=ROOT, env=env, check=False)
    elapsed = time.monotonic() - started_at

    if result.returncode == 0:
        log(f"PASS: {check.name} ({elapsed:.1f}s)")
    else:
        log(f"FAIL: {check.name} exited with code {result.returncode} ({elapsed:.1f}s)")

    return result.returncode


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Route Zero sanity checks one after another.",
    )
    parser.add_argument(
        "--quick",
        action="store_true",
        help="Run only the faster checks: Python unit tests and JavaScript sanity.",
    )
    parser.add_argument(
        "--keep-going",
        action="store_true",
        help="Continue running later checks even if an earlier check fails.",
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="Print the checks that would run, without running them.",
    )
    parser.add_argument(
        "--skip-unit",
        action="store_true",
        help="Skip Python unit tests.",
    )
    parser.add_argument(
        "--skip-selenium",
        action="store_true",
        help="Skip Selenium browser tests.",
    )
    parser.add_argument(
        "--skip-js",
        action="store_true",
        help="Skip JavaScript sanity checks.",
    )
    parser.add_argument(
        "--skip-playwright",
        action="store_true",
        help="Skip Playwright browser smoke tests.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    checks = build_checks(args)

    if not checks:
        log("No checks selected.")
        return 0

    if args.list:
        log("Selected sanity checks:")
        for index, check in enumerate(checks, start=1):
            log(f"{index}. {check.name}: {format_command(check.command)}")
        return 0

    log(f"Using Python: {sys.executable}")
    log(f"Project root: {ROOT}")

    failures: list[tuple[str, int]] = []
    for check in checks:
        returncode = run_check(check)
        if returncode != 0:
            failures.append((check.name, returncode))
            if not args.keep_going:
                break

    log()
    log("=" * 72)
    if not failures:
        log("All selected sanity checks passed.")
        return 0

    log("Sanity checks failed:")
    for name, returncode in failures:
        log(f"- {name}: exit code {returncode}")
    log()
    log("Fix the first failing check, then run this script again.")
    return failures[0][1]


if __name__ == "__main__":
    raise SystemExit(main())
