"""Shared types for every scanner."""

import hashlib
from collections.abc import Iterator
from dataclasses import dataclass, field
from datetime import date
from pathlib import Path
from typing import Protocol

from app.models import FindingType, Reachability, Severity

# Directories that never contain first-party code worth scanning.
IGNORED_DIRS = {".git", "node_modules", ".venv", "venv", "__pycache__", "dist", "build", ".next"}
MAX_FILE_BYTES = 1_000_000


@dataclass
class RawFinding:
    """Scanner output before persistence. `key` must be stable across rescans."""

    type: FindingType
    key: str
    severity: Severity
    title: str
    description: str = ""
    location: str | None = None
    package: str | None = None
    installed_version: str | None = None
    fixed_version: str | None = None
    reachability: Reachability | None = None
    due_date: date | None = None
    details: dict = field(default_factory=dict)

    def fingerprint(self, repo_id: int) -> str:
        return hashlib.sha256(f"{repo_id}:{self.type}:{self.key}".encode()).hexdigest()[:32]


@dataclass
class Dependency:
    name: str
    version: str
    ecosystem: str  # OSV ecosystem name: "npm" | "PyPI"
    manifest: str


@dataclass
class ScanContext:
    """Everything a scanner may need. Scanners may also enrich it for later scanners."""

    root: Path
    dependencies: list[Dependency] = field(default_factory=list)

    def iter_files(self, suffixes: tuple[str, ...] | None = None) -> Iterator[Path]:
        for path in self.root.rglob("*"):
            if any(part in IGNORED_DIRS for part in path.relative_to(self.root).parts):
                continue
            if not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
                continue
            if suffixes is None or path.suffix in suffixes or path.name in suffixes:
                yield path

    def read(self, path: Path) -> str:
        return path.read_text(encoding="utf-8", errors="ignore")

    def rel(self, path: Path) -> str:
        return path.relative_to(self.root).as_posix()


class Scanner(Protocol):
    name: str

    def scan(self, ctx: ScanContext) -> list[RawFinding]: ...
