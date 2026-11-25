from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.config import settings
from app.database import get_session
from app.models import (
    Finding,
    FindingStatus,
    FindingType,
    Reachability,
    RemediationAction,
    Repository,
)
from app.remediation import RemediationUnavailable, create_issue, render_issue
from app.schemas import DeadlineCreate, FindingOut, Integrations, RemediationPreview, Stats

router = APIRouter(tags=["findings"])


def _open_findings(session: Session, repo_id: int | None = None) -> list[FindingOut]:
    query = select(Finding, Repository).join(Repository, isouter=True).where(Finding.status == FindingStatus.OPEN)
    if repo_id is not None:
        query = query.where(Finding.repo_id == repo_id)
    rows = [FindingOut.build(f, r) for f, r in session.exec(query)]
    return sorted(rows, key=lambda f: f.priority_score, reverse=True)


@router.get("/findings", response_model=list[FindingOut])
def list_findings(repo_id: int | None = None, type: FindingType | None = None, session: Session = Depends(get_session)):
    """The ranked risk queue: every open finding, highest priority first."""
    findings = _open_findings(session, repo_id)
    return [f for f in findings if type is None or f.type == type]


@router.get("/stats", response_model=Stats)
def stats(session: Session = Depends(get_session)):
    findings = _open_findings(session)
    cves = [f for f in findings if f.type == FindingType.CVE]
    actionable = [f for f in cves if f.reachability == Reachability.REACHABLE]
    dated = [f.days_remaining for f in findings if f.days_remaining is not None]
    return Stats(
        open_findings=len(findings),
        by_severity=Counter(f.severity.value for f in findings),
        by_type=Counter(f.type.value for f in findings),
        vulnerable_dependencies=len(cves),
        actionable_dependencies=len(actionable),
        noise_reduction_percent=round(100 * (1 - len(actionable) / len(cves)), 1) if cves else 0.0,
        overdue=sum(1 for d in dated if d <= 0),
        due_within_30_days=sum(1 for d in dated if 0 < d <= 30),
        repositories=len(session.exec(select(Repository)).all()),
    )


@router.post("/deadlines", response_model=FindingOut, status_code=status.HTTP_201_CREATED)
def create_deadline(body: DeadlineCreate, session: Session = Depends(get_session)):
    """Custom deadlines flow through the exact same scoring and remediation pipeline."""
    repo = session.get(Repository, body.repo_id) if body.repo_id else None
    finding = Finding(
        repo_id=repo.id if repo else None,
        type=FindingType.CUSTOM_DEADLINE,
        severity=body.severity,
        title=body.title,
        description=body.description,
        due_date=body.due_date,
        fingerprint=f"custom:{body.title}:{body.due_date}",
    )
    session.add(finding)
    session.commit()
    session.refresh(finding)
    return FindingOut.build(finding, repo)


@router.post("/findings/{finding_id}/resolve", response_model=FindingOut)
def resolve_finding(finding_id: int, session: Session = Depends(get_session)):
    finding, repo = _load(session, finding_id)
    finding.status = FindingStatus.RESOLVED
    session.commit()
    session.refresh(finding)
    return FindingOut.build(finding, repo)


@router.get("/findings/{finding_id}/remediation", response_model=RemediationPreview)
def preview_remediation(finding_id: int, session: Session = Depends(get_session)):
    finding, repo = _load(session, finding_id)
    title, body = render_issue(finding, repo)
    return RemediationPreview(issue_title=title, issue_body=body)


@router.get("/integrations", response_model=Integrations)
def integrations():
    """Whether GitHub issue creation is configured, so the UI can say so up front."""
    return Integrations(github=bool(settings.github_token))


@router.post("/findings/{finding_id}/remediation", status_code=status.HTTP_201_CREATED)
def remediate(finding_id: int, session: Session = Depends(get_session)):
    """File the finding as a GitHub issue in its repository."""
    finding, repo = _load(session, finding_id)
    try:
        url = create_issue(finding, repo)
    except RemediationUnavailable as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc

    session.add(RemediationAction(finding_id=finding.id, kind="github_issue", external_url=url))
    session.commit()
    return {"url": url}


def _load(session: Session, finding_id: int) -> tuple[Finding, Repository | None]:
    finding = session.get(Finding, finding_id)
    if finding is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Finding not found")
    return finding, session.get(Repository, finding.repo_id) if finding.repo_id else None
