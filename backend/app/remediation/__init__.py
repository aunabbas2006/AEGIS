"""Remediation: a suggested fix for every finding, and filing it as a GitHub issue (§8)."""

from app.remediation.errors import RemediationUnavailable
from app.remediation.github_issues import create_issue
from app.remediation.messages import Solution, render_issue, suggest_solution

__all__ = [
    "RemediationUnavailable",
    "Solution",
    "create_issue",
    "render_issue",
    "suggest_solution",
]
