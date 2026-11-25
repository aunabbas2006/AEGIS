"""Runtime configuration, read once from environment variables."""

import os
from dataclasses import dataclass
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent


@dataclass(frozen=True)
class Settings:
    database_url: str = os.getenv("AEGIS_DATABASE_URL", f"sqlite:///{BACKEND_ROOT / 'aegis.db'}")
    workspace_dir: Path = Path(os.getenv("AEGIS_WORKSPACE_DIR", BACKEND_ROOT / ".workspace"))
    # Any local dev-server port by default; set a strict regex in production.
    cors_origin_regex: str = os.getenv("AEGIS_CORS_ORIGIN_REGEX", r"^http://(localhost|127\.0\.0\.1)(:\d+)?$")

    # GitHub issue creation stays disabled until a token is supplied.
    github_token: str | None = os.getenv("GITHUB_TOKEN")

    # Scanner tuning.
    http_timeout_seconds: float = float(os.getenv("AEGIS_HTTP_TIMEOUT", "10"))
    inactive_after_days: int = int(os.getenv("AEGIS_INACTIVE_AFTER_DAYS", "180"))
    denied_licenses: tuple[str, ...] = ("AGPL", "GPL", "SSPL", "EUPL")


settings = Settings()
