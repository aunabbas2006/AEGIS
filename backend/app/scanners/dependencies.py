"""Known vulnerabilities in dependencies (SCA, §6.1) + reachability tagging (§6.2).

Manifests are parsed into (name, version, ecosystem) triples, which are checked in a
single batch call against the free OSV.dev database (aggregates GitHub Advisories,
PyPA, npm and more). Each vulnerable package is then tagged with its reachability.
"""

import json
import re
from concurrent.futures import ThreadPoolExecutor

import httpx

from app.config import settings
from app.models import FindingType, Severity
from app.scanners.base import Dependency, RawFinding, ScanContext
from app.scanners.reachability import ImportIndex

OSV_BATCH_URL = "https://api.osv.dev/v1/querybatch"
OSV_VULN_URL = "https://api.osv.dev/v1/vulns/{id}"

_OSV_SEVERITY = {
    "CRITICAL": Severity.CRITICAL,
    "HIGH": Severity.HIGH,
    "MODERATE": Severity.MEDIUM,
    "MEDIUM": Severity.MEDIUM,
    "LOW": Severity.LOW,
}
_SEVERITY_RANK = {s: rank for rank, s in enumerate(reversed(list(Severity)))}
_REQUIREMENT_PIN = re.compile(r"^\s*([A-Za-z0-9_.\-]+)(?:\[[^\]]*\])?\s*==\s*([^\s;#]+)")


def parse_dependencies(ctx: ScanContext) -> list[Dependency]:
    deps: list[Dependency] = []
    for path in ctx.iter_files(("package.json",)):
        deps.extend(_parse_package_json(ctx, path))
    for path in ctx.iter_files(("requirements.txt",)):
        for line in ctx.read(path).splitlines():
            if match := _REQUIREMENT_PIN.match(line):
                deps.append(Dependency(match[1], match[2], "PyPI", ctx.rel(path)))
    return deps


def _parse_package_json(ctx: ScanContext, path) -> list[Dependency]:
    try:
        manifest = json.loads(ctx.read(path))
    except json.JSONDecodeError:
        return []
    declared = {**manifest.get("dependencies", {}), **manifest.get("devDependencies", {})}

    # Prefer exact versions from the lockfile; fall back to the range's floor.
    locked: dict[str, str] = {}
    lockfile = path.with_name("package-lock.json")
    if lockfile.exists():
        try:
            packages = json.loads(ctx.read(lockfile)).get("packages", {})
            locked = {k.removeprefix("node_modules/"): v.get("version", "") for k, v in packages.items()}
        except json.JSONDecodeError:
            pass

    deps = []
    for name, spec in declared.items():
        version = locked.get(name) or re.sub(r"^[\^~>=<\s]+", "", str(spec))
        if re.match(r"^\d", version):
            deps.append(Dependency(name, version, "npm", ctx.rel(path)))
    return deps


class DependencyScanner:
    name = "dependencies"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        ctx.dependencies = parse_dependencies(ctx)
        if not ctx.dependencies:
            return []

        index = ImportIndex.build(ctx)
        with httpx.Client(timeout=settings.http_timeout_seconds) as client, ThreadPoolExecutor(8) as pool:
            vuln_ids = self._query_batch(client, ctx.dependencies)
            unique_ids = sorted({vid for ids in vuln_ids for vid in ids})
            fetched = pool.map(lambda vid: client.get(OSV_VULN_URL.format(id=vid)).raise_for_status().json(), unique_ids)
            details = dict(zip(unique_ids, fetched))

        return [
            self._to_finding(dep, [details[vid] for vid in ids], index)
            for dep, ids in zip(ctx.dependencies, vuln_ids)
            if ids
        ]

    @staticmethod
    def _query_batch(client: httpx.Client, deps: list[Dependency]) -> list[list[str]]:
        queries = [{"package": {"name": d.name, "ecosystem": d.ecosystem}, "version": d.version} for d in deps]
        response = client.post(OSV_BATCH_URL, json={"queries": queries})
        response.raise_for_status()
        return [[v["id"] for v in r.get("vulns", [])] for r in response.json()["results"]]

    @staticmethod
    def _to_finding(dep: Dependency, vulns: list[dict], index: ImportIndex) -> RawFinding:
        """One finding per vulnerable package: "upgrade X to Y" fixes every advisory at once."""
        advisories: dict[str, dict] = {}  # CVE id (or OSV id) -> advisory; merges GHSA/PYSEC duplicates
        for vuln in vulns:
            cves = [a for a in vuln.get("aliases", []) if a.startswith("CVE-")]
            label = cves[0] if cves else vuln["id"]
            severity = _OSV_SEVERITY.get(
                str(vuln.get("database_specific", {}).get("severity", "")).upper(), Severity.MEDIUM
            )
            known = advisories.get(label)
            if known is None or _SEVERITY_RANK[severity] > _SEVERITY_RANK[known["severity"]]:
                advisories[label] = {
                    "id": label,
                    "severity": severity,
                    "summary": vuln.get("summary") or vuln.get("details", "")[:200],
                    "fixed": _fixed_version(vuln, dep),
                    "url": f"https://osv.dev/vulnerability/{vuln['id']}",
                }

        ranked = sorted(advisories.values(), key=lambda a: _SEVERITY_RANK[a["severity"]], reverse=True)
        fixes = [a["fixed"] for a in ranked if a["fixed"]]
        top = ranked[0]
        count = len(ranked)
        return RawFinding(
            type=FindingType.CVE,
            key=f"{dep.ecosystem}:{dep.name}:{dep.version}",
            severity=top["severity"],
            title=f"{dep.name}@{dep.version}: {count} known vulnerabilit{'y' if count == 1 else 'ies'} ({top['id']})",
            description=top["summary"],
            location=dep.manifest,
            package=dep.name,
            installed_version=dep.version,
            fixed_version=max(fixes, key=_version_key) if fixes else None,
            reachability=index.classify(dep),
            details={
                "ecosystem": dep.ecosystem,
                "imported_in": index.files_importing(dep),
                "advisories": [{**a, "severity": a["severity"].value} for a in ranked],
            },
        )


def _version_key(version: str) -> tuple[int, ...]:
    return tuple(int(part) for part in re.findall(r"\d+", version))


def _fixed_version(vuln: dict, dep: Dependency) -> str | None:
    for affected in vuln.get("affected", []):
        if affected.get("package", {}).get("name", "").lower() != dep.name.lower():
            continue
        for rng in affected.get("ranges", []):
            for event in rng.get("events", []):
                if "fixed" in event:
                    return event["fixed"]
    return None
