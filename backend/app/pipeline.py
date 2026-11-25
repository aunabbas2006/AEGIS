"""Scan orchestration: checkout → run every scanner → normalise → upsert → auto-resolve.

Each scanner is isolated: one failing (e.g. a data feed is offline) is recorded in the
scan report and the remaining scanners still run. Progress (`current_step` plus the
per-scanner report) is committed after every step so the UI can show it live.
"""

import logging
import time

from sqlmodel import Session, select

from app.database import engine
from app.models import Finding, FindingStatus, FindingType, Repository, Scan, ScanStatus, utcnow
from app.scanners import SCANNERS, RawFinding, ScanContext
from app.scanners.activity import last_commit_at
from app.workspace import checkout

log = logging.getLogger("aegis.pipeline")

# Every stage a scan walks through, in order. The UI renders this as a progress bar.
CHECKOUT_STEP, RANKING_STEP = "checkout", "ranking"
SCAN_STEPS: tuple[str, ...] = (CHECKOUT_STEP, *(s.name for s in SCANNERS), RANKING_STEP)


def run_scan(scan_id: int) -> None:
    """Entry point for the background worker."""
    with Session(engine) as session:
        scan = session.get(Scan, scan_id)
        repo = session.get(Repository, scan.repo_id)
        scan.status, scan.started_at = ScanStatus.RUNNING, utcnow()
        session.commit()

        try:
            _set_step(session, scan, CHECKOUT_STEP)
            ctx = ScanContext(root=checkout(repo.source))
            raw_findings = _run_scanners(session, ctx, scan)
            _set_step(session, scan, RANKING_STEP)
            _persist(session, repo, scan, raw_findings)
            repo.last_commit_at = last_commit_at(ctx)
            repo.last_scanned_at = scan.finished_at = utcnow()
            scan.status, scan.current_step = ScanStatus.COMPLETED, None
        except Exception as exc:  # the scan must always reach a terminal state
            log.exception("scan %s failed", scan_id)
            scan.status, scan.error, scan.finished_at = ScanStatus.FAILED, str(exc), utcnow()
        session.commit()


def _set_step(session: Session, scan: Scan, step: str) -> None:
    scan.current_step = step
    session.commit()


def _run_scanners(session: Session, ctx: ScanContext, scan: Scan) -> list[RawFinding]:
    findings: list[RawFinding] = []
    report: dict[str, dict] = {}
    for scanner in SCANNERS:
        _set_step(session, scan, scanner.name)
        started = time.perf_counter()
        try:
            produced = scanner.scan(ctx)
            findings.extend(produced)
            report[scanner.name] = {"findings": len(produced), "error": None}
        except Exception as exc:
            log.warning("scanner %s failed: %s", scanner.name, exc)
            report[scanner.name] = {"findings": 0, "error": f"{type(exc).__name__}: {exc}"}
        report[scanner.name]["seconds"] = round(time.perf_counter() - started, 2)
        scan.scanner_report = dict(report)  # reassign so the JSON column is marked dirty
        session.commit()
    return findings


def _persist(session: Session, repo: Repository, scan: Scan, raw_findings: list[RawFinding]) -> None:
    existing = {
        f.fingerprint: f
        for f in session.exec(
            select(Finding).where(Finding.repo_id == repo.id, Finding.type != FindingType.CUSTOM_DEADLINE)
        )
    }
    failed_types = {name for name, r in scan.scanner_report.items() if r["error"]}
    if "dependencies" in failed_types:
        failed_types.add("licenses")  # licenses has no input without parsed dependencies
    seen: set[str] = set()

    for raw in raw_findings:
        fingerprint = raw.fingerprint(repo.id)
        seen.add(fingerprint)
        finding = existing.get(fingerprint) or Finding(repo_id=repo.id, fingerprint=fingerprint, type=raw.type)
        for attr in ("severity", "title", "description", "location", "package", "installed_version",
                     "fixed_version", "reachability", "due_date", "details"):
            setattr(finding, attr, getattr(raw, attr))
        finding.scan_id, finding.status, finding.resolved_at = scan.id, FindingStatus.OPEN, None
        session.add(finding)

    # Anything not seen this time has been fixed — close the loop automatically.
    # Skip types whose scanner errored, so an outage never masquerades as a fix.
    for fingerprint, finding in existing.items():
        if fingerprint not in seen and finding.status == FindingStatus.OPEN and not _scanner_failed(finding, failed_types):
            finding.status, finding.resolved_at = FindingStatus.RESOLVED, utcnow()


_SCANNER_FOR_TYPE = {
    FindingType.CVE: "dependencies",
    FindingType.LICENSE: "licenses",
    FindingType.SECRET: "secrets",
    FindingType.EOL: "eol",
    FindingType.MODEL_RETIREMENT: "ai_models",
    FindingType.CERT_EXPIRY: "certificates",
    FindingType.INACTIVE_REPO: "activity",
}


def _scanner_failed(finding: Finding, failed: set[str]) -> bool:
    return _SCANNER_FOR_TYPE.get(finding.type) in failed
