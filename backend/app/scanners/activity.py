"""Inactive / abandoned repositories (§6.10), read straight from git metadata."""

import subprocess
from datetime import datetime, timezone

from app.config import settings
from app.models import FindingType, Severity
from app.scanners.base import RawFinding, ScanContext


def last_commit_at(ctx: ScanContext) -> datetime | None:
    try:
        out = subprocess.run(
            ["git", "-C", str(ctx.root), "log", "-1", "--format=%cI"],
            capture_output=True, text=True, timeout=30, check=True,
        ).stdout.strip()
    except (subprocess.SubprocessError, FileNotFoundError):
        return None
    return datetime.fromisoformat(out) if out else None


class ActivityScanner:
    name = "activity"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        last = last_commit_at(ctx)
        if last is None:
            return []
        idle = (datetime.now(timezone.utc) - last).days
        if idle < settings.inactive_after_days:
            return []
        return [
            RawFinding(
                type=FindingType.INACTIVE_REPO,
                key="inactive",
                severity=Severity.LOW,
                title=f"No commits for {idle} days",
                description="Unmaintained repositories stop receiving dependency and security updates.",
                details={"last_commit": last.isoformat(), "days_idle": idle},
            )
        ]
