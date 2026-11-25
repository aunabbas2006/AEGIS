"""Un-shippable open-source licenses (§6.5).

Resolves each dependency's declared license from its registry and compares it with
the organisation's deny-list (copyleft licenses that would force source disclosure).
Runs after the dependency scanner, reusing the dependencies it parsed.
"""

from concurrent.futures import ThreadPoolExecutor

import httpx

from app.config import settings
from app.models import FindingType, Severity
from app.scanners.base import Dependency, RawFinding, ScanContext

REGISTRY_URL = {
    "npm": "https://registry.npmjs.org/{name}/{version}",
    "PyPI": "https://pypi.org/pypi/{name}/{version}/json",
}


def resolve_license(client: httpx.Client, dep: Dependency) -> str | None:
    response = client.get(REGISTRY_URL[dep.ecosystem].format(name=dep.name, version=dep.version))
    if response.status_code != 200:
        return None
    data = response.json()
    if dep.ecosystem == "npm":
        lic = data.get("license")
        return lic.get("type") if isinstance(lic, dict) else lic
    info = data.get("info", {})
    if info.get("license_expression"):
        return info["license_expression"]
    classifiers = [c.split(" :: ")[-1] for c in info.get("classifiers", []) if c.startswith("License ::")]
    return classifiers[0] if classifiers else (info.get("license") or None)


def denied_by_policy(license_name: str) -> bool:
    upper = license_name.upper()
    return any(token in upper for token in settings.denied_licenses) and "LGPL" not in upper


class LicenseScanner:
    name = "licenses"

    def scan(self, ctx: ScanContext) -> list[RawFinding]:
        if not ctx.dependencies:
            return []
        with httpx.Client(timeout=settings.http_timeout_seconds) as client, ThreadPoolExecutor(8) as pool:
            licenses = list(pool.map(lambda d: resolve_license(client, d), ctx.dependencies))

        return [
            RawFinding(
                type=FindingType.LICENSE,
                key=f"{dep.ecosystem}:{dep.name}:{lic}",
                severity=Severity.HIGH,
                title=f"{dep.name} is licensed under {lic}",
                description="This license is on the deny-list: shipping it in proprietary software may force source disclosure.",
                location=dep.manifest,
                package=dep.name,
                installed_version=dep.version,
                details={"license": lic, "policy": "deny", "denied": list(settings.denied_licenses)},
            )
            for dep, lic in zip(ctx.dependencies, licenses)
            if lic and denied_by_policy(lic)
        ]
