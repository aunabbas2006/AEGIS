"""Request/response shapes for the REST API."""

from datetime import date, datetime

from pydantic import BaseModel, Field

from app.models import Finding, FindingStatus, FindingType, Reachability, Repository, Scan, ScanStatus, Severity
from app.pipeline import SCAN_STEPS
from app.remediation import suggest_solution
from app.scoring import days_remaining, priority_score


class RepositoryCreate(BaseModel):
    source: str = Field(description="Public GitHub URL, or 'demo' for the bundled sample repository.")


class RepositoryOut(BaseModel):
    id: int
    name: str
    source: str
    owner: str | None
    is_public: bool
    last_commit_at: datetime | None
    last_scanned_at: datetime | None
    latest_scan: "ScanOut | None" = None
    open_findings: int = 0


class ScanOut(BaseModel):
    id: int
    repo_id: int
    status: ScanStatus
    current_step: str | None
    steps: list[str]
    started_at: datetime | None
    finished_at: datetime | None
    error: str | None
    scanner_report: dict

    @classmethod
    def build(cls, scan: Scan) -> "ScanOut":
        return cls(**scan.model_dump(), steps=list(SCAN_STEPS))


class SolutionOut(BaseModel):
    summary: str
    steps: list[str]
    command: str | None


class FindingOut(BaseModel):
    id: int
    repo_id: int | None
    repo_name: str | None
    type: FindingType
    severity: Severity
    title: str
    description: str
    location: str | None
    package: str | None
    installed_version: str | None
    fixed_version: str | None
    reachability: Reachability | None
    due_date: date | None
    days_remaining: int | None
    priority_score: float
    status: FindingStatus
    details: dict
    solution: SolutionOut
    first_seen_at: datetime

    @classmethod
    def build(cls, finding: Finding, repo: Repository | None) -> "FindingOut":
        days = days_remaining(finding.due_date)
        return cls(
            **finding.model_dump(exclude={"fingerprint", "scan_id", "resolved_at"}),
            repo_name=repo.name if repo else None,
            days_remaining=days,
            priority_score=priority_score(finding.severity, days, finding.reachability, bool(repo and repo.is_public)),
            solution=SolutionOut(**vars(suggest_solution(finding))),
        )


class DeadlineCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    due_date: date
    severity: Severity = Severity.MEDIUM
    description: str = ""
    repo_id: int | None = None


class RemediationPreview(BaseModel):
    issue_title: str
    issue_body: str


class Integrations(BaseModel):
    github: bool


class Stats(BaseModel):
    open_findings: int
    by_severity: dict[str, int]
    by_type: dict[str, int]
    vulnerable_dependencies: int
    actionable_dependencies: int
    noise_reduction_percent: float
    overdue: int
    due_within_30_days: int
    repositories: int
