"""Exposed secrets (§6.3).

Scans the current files *and the full git history* — a key deleted in a later commit
is still leaked to anyone who can clone the repo. Rules follow the Gitleaks approach:
provider-specific regexes, plus a generic assignment rule gated by Shannon entropy.

The secret value itself is never stored: only a SHA-256 fingerprint and a redacted preview.
"""

import hashlib
import math
import re
import subprocess
from dataclasses import dataclass

from app.models import FindingType, Severity
from app.scanners.base import RawFinding, ScanContext


@dataclass(frozen=True)
class SecretRule:
    id: str
    label: str
    pattern: re.Pattern
    severity: Severity
    min_entropy: float = 0.0


RULES: tuple[SecretRule, ...] = (
    SecretRule("aws-access-key", "AWS access key", re.compile(r"\b((?:AKIA|ASIA)[0-9A-Z]{16})\b"), Severity.CRITICAL),
    SecretRule("private-key", "Private key", re.compile(r"(-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----)"), Severity.CRITICAL),
    SecretRule("github-token", "GitHub token", re.compile(r"\b(gh[pousr]_[A-Za-z0-9]{36,})\b"), Severity.CRITICAL),
    SecretRule("stripe-live-key", "Stripe live key", re.compile(r"\b((?:sk|rk)_live_[0-9A-Za-z]{24,})\b"), Severity.CRITICAL),
    SecretRule("anthropic-key", "Anthropic API key", re.compile(r"\b(sk-ant-[A-Za-z0-9_\-]{32,})"), Severity.HIGH),
    SecretRule("openai-key", "OpenAI API key", re.compile(r"\b(sk-(?:proj-)?[A-Za-z0-9_\-]{32,})"), Severity.HIGH),
    SecretRule("slack-token", "Slack token", re.compile(r"\b(xox[baprs]-[A-Za-z0-9\-]{10,})"), Severity.HIGH),
    SecretRule("google-api-key", "Google API key", re.compile(r"\b(AIza[0-9A-Za-z_\-]{35})\b"), Severity.HIGH),
    SecretRule(
        "generic-secret",
        "Hard-coded credential",
        re.compile(r"""(?i)(?:password|passwd|secret|api_?key|token)\w*\s*[:=]\s*['"]([^'"\s]{12,})['"]"""),
        Severity.MEDIUM,
        min_entropy=3.5,
    ),
)

TEXT_SUFFIXES = (
    ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yml", ".yaml", ".toml", ".ini", ".cfg",
    ".env", ".sh", ".rb", ".go", ".java", ".php", ".tf", ".md", ".txt", ".example", ".properties",
    ".key", ".pem",  # key material files
)


def shannon_entropy(value: str) -> float:
    counts = {c: value.count(c) for c in set(value)}
    return -sum(n / len(value) * math.log2(n / len(value)) for n in counts.values())


def redact(value: str) -> str:
    return value[:4] + "•" * 8 + (value[-2:] if len(value) > 10 else "")


def find_secrets(text: str) -> list[tuple[SecretRule, str, int]]:
    """Return (rule, secret, line_number) for each secret in `text`."""
    hits = []
    for line_no, line in enumerate(text.splitlines(), start=1):
        claimed: set[str] = set()
        for rule in RULES:
            for match in rule.pattern.finditer(line):
                value = match.group(1)
                if value in claimed or any(value in c or c in value for c in claimed):
                    continue
                if rule.min_entropy and shannon_entropy(value) < rule.min_entropy:
                    continue
                claimed.add(value)
                hits.append((rule, value, line_no))
    return hits


class SecretScanner:
    name = "secrets"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        findings: dict[str, RawFinding] = {}

        for path in ctx.iter_files(TEXT_SUFFIXES):
            for rule, value, line in find_secrets(ctx.read(path)):
                finding = self._finding(rule, value, f"{ctx.rel(path)}:{line}", in_history_only=False)
                findings.setdefault(finding.key, finding)

        for commit, file, rule, value in self._scan_history(ctx):
            finding = self._finding(rule, value, f"{file} @ {commit[:8]}", in_history_only=True)
            if finding.key in findings:
                findings[finding.key].details.setdefault("introduced_in", commit[:8])
            else:
                findings[finding.key] = finding
        return list(findings.values())

    @staticmethod
    def _finding(rule: SecretRule, value: str, location: str, in_history_only: bool) -> RawFinding:
        fingerprint = hashlib.sha256(value.encode()).hexdigest()
        where = "git history (deleted from HEAD, still clonable)" if in_history_only else "the current code"
        return RawFinding(
            type=FindingType.SECRET,
            key=f"{rule.id}:{fingerprint}",
            severity=rule.severity,
            title=f"{rule.label} exposed in {'git history' if in_history_only else 'source'}",
            description=f"A {rule.label.lower()} was found in {where}. Rotate it, then purge it from history.",
            location=location,
            details={
                "rule": rule.id,
                "redacted": redact(value),
                "sha256": fingerprint,
                "in_history_only": in_history_only,
            },
        )

    @staticmethod
    def _scan_history(ctx: ScanContext):
        """Yield secrets from lines *added* in any commit on any branch."""
        try:
            log = subprocess.run(
                ["git", "-C", str(ctx.root), "log", "--all", "-p", "--no-color", "--unified=0", "--format=commit %H"],
                capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=120, check=True,
            ).stdout
        except (subprocess.SubprocessError, FileNotFoundError):
            return

        commit = file = ""
        for line in log.splitlines():
            if line.startswith("commit "):
                commit = line[7:]
            elif line.startswith("+++ b/"):
                file = line[6:]
            elif line.startswith("+") and not line.startswith("+++"):
                for rule, value, _ in find_secrets(line[1:]):
                    yield commit, file, rule, value
