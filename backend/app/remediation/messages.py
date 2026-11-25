"""Human-readable renderings of a finding: the suggested fix and the GitHub issue text."""

from dataclasses import dataclass

from app.models import Finding, FindingType, Reachability, Repository
from app.scoring import days_remaining

_REACHABILITY_NOTE = {
    Reachability.REACHABLE: "**Reachable** — the package is imported *and* used by first-party code.",
    Reachability.IMPORTED_NOT_CALLED: "**Imported, not called** — imported, but the imported name is never used.",
    Reachability.DECLARED_ONLY: "**Declared only** — listed in the manifest but never imported.",
}


@dataclass(frozen=True)
class Solution:
    summary: str
    steps: list[str]
    command: str | None = None


def suggest_solution(finding: Finding) -> Solution:
    """A concrete, actionable fix for the dashboard's "suggested solution" panel."""
    summary = recommended_fix(finding)
    match finding.type:
        case FindingType.CVE if finding.fixed_version:
            command = (
                f"npm install {finding.package}@{finding.fixed_version}"
                if finding.details.get("ecosystem") == "npm"
                else f'pip install "{finding.package}>={finding.fixed_version}"'
            )
            return Solution(summary, [
                f"Bump {finding.package} to {finding.fixed_version} in {finding.location}.",
                "Regenerate the lockfile and run the test suite.",
                "Rescan: AEGIS auto-resolves the finding once the vulnerable version is gone.",
            ], command)
        case FindingType.SECRET:
            return Solution(summary, [
                "Revoke the credential in the provider's console immediately.",
                "Issue a new credential and load it from a secret manager or environment variable.",
                "Purge the value from every commit, force-push, and have collaborators re-clone.",
            ], "git filter-repo --replace-text expressions.txt")
        case FindingType.EOL:
            return Solution(summary, [
                f"Pick a supported {finding.package} release cycle.",
                f"Update {finding.location} and any CI images that pin the old version.",
                "Run the full test suite on the new runtime before deploying.",
            ])
        case FindingType.MODEL_RETIREMENT:
            return Solution(summary, [
                f"Replace {finding.package} with {finding.fixed_version} at {finding.location}.",
                "Re-run prompt evaluations: output style and token usage can change.",
                "Move model IDs into configuration so the next migration is a one-line change.",
            ])
        case FindingType.LICENSE:
            return Solution(summary, [
                "Check whether the package ships to customers or is only used internally.",
                "Find a permissively licensed alternative (MIT, Apache-2.0, BSD).",
                "If it must stay, record legal sign-off in the repository.",
            ])
        case FindingType.CERT_EXPIRY:
            return Solution(summary, [
                "Renew the certificate with your CA or ACME client.",
                "Enable automatic renewal (e.g. a certbot timer or managed certificates).",
            ])
        case _:
            return Solution(summary, ["Review the finding and resolve it in the repository."])


def recommended_fix(finding: Finding) -> str:
    match finding.type:
        case FindingType.CVE if finding.fixed_version:
            return f"Upgrade `{finding.package}` from `{finding.installed_version}` to `{finding.fixed_version}` or later."
        case FindingType.CVE:
            return f"No fixed release yet — consider removing or replacing `{finding.package}`."
        case FindingType.SECRET:
            return "Revoke and rotate the credential now, then purge it from history (git filter-repo / BFG)."
        case FindingType.EOL:
            return f"Upgrade off {finding.package} {finding.installed_version} to a supported release cycle."
        case FindingType.MODEL_RETIREMENT:
            return f"Replace `{finding.package}` with `{finding.fixed_version}` and re-run your evals."
        case FindingType.LICENSE:
            return f"Replace `{finding.package}` or obtain legal sign-off for its license."
        case FindingType.CERT_EXPIRY:
            return f"Renew the TLS certificate for `{finding.package}` (or enable auto-renewal)."
        case _:
            return "Review and resolve."


def render_issue(finding: Finding, repo: Repository | None) -> tuple[str, str]:
    """Return (title, markdown body) for a GitHub issue."""
    days = days_remaining(finding.due_date)
    lines = [
        f"**Severity:** {finding.severity.value}  ",
        f"**Type:** {finding.type.value}  ",
    ]
    if finding.location:
        lines.append(f"**Location:** `{finding.location}`  ")
    if days is not None:
        lines.append(f"**Deadline:** {finding.due_date} ({'overdue' if days <= 0 else f'{days} days left'})  ")
    lines += ["", finding.description]
    if finding.reachability:
        lines += ["", "### Why this matters", _REACHABILITY_NOTE[finding.reachability]]
    lines += ["", "### Recommended fix", recommended_fix(finding), "", "---", "_Filed automatically by AEGIS._"]
    return f"[AEGIS] {finding.title}", "\n".join(lines)

