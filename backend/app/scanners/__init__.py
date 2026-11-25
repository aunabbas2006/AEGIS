"""Scanner registry. Order matters: the dependency scanner populates `ctx.dependencies`
for the license scanner that runs after it."""

from app.scanners.activity import ActivityScanner
from app.scanners.ai_models import AiModelScanner
from app.scanners.base import RawFinding, ScanContext, Scanner
from app.scanners.certificates import CertificateScanner
from app.scanners.dependencies import DependencyScanner
from app.scanners.eol import EolScanner
from app.scanners.licenses import LicenseScanner
from app.scanners.secrets import SecretScanner

SCANNERS: tuple[Scanner, ...] = (
    DependencyScanner(),
    LicenseScanner(),
    SecretScanner(),
    EolScanner(),
    AiModelScanner(),
    CertificateScanner(),
    ActivityScanner(),
)

__all__ = ["SCANNERS", "RawFinding", "ScanContext", "Scanner"]
