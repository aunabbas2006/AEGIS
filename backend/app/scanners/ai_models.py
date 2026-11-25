"""AI models about to be retired (§6.7).

There is no universal API for model shutdowns, so AEGIS keeps a curated calendar
(data/model_retirements.json) and greps the codebase for the model IDs it lists.
"""

import json
import re
from datetime import date
from functools import cache
from pathlib import Path

from app.models import FindingType, Severity
from app.scanners.base import RawFinding, ScanContext

KB_PATH = Path(__file__).resolve().parent.parent / "data" / "model_retirements.json"
CODE_SUFFIXES = (".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yml", ".yaml", ".toml", ".env", ".example", ".go", ".rb")


@cache
def load_calendar() -> list[dict]:
    return json.loads(KB_PATH.read_text(encoding="utf-8"))["models"]


def _model_pattern(model_id: str) -> re.Pattern:
    # Match the exact ID, not a longer ID that merely starts with it.
    return re.compile(rf"(?<![\w.\-]){re.escape(model_id)}(?![\w.\-])")


class AiModelScanner:
    name = "ai_models"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        calendar = [(entry, _model_pattern(entry["model_id"])) for entry in load_calendar()]
        findings: dict[str, RawFinding] = {}

        for path in ctx.iter_files(CODE_SUFFIXES):
            for line_no, line in enumerate(ctx.read(path).splitlines(), start=1):
                for entry, pattern in calendar:
                    if entry["model_id"] not in findings and pattern.search(line):
                        findings[entry["model_id"]] = self._finding(entry, f"{ctx.rel(path)}:{line_no}")
        return list(findings.values())

    @staticmethod
    def _finding(entry: dict, location: str) -> RawFinding:
        shutdown = date.fromisoformat(entry["shutdown_date"])
        days = (shutdown - date.today()).days
        retired = days <= 0
        return RawFinding(
            type=FindingType.MODEL_RETIREMENT,
            key=entry["model_id"],
            severity=Severity.HIGH if retired or days <= 30 else Severity.MEDIUM,
            title=f"{entry['model_id']} {'was retired' if retired else 'retires'} on {entry['shutdown_date']}",
            description=(
                f"{entry['provider']} {'has shut down' if retired else 'will shut down'} this model; "
                f"API calls using it {'already fail' if retired else 'will start failing'}. "
                f"Suggested replacement: {entry['replacement']}."
            ),
            location=location,
            package=entry["model_id"],
            fixed_version=entry["replacement"],
            due_date=shutdown,
            details={"provider": entry["provider"], "suggested_replacement": entry["replacement"]},
        )
