"""Checks repositories out into an isolated working directory for scanning."""

import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from app.config import settings
from app.demo_repo import DEMO_SOURCE, build_demo_repo

GITHUB_URL = re.compile(r"^https://github\.com/(?P<owner>[\w.\-]+)/(?P<name>[\w.\-]+?)(?:\.git)?/?$")


class InvalidSource(ValueError):
    pass


@dataclass(frozen=True)
class SourceInfo:
    name: str
    owner: str | None
    is_public: bool


def parse_source(source: str) -> SourceInfo:
    if source == DEMO_SOURCE:
        return SourceInfo(name="demo-shop", owner="aegis-demo", is_public=False)
    if match := GITHUB_URL.match(source.strip()):
        return SourceInfo(name=match["name"], owner=match["owner"], is_public=True)
    raise InvalidSource("Use a public GitHub URL (https://github.com/owner/repo) or 'demo'.")


def checkout(source: str) -> Path:
    """Return a local path containing an up-to-date clone of `source`."""
    settings.workspace_dir.mkdir(parents=True, exist_ok=True)
    if source == DEMO_SOURCE:
        return build_demo_repo(settings.workspace_dir / "demo-shop")

    info = parse_source(source)
    target = settings.workspace_dir / f"{info.owner}__{info.name}"
    if target.exists():
        shutil.rmtree(target, onerror=_force_remove)
    # Full clone (not --depth 1): the secret scanner needs every historical commit.
    subprocess.run(
        ["git", "clone", "--quiet", "--no-tags", source.strip(), str(target)],
        check=True, capture_output=True, timeout=300,
    )
    return target


def _force_remove(func, path, _exc_info) -> None:
    # Git marks pack files read-only, which blocks deletion on Windows.
    Path(path).chmod(0o700)
    func(path)
