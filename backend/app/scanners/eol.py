"""Runtimes losing security support (§6.4).

Detects runtime versions from common repo files, then looks up the release cycle on
endoflife.date (free JSON API) to compute how many days of security support remain.
"""

import json
import re
from dataclasses import dataclass
from datetime import date

import httpx

from app.config import settings
from app.models import FindingType, Severity
from app.scanners.base import RawFinding, ScanContext

EOL_API = "https://endoflife.date/api/{product}.json"
REPORT_WITHIN_DAYS = 365

_DOCKER_FROM = re.compile(r"^\s*FROM\s+(?:[\w.\-/]+/)?(python|node|golang|ruby|php)[:@]v?(\d+(?:\.\d+)?)", re.I | re.M)
_DOCKER_PRODUCTS = {"python": "python", "node": "nodejs", "golang": "go", "ruby": "ruby", "php": "php"}


@dataclass(frozen=True)
class RuntimeUsage:
    product: str  # endoflife.date product slug
    cycle: str
    source: str


def detect_runtimes(ctx: ScanContext) -> list[RuntimeUsage]:
    found: dict[tuple[str, str], RuntimeUsage] = {}

    def add(product: str, version: str, source: str) -> None:
        cycle = _cycle(product, version)
        if cycle:
            found.setdefault((product, cycle), RuntimeUsage(product, cycle, source))

    for path in ctx.iter_files((".python-version", "runtime.txt", ".nvmrc", "Dockerfile", "package.json")):
        text, rel = ctx.read(path), ctx.rel(path)
        if path.name == ".python-version":
            add("python", text.strip(), rel)
        elif path.name == "runtime.txt":
            add("python", text.strip().removeprefix("python-"), rel)
        elif path.name == ".nvmrc":
            add("nodejs", text.strip().lstrip("v"), rel)
        elif path.name == "Dockerfile":
            for image, version in _DOCKER_FROM.findall(text):
                add(_DOCKER_PRODUCTS[image.lower()], version, rel)
        elif path.name == "package.json":
            try:
                engine = json.loads(text).get("engines", {}).get("node")
            except json.JSONDecodeError:
                engine = None
            if engine:
                add("nodejs", re.sub(r"^[\^~>=<\s]+", "", engine), rel)
    return list(found.values())


def _cycle(product: str, version: str) -> str | None:
    """endoflife.date cycles are `major` for Node, `major.minor` for most others."""
    parts = re.findall(r"\d+", version)
    if not parts:
        return None
    if product == "nodejs" or len(parts) == 1:
        return parts[0]
    return f"{parts[0]}.{parts[1]}"


class EolScanner:
    name = "eol"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        runtimes = detect_runtimes(ctx)
        findings = []
        with httpx.Client(timeout=settings.http_timeout_seconds) as client:
            for runtime in runtimes:
                response = client.get(EOL_API.format(product=runtime.product))
                if response.status_code != 200:
                    continue
                cycle = next((c for c in response.json() if str(c.get("cycle")) == runtime.cycle), None)
                if cycle and (finding := self._finding(runtime, cycle)):
                    findings.append(finding)
        return findings

    @staticmethod
    def _finding(runtime: RuntimeUsage, cycle: dict) -> RawFinding | None:
        eol = cycle.get("eol")
        if not isinstance(eol, str):
            return None  # `false` = no EOL announced yet
        eol_date = date.fromisoformat(eol)
        days = (eol_date - date.today()).days
        if days > REPORT_WITHIN_DAYS:
            return None

        severity = Severity.HIGH if days <= 0 else Severity.MEDIUM if days <= 180 else Severity.LOW
        state = f"reached end-of-life on {eol}" if days <= 0 else f"reaches end-of-life on {eol}"
        latest = cycle.get("latest")
        return RawFinding(
            type=FindingType.EOL,
            key=f"{runtime.product}:{runtime.cycle}",
            severity=severity,
            title=f"{runtime.product} {runtime.cycle} {state}",
            description="After end-of-life, newly discovered vulnerabilities in the runtime are never patched.",
            location=runtime.source,
            package=runtime.product,
            installed_version=runtime.cycle,
            due_date=eol_date,
            details={"latest_patch": latest, "source": "endoflife.date"},
        )
