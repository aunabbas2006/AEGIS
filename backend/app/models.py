"""Persistent data model. Mirrors §9 of the design plan."""

from datetime import date, datetime, timezone
from enum import StrEnum

from sqlalchemy import JSON, Column
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Severity(StrEnum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class Reachability(StrEnum):
    REACHABLE = "reachable"
    IMPORTED_NOT_CALLED = "imported_not_called"
    DECLARED_ONLY = "declared_only"


class FindingType(StrEnum):
    CVE = "cve"
    SECRET = "secret"
    EOL = "eol"
    LICENSE = "license"
    MODEL_RETIREMENT = "model_retirement"
    CERT_EXPIRY = "cert_expiry"
    INACTIVE_REPO = "inactive_repo"
    CUSTOM_DEADLINE = "custom_deadline"


class ScanStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class FindingStatus(StrEnum):
    OPEN = "open"
    RESOLVED = "resolved"


class Repository(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    source: str = Field(index=True, unique=True)
    owner: str | None = None
    is_public: bool = False
    last_commit_at: datetime | None = None
    last_scanned_at: datetime | None = None
    created_at: datetime = Field(default_factory=utcnow)


class Scan(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    repo_id: int = Field(foreign_key="repository.id", index=True)
    status: ScanStatus = ScanStatus.QUEUED
    current_step: str | None = None  # live progress while running
    started_at: datetime | None = None
    finished_at: datetime | None = None
    error: str | None = None
    # Per-scanner telemetry: {"secrets": {"findings": 3, "seconds": 0.4, "error": null}, ...}
    scanner_report: dict = Field(default_factory=dict, sa_column=Column(JSON))


class Finding(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    repo_id: int | None = Field(default=None, foreign_key="repository.id", index=True)
    scan_id: int | None = Field(default=None, foreign_key="scan.id")
    type: FindingType = Field(index=True)
    severity: Severity
    title: str
    description: str = ""
    location: str | None = None
    package: str | None = None
    installed_version: str | None = None
    fixed_version: str | None = None
    reachability: Reachability | None = None
    due_date: date | None = None
    # Stable identity across rescans, so a finding is updated instead of duplicated.
    fingerprint: str = Field(index=True)
    status: FindingStatus = Field(default=FindingStatus.OPEN, index=True)
    details: dict = Field(default_factory=dict, sa_column=Column(JSON))
    first_seen_at: datetime = Field(default_factory=utcnow)
    resolved_at: datetime | None = None


class RemediationAction(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    finding_id: int = Field(foreign_key="finding.id", index=True)
    kind: str  # currently always "github_issue"
    external_url: str | None = None
    status: str = "sent"
    created_at: datetime = Field(default_factory=utcnow)
