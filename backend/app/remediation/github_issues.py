"""Files a GitHub issue for a finding via the REST API."""

import httpx

from app.config import settings
from app.models import Finding, Repository
from app.remediation.errors import RemediationUnavailable
from app.remediation.messages import render_issue


def create_issue(finding: Finding, repo: Repository | None) -> str:
    """Create the issue and return its URL."""
    if not settings.github_token:
        raise RemediationUnavailable("Set GITHUB_TOKEN to enable GitHub issue creation.")
    if repo is None or not repo.owner or repo.source == "demo":
        raise RemediationUnavailable("Issues can only be filed for GitHub repositories.")

    title, body = render_issue(finding, repo)
    response = httpx.post(
        f"https://api.github.com/repos/{repo.owner}/{repo.name}/issues",
        headers={
            "Authorization": f"Bearer {settings.github_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        },
        json={"title": title, "body": body, "labels": ["security", "aegis"]},
        timeout=settings.http_timeout_seconds,
    )
    response.raise_for_status()
    return response.json()["html_url"]
