from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlmodel import Session, func, select

from app.database import get_session
from app.models import Finding, FindingStatus, RemediationAction, Repository, Scan
from app.pipeline import run_scan
from app.schemas import RepositoryCreate, RepositoryOut, ScanOut
from app.workspace import InvalidSource, parse_source

router = APIRouter(prefix="/repositories", tags=["repositories"])


def _to_out(session: Session, repo: Repository) -> RepositoryOut:
    latest = session.exec(select(Scan).where(Scan.repo_id == repo.id).order_by(Scan.id.desc())).first()
    open_count = session.exec(
        select(func.count()).select_from(Finding).where(Finding.repo_id == repo.id, Finding.status == FindingStatus.OPEN)
    ).one()
    return RepositoryOut(
        **repo.model_dump(),
        latest_scan=ScanOut.build(latest) if latest else None,
        open_findings=open_count,
    )


def _queue_scan(session: Session, repo: Repository, background: BackgroundTasks) -> Scan:
    scan = Scan(repo_id=repo.id)
    session.add(scan)
    session.commit()
    session.refresh(scan)
    background.add_task(run_scan, scan.id)
    return scan


@router.get("", response_model=list[RepositoryOut])
def list_repositories(session: Session = Depends(get_session)):
    return [_to_out(session, r) for r in session.exec(select(Repository).order_by(Repository.id))]


@router.post("", response_model=RepositoryOut, status_code=status.HTTP_201_CREATED)
def connect_repository(body: RepositoryCreate, background: BackgroundTasks, session: Session = Depends(get_session)):
    """Connect a repository (idempotent) and immediately queue its first scan."""
    source = body.source.strip().removesuffix("/")
    try:
        info = parse_source(source)
    except InvalidSource as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    repo = session.exec(select(Repository).where(Repository.source == source)).first()
    if repo is None:
        repo = Repository(source=source, name=info.name, owner=info.owner, is_public=info.is_public)
        session.add(repo)
        session.commit()
        session.refresh(repo)
    _queue_scan(session, repo, background)
    return _to_out(session, repo)


@router.post("/{repo_id}/scans", response_model=ScanOut, status_code=status.HTTP_202_ACCEPTED)
def rescan(repo_id: int, background: BackgroundTasks, session: Session = Depends(get_session)):
    repo = session.get(Repository, repo_id) or _not_found()
    return ScanOut.build(_queue_scan(session, repo, background))


@router.get("/scans/{scan_id}", response_model=ScanOut)
def get_scan(scan_id: int, session: Session = Depends(get_session)):
    scan = session.get(Scan, scan_id) or _not_found()
    return ScanOut.build(scan)


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
def disconnect_repository(repo_id: int, session: Session = Depends(get_session)):
    repo = session.get(Repository, repo_id) or _not_found()
    finding_ids = select(Finding.id).where(Finding.repo_id == repo_id)
    for action in session.exec(select(RemediationAction).where(RemediationAction.finding_id.in_(finding_ids))):
        session.delete(action)
    for model in (Finding, Scan):
        for row in session.exec(select(model).where(model.repo_id == repo_id)):
            session.delete(row)
    session.delete(repo)
    session.commit()


def _not_found():
    raise HTTPException(status.HTTP_404_NOT_FOUND, "Not found")
