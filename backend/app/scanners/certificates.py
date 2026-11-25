"""SSL/TLS certificates about to expire (§6.8).

Collects HTTPS hostnames referenced in configuration files, performs a TLS handshake
with each, and reads the certificate's `notAfter` date.
"""

import re
import socket
import ssl
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timezone

from app.models import FindingType, Severity
from app.scanners.base import RawFinding, ScanContext

CONFIG_SUFFIXES = (".env", ".example", ".yml", ".yaml", ".toml", ".json", ".ini", ".cfg", ".properties")
_HTTPS_HOST = re.compile(r"https://([a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?(?:\.[a-z0-9\-]{1,63})+)", re.I)
# Hosts that are documentation/registry links, not infrastructure the team runs.
IGNORED_HOSTS = {"github.com", "registry.npmjs.org", "json.schemastore.org", "example.com", "www.w3.org"}
MAX_HOSTS = 15
TIMEOUT_SECONDS = 4


def collect_hosts(ctx: ScanContext) -> dict[str, str]:
    hosts: dict[str, str] = {}
    for path in ctx.iter_files(CONFIG_SUFFIXES):
        if path.name in {"package.json", "package-lock.json", "tsconfig.json"}:
            continue
        for host in _HTTPS_HOST.findall(ctx.read(path)):
            host = host.lower()
            if host not in IGNORED_HOSTS and not host.endswith((".local", ".internal", ".example.com")):
                hosts.setdefault(host, ctx.rel(path))
    return dict(list(hosts.items())[:MAX_HOSTS])


def certificate_expiry(host: str) -> date | None:
    context = ssl.create_default_context()
    try:
        with socket.create_connection((host, 443), timeout=TIMEOUT_SECONDS) as sock:
            with context.wrap_socket(sock, server_hostname=host) as tls:
                not_after = tls.getpeercert()["notAfter"]
    except (OSError, ssl.SSLError, KeyError):
        return None
    return datetime.fromtimestamp(ssl.cert_time_to_seconds(not_after), tz=timezone.utc).date()


class CertificateScanner:
    name = "certificates"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        hosts = collect_hosts(ctx)
        with ThreadPoolExecutor(8) as pool:
            expiries = dict(zip(hosts, pool.map(certificate_expiry, hosts)))

        findings = []
        for host, expires in expiries.items():
            if expires is None:
                continue
            days = (expires - date.today()).days
            severity = Severity.CRITICAL if days <= 7 else Severity.HIGH if days <= 30 else Severity.LOW
            findings.append(
                RawFinding(
                    type=FindingType.CERT_EXPIRY,
                    key=host,
                    severity=severity,
                    title=f"TLS certificate for {host} expires on {expires.isoformat()}",
                    description="An expired certificate takes the service offline for every client.",
                    location=hosts[host],
                    package=host,
                    due_date=expires,
                    details={"host": host},
                )
            )
        return findings
